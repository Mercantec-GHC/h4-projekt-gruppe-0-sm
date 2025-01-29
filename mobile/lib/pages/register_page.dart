import 'package:flutter/material.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:mobile/widgets/primary_input.dart';
import 'log_in_page.dart';

class RegisterPage extends StatelessWidget {
  const RegisterPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        body: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            "Opret bruger",
            style: TextStyle(fontSize: 64),
          ),
          const PrimaryInput(label: "Fornavn", placeholderText: "Fornavn"),
          const PrimaryInput(
              label: "Mail/Tlf", placeholderText: "f.eks. example@example.com"),
          const PrimaryInput(
              label: "Password", placeholderText: "*********", obscure: true),
          const PrimaryInput(
              label: "Password (igen)",
              placeholderText: "*********",
              obscure: true),
          PrimaryButton(
              onPressed: () => {
                    Navigator.of(context).push(MaterialPageRoute(
                        builder: (context) => const LogInPage()))
                  },
              child: const Text("Opret bruger"))
        ],
      )
    ]));
  }
}
