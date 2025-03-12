import 'package:flutter/material.dart';
import 'package:mobile/pages/settings_page.dart';
import 'package:mobile/controllers/user.dart';
import 'package:mobile/utils/price.dart';
import 'package:provider/provider.dart';

class HomePage extends StatelessWidget {
  final User user;
  const HomePage({super.key, required this.user});

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
              color: Color(0xFFFFFFFF),
            ),
            padding: const EdgeInsets.all(10),
            child: Consumer<UsersControllerOld>(
                builder: (context, usersRepo, _) => Text(
                    "Saldo: ${formatDkkCents(user.balanceInDkkCents)}",
                    style: Theme.of(context).textTheme.headlineSmall)),
          ),
        ),
        Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                "Velkommen ${user.name}",
                style: Theme.of(context).textTheme.headlineMedium,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
