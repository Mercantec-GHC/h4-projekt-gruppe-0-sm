import 'package:flutter/material.dart';
import 'package:mobile/pages/log_in_page.dart';
import 'package:mobile/pages/settings_pages/saldo.dart';
import 'package:mobile/repos/user.dart';
import 'package:provider/provider.dart';

class _Page {
  final IconData icon;
  final String title;
  final Function(BuildContext) action;

  const _Page({
    required this.icon,
    required this.title,
    required this.action,
  });
}

class SettingsPage extends StatelessWidget {
  SettingsPage({super.key});

  final List<_Page> _pages = [
    _Page(
        icon: Icons.money,
        title: "Saldo",
        action: (context) {
          Navigator.of(context).push(MaterialPageRoute(
              builder: (context) => const SaldoSettingsPage()));
        }),
    _Page(
        icon: Icons.door_back_door,
        title: "Log ud",
        action: (context) {
          final users = context.read<UsersControllerOld>();
          users.logout();
          Navigator.popUntil(context, (_) => false);
          Navigator.of(context)
              .push(MaterialPageRoute(builder: (context) => const LogInPage()));
        }),
  ];

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
                  "Indstillinger",
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ],
            ),
            Expanded(
              child: ListView.builder(
                itemCount: _pages.length,
                itemBuilder: (context, i) => InkWell(
                  onTap: () {
                    _pages[i].action(context);
                  },
                  child: ListTile(
                    leading: Icon(_pages[i].icon),
                    title: Text(_pages[i].title),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
