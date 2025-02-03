import 'package:flutter/material.dart';
import 'package:mobile/repos/receipt.dart';
import 'package:mobile/widgets/receipt_item.dart';

class ReceiptPage extends StatelessWidget {
  final Receipt receipt;

  const ReceiptPage({super.key, required this.receipt});

  @override
  Widget build(BuildContext context) {
    final receiptItems = receipt.allReceiptItems();

    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const BackButton(),
          Container(
              margin: const EdgeInsets.symmetric(horizontal: 10),
              child: Text(receipt.dateFormatted())),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 10),
            child: Expanded(
                child: ListView.builder(
                    shrinkWrap: true,
                    itemBuilder: (_, idx) => ReceiptItemView(
                        pricePerAmount: receiptItems[idx].product.price,
                        name: receiptItems[idx].product.name,
                        amount: receiptItems[idx].amount),
                    itemCount: receiptItems.length)),
          ),
        ],
      ),
    );
  }
}
