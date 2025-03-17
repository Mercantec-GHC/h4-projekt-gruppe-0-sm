import 'package:flutter/material.dart';
import 'package:mobile/controllers/user.dart';
import 'package:mobile/models/user.dart';

class BuildIfSessionUserExists extends StatelessWidget {
  final UserController sessionController;
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
        future: sessionController.loadUserOld(),
        builder: (context, snapshot) {
          final user = sessionController.userOld;
          if (user == null) {
            return placeholder;
          }
          return builder(context, user);
        });
  }
}
