import 'package:flutter/material.dart';
import 'dashboard.dart';
import 'global_components.dart';

class LogInPage extends StatelessWidget {
  const LogInPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        body: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            "Log ind",
            style: TextStyle(fontSize: 64),
          ),
          const PrimaryInput(
              label: "Mail/Tlf", placeholderText: "f.eks. example@example.com"),
          const PrimaryInput(
              label: "Password", placeholderText: "*********", obscure: true),
          PrimaryButton(
              onPressed: () => {
                    Navigator.of(context).push(MaterialPageRoute(
                        builder: (context) => const Dashboard()))
                  },
              child: const Text("Log ind"))
        ],
      )
    ]));
  }
}
