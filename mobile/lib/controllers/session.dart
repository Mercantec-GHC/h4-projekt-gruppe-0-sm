import 'package:flutter/material.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';

class SessionController {
  final Server server;

  String? _sessionToken;
  User? _sessionUser;

  final List<_ChangeListener> _sessionChangeListeners = [];
  final List<_ChangeListener> _userChangeListeners = [];

  SessionController({required this.server});

  Future<Result<Null, String>> loginUser(String email, String password) async {
    final loginResult = await server.login(email, password);
    switch (loginResult) {
      case Ok<String, String>(value: final sessionToken):
        _sessionToken = sessionToken;
        notifySessionChangeListeners();
        return const Ok(null);
      case Err<String, String>(value: final message):
        return Err(message);
    }
  }

  Future<Result<Null, Null>> loadUser() async {
    // TODO: retrieve session from cache, if exists
    return _loadCurrentUser();
  }

  Future<Result<Null, Null>> _loadCurrentUser() async {
    final sessionUserResult = await _requestWithSession<User>(
        (server, sessionToken) => server.sessionUser(sessionToken));
    switch (sessionUserResult) {
      case Ok<User, String>(value: final sessionUser):
        _sessionUser = sessionUser;
        notifyUserChangeListeners();

        // The mechanism for checking that a user is logged in, only listens on
        // the session provider. There we also notify sessions listeners, to
        // account for this one specific case. Is this smart? idk.
        notifySessionChangeListeners();

        return const Ok(null);
      case Err<User, String>():
        return const Err(null);
    }
  }

  Future<Null> logout() async {
    final sessionToken = _sessionToken;
    if (sessionToken == null) {
      return;
    }
    await server.logout(sessionToken);
    _sessionToken = null;
    notifySessionChangeListeners();
  }

  User get user {
    final user = _sessionUser;
    if (user == null) {
      throw NoUser();
    }
    return user;
  }

  bool get hasUser {
    return _sessionUser != null;
  }

  Future<Result<Null, String>> addBalance() async {
    final addBalanceResult = await _requestWithSession(
        (server, sessionToken) => server.addBalance(sessionToken));
    if (addBalanceResult case Err<Null, String>(value: final message)) {
      return Err(message);
    }
    if (await _loadCurrentUser() case Err<Null, Null>()) {
      return const Err("could not fetch user");
    }
    return const Ok(null);
  }

  /// Package private.
  Future<Result<T, String>> _requestWithSession<T>(
      Future<Result<T, String>> Function(Server server, String sessionToken)
          func) async {
    final sessionToken = _sessionToken;
    if (sessionToken == null) {
      return const Err("unathorized");
    }
    final result = await func(server, sessionToken);
    if (result case Err<T, String>(value: final message)) {
      if (message == "unauthorized") {
        _sessionToken = null;
        _sessionUser = null;
        notifySessionChangeListeners();
        notifyUserChangeListeners();
        return const Err("unathorized");
      }
    }
    return result;
  }

  /// Package private.
  void _addSessionChangeListener(_ChangeListener listener) {
    _sessionChangeListeners.add(listener);
  }

  /// Package private.
  void _addUserChangeListener(_ChangeListener listener) {
    _userChangeListeners.add(listener);
  }

  /// Class private.
  void notifySessionChangeListeners() {
    for (final listener in _sessionChangeListeners) {
      listener.notify();
    }
  }

  /// Class private.
  void notifyUserChangeListeners() {
    for (final listener in _userChangeListeners) {
      listener.notify();
    }
  }
}

abstract class _ChangeListener {
  void notify();
}

class NoUser implements Exception {}

class SessionProvider extends ChangeNotifier implements _ChangeListener {
  final SessionController controller;

  SessionProvider({required this.controller}) {
    controller._addSessionChangeListener(this);
  }

  @override
  void notify() {
    notifyListeners();
  }
}

class CurrentUserProvider extends ChangeNotifier implements _ChangeListener {
  final SessionController controller;

  CurrentUserProvider({required this.controller}) {
    controller._addUserChangeListener(this);
  }

  @override
  void notify() {
    notifyListeners();
  }
}
