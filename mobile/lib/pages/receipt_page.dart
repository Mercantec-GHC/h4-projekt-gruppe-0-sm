import 'package:flutter/material.dart';
import 'package:mobile/controllers/receipt.dart';
import 'package:mobile/utils/price.dart';
import 'package:mobile/widgets/receipt_item.dart';

class ReceiptView extends StatelessWidget {
  final Receipt receipt;
  const ReceiptView({super.key, required this.receipt});

  @override
  Widget build(BuildContext context) {
    final receiptItems = receipt.allReceiptItems();

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const BackButton(),
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Text(receipt.dateFormatted()),
                  Expanded(
                      child: Column(
                    children: [
                      ListView.builder(
                          shrinkWrap: true,
                          itemBuilder: (_, idx) => ReceiptItemView(
                              pricePerAmount:
                                  receiptItems[idx].product.priceInDkkCents,
                              name: receiptItems[idx].product.name,
                              amount: receiptItems[idx].amount),
                          itemCount: receiptItems.length),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Total:",
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          Text(formatDkkCents(receipt.totalPrice())),
                        ],
                      ),
                    ],
                  )),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ReceiptPage extends StatelessWidget {
  final Receipt receipt;

  const ReceiptPage({super.key, required this.receipt});

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: ReceiptView(receipt: receipt));
  }
}
