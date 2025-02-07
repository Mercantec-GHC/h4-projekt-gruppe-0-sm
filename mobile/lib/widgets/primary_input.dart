import 'package:flutter/material.dart';

class PrimaryInput extends StatelessWidget {
  final double width;
  final double height;
  final String label;
  final String placeholderText;
  final bool obscure;
  final String? errorText;
  final TextEditingController? controller;

  const PrimaryInput(
      {super.key,
      this.width = 300,
      this.height = 100,
      this.obscure = false,
      this.errorText,
      this.controller,
      required this.label,
      required this.placeholderText});
  @override
  Widget build(BuildContext context) {
    return SizedBox(
        width: width,
        height: height,
        child: TextField(
          controller: controller,
          decoration: InputDecoration(
            border: const OutlineInputBorder(),
            errorStyle: const TextStyle(),
            errorText: errorText,
            label: Text(label),
            hintText: placeholderText,
            filled: true,
            fillColor: Colors.white,
          ),
          obscureText: obscure,
        ));
  }
}
