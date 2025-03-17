import 'package:flutter/material.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';

class UsersController extends ChangeNotifier {
  Server server;
  SessionController sessionController;

  UsersController({required this.server, required this.sessionController});

  Future<Result<Null, String>> register(
      String name, String email, String password) async {
    final res = await server.register(name, email, password);
    switch (res) {
      case Success<Null>():
        return const Ok(null);
      case Error<Null>(message: final message):
        return Err(message);
    }
  }

  Future<Result<Null, String>> addBalance() async {
    final token = sessionController.sessionToken;
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
