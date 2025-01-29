import 'package:flutter/material.dart';

class PrimaryInput extends StatelessWidget {
  final double width;
  final double height;
  final String label;
  final String placeholderText;
  final bool obscure;

  const PrimaryInput(
      {super.key,
      this.width = 300,
      this.height = 100,
      this.obscure = false,
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
          obscureText: obscure,
        ));
  }
}
