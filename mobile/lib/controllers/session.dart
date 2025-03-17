import 'package:flutter/material.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';

class SessionController extends ChangeNotifier {
  final Server server;
  String? _sessionToken;
  User? _user;

  SessionController({required this.server});

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

  User? get user {
    loadUser();
    return _user;
  }

  Future<void> _notifyIfTokenChanged() async {
    final prev = _sessionToken;
    _validateToken();
    if (prev != _sessionToken) {
      notifyListeners();
    }
  }

  Future<void> loadUser() async {
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
}
