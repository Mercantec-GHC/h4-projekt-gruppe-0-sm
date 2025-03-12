import 'package:flutter/material.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';

class SessionController extends ChangeNotifier {
  final Server server;
  String? _sessionToken;

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

  Future<Result<User, Null>> user() async {
    final token = _sessionToken;
    if (token == null) {
      notifyListeners();
      return const Err(null);
    }
    final res = await server.sessionUser(token);
    switch (res) {
      case Success<User>(data: final user):
        return Ok(user);
      case Error<User>():
        _sessionToken = null;
        notifyListeners();
        return const Err(null);
    }
  }

  get sessionToken {
    return _sessionToken;
  }

  Future<void> logout() async {
    final token = _sessionToken;
    if (token != null) {
      server.logout(token);
      _sessionToken = null;
    }
    print(_sessionToken);
    print("notifying listeners");
    notifyListeners();
  }

  Result<int, String> pay(int userId, int amount) {
    return const Err("not implemented");
  }
}
