import 'package:flutter/material.dart';
import 'package:mobile/controllers/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/widgets/error_box.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:mobile/widgets/primary_input.dart';
import 'package:provider/provider.dart';

class RegisterPage extends StatelessWidget {
  const RegisterPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
        body: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [RegisterForm()]));
  }
}

class RegisterForm extends StatefulWidget {
  const RegisterForm({super.key});

  @override
  State<StatefulWidget> createState() => RegisterFormState();
}

class RegisterFormState extends State<RegisterForm> {
  bool registerError = false;
  String errorText = "Ingen fejlbesked jeg skal ikke vises";

  @override
  Widget build(BuildContext context) {
    final nameController = TextEditingController();
    final mailController = TextEditingController();
    final passwordController = TextEditingController();
    return Column(
      spacing: 10,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          "Opret bruger",
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        ErrorBox(
            visible: registerError,
            errorText: errorText,
            onClosePressed: () {
              setState(() {
                registerError = false;
              });
            }),
        PrimaryInput(
          label: "Fornavn",
          placeholderText: "Fornavn",
          controller: nameController,
        ),
        PrimaryInput(
          label: "Mail",
          placeholderText: "f.eks. example@example.com",
          controller: mailController,
        ),
        PrimaryInput(
          label: "Password",
          placeholderText: "*********",
          obscure: true,
          controller: passwordController,
        ),
        const PrimaryInput(
            label: "Password (igen)",
            placeholderText: "*********",
            obscure: true),
        PrimaryButton(
            onPressed: () async {
              final sessionsRepo = context.read<UsersController>();
              final res = await sessionsRepo.register(nameController.text,
                  mailController.text, passwordController.text);
              if (res is Ok<Null, String>) {
                setState(() => registerError = false);
                if (context.mounted) Navigator.of(context).pop();
              } else {
                setState(() {
                  registerError = true;
                  errorText = (res as Err<Null, String>).value;
                });
              }
            },
            child: const Text("Opret bruger")),
        TextButton(
          onPressed: () {
            setState(() => registerError = false);
            Navigator.of(context).pop();
          },
          child: RichText(
              text: const TextSpan(children: [
            TextSpan(
              text: 'Har du allerede en konto? Klik ',
              style: TextStyle(color: Colors.black),
            ),
            TextSpan(
              text: 'her',
              style: TextStyle(
                  color: Color.fromARGB(255, 0, 94, 255),
                  decoration: TextDecoration.underline),
            ),
            TextSpan(
              text: ' for at logge ind',
              style: TextStyle(color: Colors.black),
            ),
          ])),
        )
      ],
    );
  }
}
