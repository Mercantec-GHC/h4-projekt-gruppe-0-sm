import 'package:flutter/material.dart';
import 'package:mobile/repos/cart.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:mobile/widgets/receipt_item.dart';
import 'package:provider/provider.dart';

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
          const BackButton(),
          Container(
            margin: const EdgeInsets.all(20),
            child: Expanded(
                child: ListView.builder(
                    shrinkWrap: true,
                    itemBuilder: (_, idx) => ReceiptItemView(
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
