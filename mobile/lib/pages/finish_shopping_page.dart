import 'package:flutter/material.dart';
import 'package:mobile/repos/cart.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:provider/provider.dart';

class ReceiptItem extends StatelessWidget {
  final int pricePerAmount;
  final String name;
  final int amount;

  const ReceiptItem(
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

class FinishShoppingPage extends StatelessWidget {
  const FinishShoppingPage({super.key});

  @override
  Widget build(BuildContext context) {
    final CartRepo cartRepo = context.read<CartRepo>();
    final cart = cartRepo.allCartItems();

    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              icon: const Icon(Icons.arrow_back)),
          Container(
            margin: const EdgeInsets.all(20),
            child: Expanded(
                child: ListView.builder(
                    shrinkWrap: true,
                    itemBuilder: (_, idx) => ReceiptItem(
                        pricePerAmount: cart[idx].product.price,
                        name: cart[idx].product.name,
                        amount: cart[idx].amount),
                    itemCount: cart.length)),
          ),
          Container(
            margin: const EdgeInsets.all(20),
            child: Expanded(
                child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Total:",
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                Text("${cartRepo.totalPrice()} kr"),
              ],
            )),
          ),
          Center(
              child:
                  PrimaryButton(onPressed: () {}, child: const Text("Betal")))
        ],
      ),
    );
  }
}
