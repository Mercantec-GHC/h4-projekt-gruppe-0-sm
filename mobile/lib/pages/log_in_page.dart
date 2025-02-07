import 'package:flutter/material.dart';
import 'package:mobile/repos/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/widgets/error_box.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:mobile/widgets/primary_input.dart';
import 'package:provider/provider.dart';
import 'dashboard.dart';

class LogInPage extends StatelessWidget {
  const LogInPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
        body: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [LogInForm()]));
  }
}

class LogInForm extends StatefulWidget {
  const LogInForm({super.key});

  @override
  State<StatefulWidget> createState() => LogInFormState();
}

class LogInFormState extends State<LogInForm> {
  bool loginError = false;
  @override
  Widget build(BuildContext context) {
    final mailController = TextEditingController();
    final passwordController = TextEditingController();

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          "Log ind",
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        ErrorBox(
          visible: loginError,
          errorText: "Ugyldig mail eller password",
          onClosePressed: () {
            setState(() => loginError = false);
          },
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
        PrimaryButton(
            onPressed: () {
              final usersRepo = context.read<UsersRepo>();
              final loginResult =
                  usersRepo.login(mailController.text, passwordController.text);
              if (loginResult is Ok) {
                Navigator.of(context)
                    .push(MaterialPageRoute(builder: (context) => Dashboard()));
              } else {
                setState(() {
                  loginError = true;
                });
              }
            },
            child: const Text("Log ind"))
      ],
    );
  }
}
