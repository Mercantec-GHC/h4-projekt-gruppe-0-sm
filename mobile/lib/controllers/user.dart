import 'package:flutter/material.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';

class UsersController extends ChangeNotifier {
  Server server;

  UsersController({required this.server});

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
}
