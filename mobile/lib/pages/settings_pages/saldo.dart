import 'package:flutter/material.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/utils/build_if_session_exists.dart';
import 'package:mobile/utils/price.dart';
import 'package:provider/provider.dart';

class SaldoSettingsPage extends StatelessWidget {
  const SaldoSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final sessionController = context.watch<SessionController>();
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
            BuildIfSessionExists(
              sessionController: sessionController,
              placeholder: const CircularProgressIndicator(),
              builder: (context, user) => Text(
                  "Nuværende saldo: ${formatDkkCents(user.balanceInDkkCents)}",
                  style: Theme.of(context).textTheme.bodyLarge),
            ),
            ElevatedButton.icon(
              onPressed: () {
                // TODO: implement add balance
                throw Exception("not implemented: Adding funds");
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
