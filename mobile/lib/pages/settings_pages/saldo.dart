import 'package:flutter/material.dart';
import 'package:mobile/controllers/user.dart';
import 'package:mobile/utils/price.dart';
import 'package:provider/provider.dart';

class SaldoSettingsPage extends StatelessWidget {
  const SaldoSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final usersRepo = context.watch<UsersControllerOld>();
    final user = usersRepo.loggedInUser()!;
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
            Text("Nuværende saldo: ${formatDkkCents(user.balanceInDkkCents)}",
                style: Theme.of(context).textTheme.bodyLarge),
            ElevatedButton.icon(
              onPressed: () {
                user.addBalanceFounds(10000);
                usersRepo.veryBadNotifyAll();
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
