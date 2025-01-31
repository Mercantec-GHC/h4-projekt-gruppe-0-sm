import 'package:flutter/material.dart';
import 'package:mobile/repos/receipt.dart';
import 'package:provider/provider.dart';

class ReceiptsListItem extends StatelessWidget {
  final String dateFormatted;
  final int totalPrice;
  const ReceiptsListItem(
      {super.key, required this.dateFormatted, required this.totalPrice});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: const BorderRadius.all(Radius.circular(10)),
        onTap: () {},
        child: Container(
          padding: const EdgeInsets.all(20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [Text(dateFormatted), Text("$totalPrice kr")],
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
        Expanded(child: Consumer<ReceiptRepo>(
          builder: (_, cartRepo, __) {
            final allReceipts = cartRepo.allReceipts();
            return ListView.builder(
              shrinkWrap: true,
              itemBuilder: (_, idx) {
                return ReceiptsListItem(
                    dateFormatted: allReceipts[idx].dateFormatted(),
                    totalPrice: allReceipts[idx].totalPrice());
              },
              itemCount: allReceipts.length,
            );
          },
        )),
      ],
    );
  }
}
