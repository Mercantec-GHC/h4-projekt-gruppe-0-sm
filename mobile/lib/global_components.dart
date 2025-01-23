import 'package:flutter/material.dart';

class PrimaryButton extends StatelessWidget {
  final void Function()? onPressed;
  final Widget child;

  const PrimaryButton(
      {super.key, required this.onPressed, required this.child});

  @override
  Widget build(BuildContext context) {
    return TextButton(
        onPressed: onPressed,
        style: TextButton.styleFrom(
            backgroundColor: Colors.blue, foregroundColor: Colors.white),
        child: child);
  }
}

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
