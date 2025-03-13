import 'package:flutter/material.dart';

class ErrorBox extends StatelessWidget {
  final bool visible;
  final void Function() onClosePressed;
  final String errorText;
  const ErrorBox(
      {super.key,
      this.visible = true,
      required this.errorText,
      required this.onClosePressed});

  @override
  Widget build(BuildContext context) {
    return Visibility(
      visible: visible,
      child: Container(
        padding: const EdgeInsets.fromLTRB(10, 10, 0, 10),
        margin: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          border: Border.all(color: const Color.fromARGB(170, 248, 81, 73)),
          borderRadius: const BorderRadius.all(Radius.circular(5)),
          color: const Color.fromARGB(50, 248, 81, 73),
        ),
        child: Row(
          children: [
            Text(errorText),
            IconButton(onPressed: onClosePressed, icon: const Icon(Icons.close))
          ],
        ),
      ),
    );
  }
}
