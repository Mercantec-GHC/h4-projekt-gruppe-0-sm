import 'package:flutter/material.dart';
import 'package:mobile/pages/receipt_page.dart';
import 'package:mobile/controllers/receipt.dart';
import 'package:mobile/utils/price.dart';
import 'package:provider/provider.dart';

class ReceiptsListItem extends StatelessWidget {
  final String dateFormatted;
  final int totalPrice;
  final ReceiptPage receiptPage;
  const ReceiptsListItem(
      {super.key,
      required this.dateFormatted,
      required this.totalPrice,
      required this.receiptPage});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      child: InkWell(
        borderRadius: const BorderRadius.all(Radius.circular(10)),
        onTap: () {
          Navigator.of(context)
              .push(MaterialPageRoute(builder: (context) => receiptPage));
        },
        child: Container(
          padding: const EdgeInsets.all(20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [Text(dateFormatted), Text(formatDkkCents(totalPrice))],
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
    return Column(
      children: [
        Expanded(child: Consumer<ReceiptController>(
          builder: (_, receiptRepo, __) {
            final allReceipts = receiptRepo.sortedReceiptsByDate();
            return ListView.builder(
              shrinkWrap: true,
              itemBuilder: (_, idx) {
                return ReceiptsListItem(
                    dateFormatted: allReceipts[idx].dateFormatted(),
                    totalPrice: allReceipts[idx].totalPrice(),
                    receiptPage: ReceiptPage(receipt: allReceipts[idx]));
              },
              itemCount: allReceipts.length,
            );
          },
        )),
      ],
    );
  }
}
