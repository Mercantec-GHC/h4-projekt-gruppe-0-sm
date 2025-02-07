import 'package:flutter/material.dart';
import 'package:mobile/repos/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/widgets/error_box.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:mobile/widgets/primary_input.dart';
import 'package:provider/provider.dart';
import 'log_in_page.dart';

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

  @override
  Widget build(BuildContext context) {
    final nameController = TextEditingController();
    final mailController = TextEditingController();
    final passwordController = TextEditingController();
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          "Opret bruger",
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        ErrorBox(
            visible: registerError,
            errorText: "Bruger med mailen ${mailController.text}",
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
          label: "Mail/Tlf",
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
            onPressed: () {
              final usersRepo = context.read<UsersRepo>();
              if (usersRepo.addUser(nameController.text, mailController.text,
                  passwordController.text) is Ok) {
                Navigator.of(context).push(
                    MaterialPageRoute(builder: (context) => const LogInPage()));
              } else {
                setState(() {
                  registerError = true;
                });
              }
            },
            child: const Text("Opret bruger"))
      ],
    );
  }
}
