import 'package:flutter/material.dart';
import 'package:mobile/controllers/receipt.dart';
import 'package:mobile/models/receipt.dart';
import 'package:mobile/results.dart';
import 'package:mobile/utils/date.dart';
import 'package:mobile/utils/price.dart';
import 'package:mobile/widgets/receipt_item.dart';
import 'package:provider/provider.dart';

class ReceiptView extends StatelessWidget {
  final int receiptId;
  const ReceiptView({super.key, required this.receiptId});

  @override
  Widget build(BuildContext context) {
    final receiptController = context.read<ReceiptController>();

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const BackButton(),
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(20),
              child: FutureBuilder(
                  future: receiptController.receiptWithId(receiptId),
                  builder: (context, snapshot) {
                    final error = snapshot.error;
                    if (error != null) {
                      throw error;
                    }
                    final receipt = snapshot.data;
                    switch (receipt) {
                      case null:
                        return const CircularProgressIndicator();
                      case Err<Receipt, String>(value: final message):
                        showDialog<String>(
                          context: context,
                          builder: (BuildContext context) => AlertDialog(
                            content: Text(message),
                            actions: <Widget>[
                              TextButton(
                                onPressed: () => Navigator.pop(context, 'Ok'),
                                child: const Text('Ok'),
                              ),
                            ],
                          ),
                        );
                        return Container();
                      case Ok<Receipt, String>(value: final receipt):
                        return Column(
                          children: [
                            Text(dateFormatted(receipt.timestamp)),
                            Expanded(
                                child: Column(
                              children: [
                                ListView.builder(
                                    shrinkWrap: true,
                                    itemBuilder: (_, idx) => ReceiptItemView(
                                        pricePerAmount: receipt
                                            .receiptItems[idx].priceDkkCent,
                                        name: receipt.receiptItems[idx].name,
                                        amount:
                                            receipt.receiptItems[idx].amount),
                                    itemCount: receipt.receiptItems.length),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      "Total:",
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold),
                                    ),
                                    Text(formatDkkCents(receipt.totalPrice())),
                                  ],
                                ),
                              ],
                            )),
                          ],
                        );
                    }
                  }),
            ),
          ),
        ],
      ),
    );
  }
}

class ReceiptPage extends StatelessWidget {
  final int receiptId;

  const ReceiptPage({super.key, required this.receiptId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: ReceiptView(receiptId: receiptId));
  }
}
