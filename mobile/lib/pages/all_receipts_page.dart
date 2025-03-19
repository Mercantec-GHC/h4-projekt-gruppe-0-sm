import 'package:flutter/material.dart';
import 'package:mobile/controllers/receipt_header.dart';
import 'package:mobile/models/receipt.dart';
import 'package:mobile/pages/receipt_page.dart';
import 'package:mobile/utils/date.dart';
import 'package:mobile/utils/price.dart';
import 'package:provider/provider.dart';

class ReceiptsListItem extends StatelessWidget {
  final ReceiptHeader receiptHeader;
  const ReceiptsListItem({super.key, required this.receiptHeader});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      child: InkWell(
        borderRadius: const BorderRadius.all(Radius.circular(10)),
        onTap: () {
          Navigator.of(context).push(MaterialPageRoute(
              builder: (context) => ReceiptPage(
                    receiptId: receiptHeader.id,
                  )));
        },
        child: Container(
          padding: const EdgeInsets.all(20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(dateFormatted(receiptHeader.timestamp)),
              Text(formatDkkCents(receiptHeader.totalDkkCent))
            ],
          ),
        ),
      ),
    );
  }
}

class AllReceiptsPage extends StatelessWidget {
  const AllReceiptsPage({super.key});

  @override
  Widget build(BuildContext context) {
    context.read<ReceiptHeaderController>().fetchReceiptsFromServer();
    return Column(
      children: [
        Expanded(child: Consumer<ReceiptHeaderController>(
          builder: (_, receiptHeaderController, __) {
            final allReceiptHeaders =
                receiptHeaderController.receiptHeadersSortedByDate();
            return ListView.builder(
              shrinkWrap: true,
              itemBuilder: (_, idx) {
                return ReceiptsListItem(
                  receiptHeader: allReceiptHeaders[idx],
                );
              },
              itemCount: allReceiptHeaders.length,
            );
          },
        )),
      ],
    );
  }
}
