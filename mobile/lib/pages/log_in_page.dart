import 'package:flutter/material.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/pages/register_page.dart';
import 'package:mobile/results.dart';
import 'package:mobile/widgets/error_box.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:mobile/widgets/primary_input.dart';
import 'package:provider/provider.dart';

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
      spacing: 10,
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
        PrimaryButton(
            onPressed: () async {
              final sessionController = context.read<SessionController>();
              final loginResult = await sessionController.login(
                  mailController.text, passwordController.text);
              switch (loginResult) {
                case Ok<Null, String>():
                  setState(() => loginError = false);
                case Err<Null, String>():
                  setState(() => loginError = true);
              }
            },
            child: const Text("Log ind")),
        TextButton(
          onPressed: () {
            Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const RegisterPage()));
          },
          child: RichText(
              text: const TextSpan(children: [
            TextSpan(
              text: 'Har du ikke en konto? Klik ',
              style: TextStyle(color: Colors.black),
            ),
            TextSpan(
              text: 'her',
              style: TextStyle(
                  color: Color.fromARGB(255, 0, 94, 255),
                  decoration: TextDecoration.underline),
            ),
            TextSpan(
              text: ' for at oprette en konto',
              style: TextStyle(color: Colors.black),
            ),
          ])),
        )
      ],
    );
  }
}
