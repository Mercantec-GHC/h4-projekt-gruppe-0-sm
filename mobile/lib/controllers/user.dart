import 'package:flutter/material.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';

class UserController extends ChangeNotifier {
  final Server server;
  String? _sessionToken;
  User? _user;

  Future<Result<User, Null>> userLoad = Future.error(Null);

  UserController({required this.server});

  /// Make sure a user exists before calling using `.loadUser()`.
  User get user {
    final user = _user;
    if (user == null) {
      throw NoUserExcept();
    }
    return user;
  }

  Future<Result<Null, Null>> loadUser() async {
    if (_sessionToken == null) {
      return const Err(null);
    }

    final userResult = await server.sessionUser(_sessionToken!);
    switch (userResult) {
      case Success<User>(data: final user):
        _user = user;
        return const Ok(null);
      case Error<User>():
        return const Err(null);
    }
  }

  Future<Result<Null, Null>> loadedUser() async {
    throw Exception();
  }

  Future<Result<Null, String>> login(String email, String password) async {
    switch (await server.login(email, password)) {
      case Success<String>(data: final token):
        _sessionToken = token;
        notifyListeners();
        return const Ok(null);
      case Error<String>(message: final message):
        notifyListeners();
        return Err(message);
    }
  }

  Future<void> _validateToken() async {
    final token = _sessionToken;
    if (token == null) {
      return;
    }
    final res = await server.sessionUser(token);
    switch (res) {
      case Success<User>():
        return;
      case Error<User>():
        _sessionToken = null;
        return;
    }
  }

  @Deprecated("Use 'user' instead.")
  User? get userOld {
    loadUserOld();
    return _user;
  }

  Future<void> _notifyIfTokenChanged() async {
    final prev = _sessionToken;
    _validateToken();
    if (prev != _sessionToken) {
      notifyListeners();
    }
  }

  @Deprecated("Use 'loadUser' instead.")
  Future<void> loadUserOld() async {
    final token = _sessionToken;
    if (token == null) {
      _user = null;
      return;
    }
    final res = await server.sessionUser(token);
    switch (res) {
      case Success<User>(data: final user):
        _user = user;
        return;
      case Error<User>():
        _user = null;
        return;
    }
  }

  String? get sessionToken {
    _notifyIfTokenChanged();
    return _sessionToken;
  }

  Future<void> logout() async {
    final token = _sessionToken;
    if (token != null) {
      await server.logout(token);
      _sessionToken = null;
    }
    notifyListeners();
  }

  Future<Result<Null, String>> addBalance() async {
    final token = _sessionToken;
    if (token == null) {
      return const Err("No token");
    }
    final res = await server.addBalance(token);
    notifyListeners();
    switch (res) {
      case Success<Null>():
        return const Ok(null);
      case Error<Null>(message: final message):
        return Err(message);
    }
  }
}

class NoUserExcept implements Exception {}
