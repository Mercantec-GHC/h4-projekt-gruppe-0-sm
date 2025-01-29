import 'package:flutter/material.dart';

class PrimaryCard extends StatelessWidget {
  final Widget child;

  const PrimaryCard({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: SizedBox(height: 100, child: child),
    );
  }
}
