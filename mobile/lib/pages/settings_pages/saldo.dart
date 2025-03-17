import 'package:flutter/material.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/controllers/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/utils/build_if_session_exists.dart';
import 'package:mobile/utils/price.dart';
import 'package:provider/provider.dart';

class SaldoSettingsPage extends StatelessWidget {
  const SaldoSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final sessionController = context.watch<SessionController>();
    final userController = context.watch<UsersController>();
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const BackButton(),
                Text(
                  "Saldo",
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ],
            ),
            BuildIfSessionUserExists(
                sessionController: sessionController,
                placeholder: const CircularProgressIndicator(),
                builder: (context, user) {
                  return Text(
                      "Nuværende saldo: ${formatDkkCents(user.balanceDkkCents)}",
                      style: Theme.of(context).textTheme.bodyLarge);
                }),
            ElevatedButton.icon(
              onPressed: () async {
                final res = await userController.addBalance();
                switch (res) {
                  case Ok<Null, String>():
                    print("yay");
                  case Err<Null, String>(value: final message):
                    print("Womp womp fejled er: $message");
                }
              },
              icon: const Icon(Icons.add),
              label: const Text("Tilføj 100,00 kr"),
            )
          ],
        ),
      ),
    );
  }
}
