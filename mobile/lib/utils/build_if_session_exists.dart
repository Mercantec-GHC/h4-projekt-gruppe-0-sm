import 'package:flutter/material.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/results.dart';

class BuildIfSessionExists extends StatelessWidget {
  final SessionController sessionController;
  final Widget placeholder;
  final Widget Function(BuildContext, User) builder;

  const BuildIfSessionExists(
      {super.key,
      required this.sessionController,
      required this.placeholder,
      required this.builder});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
        future: sessionController.user(),
        builder: (context, snapshot) {
          final data = snapshot.data;
          if (data == null) {
            return placeholder;
          }
          if (data is Ok<User, Null>) {
            final user = data.value;
            return builder(context, user);
          }
          return Container();
        });
  }
}
