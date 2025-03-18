import 'package:flutter/material.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/pages/settings_pages/saldo.dart';
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
        action: (context) async {
          final sessionProvider = context.read<SessionProvider>();
          await sessionProvider.controller.logout();
          if (context.mounted) {
            Navigator.pop(context);
          }
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
