import 'package:flutter/material.dart';
import 'log_in_page.dart';
import 'register_page.dart';
import 'global_components.dart';

class LandingPage extends StatelessWidget {
  const LandingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text("Fresh Plaza", style: TextStyle(fontSize: 64.0)),
          PrimaryButton(
              onPressed: () => {
                    Navigator.of(context).push(MaterialPageRoute(
                        builder: (context) => const LogInPage()))
                  },
              child: const Text("Log ind")),
          PrimaryButton(
              onPressed: () => {
                    Navigator.of(context).push(MaterialPageRoute(
                        builder: (context) => const RegisterPage()))
                  },
              child: const Text("Opret bruger"))
        ],
      )
    ]);
  }
}
