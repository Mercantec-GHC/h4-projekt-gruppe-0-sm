import 'package:flutter/material.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/results.dart';
import 'package:mobile/utils/price.dart';
import 'package:provider/provider.dart';

class SaldoSettingsPage extends StatelessWidget {
  const SaldoSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
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
            Consumer<CurrentUserProvider>(builder: (_, provider, ___) {
              final user = provider.controller.user;
              return Text(
                  "Nuværende saldo: ${formatDkkCents(user.balanceDkkCents)}",
                  style: Theme.of(context).textTheme.bodyLarge);
            }),
            ElevatedButton.icon(
              onPressed: () async {
                final currentUserProvider = context.read<CurrentUserProvider>();
                final res = await currentUserProvider.controller.addBalance();
                if (res case Err<Null, String>(value: final message)) {
                  if (context.mounted) {
                    showDialog(
                        context: context,
                        builder: (context) => AlertDialog(
                              content: Text('Serverfejl: $message'),
                              actions: <Widget>[
                                TextButton(
                                  onPressed: () => Navigator.pop(context, 'Ok'),
                                  child: const Text('Ok'),
                                ),
                              ],
                            ));
                  }
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
