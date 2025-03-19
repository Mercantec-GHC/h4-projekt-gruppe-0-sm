import 'dart:io';

import 'package:flutter/material.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';
import 'package:path_provider/path_provider.dart';

class CookieController {
  CookieController();

  static Future<File> get _cacheFile async {
    final directory = await getApplicationCacheDirectory();
    return File("${directory.path}/cookies.txt").create();
  }

  Future<void> clear() async {
    (await _cacheFile).writeAsString("", mode: FileMode.write);
  }

  Future<void> save(String token) async {
    (await _cacheFile).writeAsString(token, mode: FileMode.write);
  }

  Future<Result<String, Null>> load() async {
    final token = await (await _cacheFile).readAsString();
    if (token.isEmpty) {
      return const Err(null);
    }
    return Ok(token);
  }
}

class SessionController {
  final Server server;
  final CookieController cookieController = CookieController();

  User? _sessionUser;

  final List<_ChangeListener> _sessionChangeListeners = [];
  final List<_ChangeListener> _userChangeListeners = [];

  SessionController({required this.server});

  Future<Result<Null, String>> loginUser(String email, String password) async {
    final loginResult = await server.login(email, password);
    switch (loginResult) {
      case Ok<String, String>(value: final sessionToken):
        await cookieController.save(sessionToken);
        notifySessionChangeListeners();
        return const Ok(null);
      case Err<String, String>(value: final message):
        return Err(message);
    }
  }

  Future<Result<Null, Null>> loadCachedUser() async {
    switch (await cookieController.load()) {
      case Ok<String, Null>():
        return _loadCurrentUser();
      case Err<String, Null>():
        notifyUserChangeListeners();
        return const Err(null);
    }
  }

  Future<Result<Null, Null>> loadUpdatedUser() async {
    return _loadCurrentUser();
  }

  Future<Result<Null, Null>> _loadCurrentUser() async {
    final sessionUserResult = await requestWithSession<User>(
        (server, sessionToken) => server.sessionUser(sessionToken));
    switch (sessionUserResult) {
      case Ok<User, String>(value: final sessionUser):
        _sessionUser = sessionUser;
        notifyUserChangeListeners();
        return const Ok(null);
      case Err<User, String>():
        return const Err(null);
    }
  }

  Future<Null> logout() async {
    switch (await cookieController.load()) {
      case Ok<String, Null>(value: final sessionToken):
        await server.logout(sessionToken);
        await cookieController.clear();
        _sessionUser = null;
        notifySessionChangeListeners();
      case Err<String, Null>():
        notifySessionChangeListeners();
        return;
    }
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
    final addBalanceResult = await requestWithSession(
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
  Future<Result<T, String>> requestWithSession<T>(
      Future<Result<T, String>> Function(Server server, String sessionToken)
          func) async {
    switch (await cookieController.load()) {
      case Err<String, Null>():
        return const Err("unathorized");
      case Ok<String, Null>(value: final sessionToken):
        final result = await func(server, sessionToken);
        if (result case Err<T, String>(value: final message)) {
          if (message == "unauthorized") {
            cookieController.clear();
            _sessionUser = null;
            notifySessionChangeListeners();
            notifyUserChangeListeners();
            return const Err("unathorized");
          }
        }
        return result;
    }
  }

  void notifySessionChangeListeners() {
    for (final listener in _sessionChangeListeners) {
      listener.notify();
    }
  }

  void notifyUserChangeListeners() {
    for (final listener in _userChangeListeners) {
      listener.notify();
    }
  }

  void _addSessionChangeListener(_ChangeListener listener) {
    _sessionChangeListeners.add(listener);
  }

  void _addUserChangeListener(_ChangeListener listener) {
    _userChangeListeners.add(listener);
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
