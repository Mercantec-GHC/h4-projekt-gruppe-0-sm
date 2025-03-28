import 'package:flutter/material.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/pages/settings_page.dart';
import 'package:mobile/utils/price.dart';
import 'package:provider/provider.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Container(
                margin: const EdgeInsets.only(right: 10),
                child: IconButton(
                  onPressed: () {
                    Navigator.of(context).push(MaterialPageRoute(
                        builder: (context) => SettingsPage()));
                  },
                  icon: const Icon(Icons.settings),
                )),
          ],
        ),
        Card(
          child: Container(
            decoration: const BoxDecoration(
              borderRadius: BorderRadius.all(Radius.circular(10)),
              color: Colors.white,
            ),
            padding: const EdgeInsets.all(10),
            child: Consumer<CurrentUserProvider>(
              builder: (_, provider, ___) {
                final user = provider.controller.user;
                return Text("Saldo: ${formatDkkCents(user.balanceDkkCents)}",
                    style: Theme.of(context).textTheme.headlineSmall);
              },
            ),
          ),
        ),
        Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Consumer<CurrentUserProvider>(
                builder: (_, provider, ___) {
                  final user = provider.controller.user;
                  return Text(
                    "Velkommen ${user.name}",
                    style: Theme.of(context).textTheme.headlineMedium,
                  );
                },
              )
            ],
          ),
        ),
      ],
    );
  }
}
