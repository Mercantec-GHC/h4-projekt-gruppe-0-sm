import 'package:flutter/material.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'log_in_page.dart';
import 'register_page.dart';

class LandingPage extends StatelessWidget {
  const LandingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text("Fresh Plaza",
                style: Theme.of(context).textTheme.headlineLarge),
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
      ]),
    );
  }
}
