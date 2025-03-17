import 'package:flutter/material.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/models/user.dart';

class BuildIfSessionUserExists extends StatelessWidget {
  final SessionController sessionController;
  final Widget placeholder;
  final Widget Function(BuildContext, User) builder;

  const BuildIfSessionUserExists(
      {super.key,
      required this.sessionController,
      required this.placeholder,
      required this.builder});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
        future: sessionController.loadUser(),
        builder: (context, snapshot) {
          final user = sessionController.user;
          if (user == null) {
            return placeholder;
          }
          return builder(context, user);
        });
  }
}
