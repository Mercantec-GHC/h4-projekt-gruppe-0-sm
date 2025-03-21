import 'package:flutter/material.dart';

class SizedCard extends StatelessWidget {
  final Widget child;

  const SizedCard({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      child: SizedBox(height: 100, child: child),
    );
  }
}
