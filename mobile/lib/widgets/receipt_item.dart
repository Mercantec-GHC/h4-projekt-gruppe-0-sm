import 'package:flutter/material.dart';

class ReceiptItemView extends StatelessWidget {
  final int pricePerAmount;
  final String name;
  final int amount;

  const ReceiptItemView(
      {super.key,
      required this.pricePerAmount,
      required this.name,
      required this.amount});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(name),
        Row(
          children: [
            SizedBox(
                width: 60,
                child: Text(
                  "$amount stk",
                  textAlign: TextAlign.end,
                  overflow: TextOverflow.ellipsis,
                )),
            SizedBox(
                width: 60,
                child: Text(
                  "${pricePerAmount * amount} kr",
                  textAlign: TextAlign.end,
                  overflow: TextOverflow.ellipsis,
                ))
          ],
        ),
      ],
    );
  }
}
