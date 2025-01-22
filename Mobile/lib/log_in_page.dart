import 'package:flutter/material.dart';
import 'dashboard.dart';
import 'global_components.dart';

class PrimaryInput extends StatelessWidget {
  final double width;
  final double height;
  final String label;
  final String placeholderText;

  const PrimaryInput(
      {super.key,
      this.width = 300,
      this.height = 100,
      required this.label,
      required this.placeholderText});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
        width: width,
        height: height,
        child: TextField(
          decoration: InputDecoration(
              border: const OutlineInputBorder(),
              label: Text(label),
              hintText: placeholderText),
        ));
  }
}

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
              label: "Mail/Tlf",
              placeholderText: "f.eks. example@example.com eller 12345678"),
          const PrimaryInput(label: "Password", placeholderText: "*********"),
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
