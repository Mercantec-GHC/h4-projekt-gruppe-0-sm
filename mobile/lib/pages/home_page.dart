import 'package:flutter/material.dart';
import 'package:mobile/pages/log_in_page.dart';
import 'package:mobile/repos/user.dart';
import 'package:mobile/utils/price.dart';

class HomePage extends StatelessWidget {
  final User user;
  const HomePage({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Container(
                  margin: const EdgeInsets.only(right: 10),
                  child: const SettingsMenu()),
            ],
          ),
          Card(
            child: Container(
              decoration: const BoxDecoration(
                borderRadius: BorderRadius.all(Radius.circular(10)),
                color: Color(0xFFFFFFFF),
              ),
              padding: const EdgeInsets.all(10),
              child: Text("Saldo: ${formatDkkCents(user.balanceInDkkCents)}",
                  style: Theme.of(context).textTheme.headlineSmall),
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
      ),
    );
  }
}

class SettingsMenu extends StatefulWidget {
  const SettingsMenu({super.key});

  @override
  State<StatefulWidget> createState() => SettingsMenuState();
}

class SettingsMenuState extends State<SettingsMenu> {
  final FocusNode buttonFocusNode = FocusNode(debugLabel: 'Menu Button');

  @override
  Widget build(BuildContext context) {
    return MenuAnchor(
      childFocusNode: buttonFocusNode,
      menuChildren: <Widget>[
        MenuItemButton(
          onPressed: () {
            Navigator.popUntil(context, (_) => false);
            Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const LogInPage()));
          },
          child: const Text('Log ud'),
        ),
      ],
      builder: (_, MenuController controller, Widget? child) {
        return IconButton(
          focusNode: buttonFocusNode,
          onPressed: () {
            if (controller.isOpen) {
              controller.close();
            } else {
              controller.open();
            }
          },
          icon: const Icon(Icons.settings),
        );
      },
    );
  }
}
