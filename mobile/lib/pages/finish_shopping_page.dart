import 'package:flutter/material.dart';
import 'package:mobile/repos/cart.dart';
import 'package:mobile/repos/paying_state.dart';
import 'package:mobile/repos/receipt.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:mobile/widgets/receipt_item.dart';
import 'package:provider/provider.dart';

class FinishShoppingPage extends StatelessWidget {
  const FinishShoppingPage({super.key});

  @override
  Widget build(BuildContext context) {
    final CartRepo cartRepo = context.read<CartRepo>();
    final ReceiptRepo receiptRepo = context.read<ReceiptRepo>();
    final PayingStateRepo payingStateRepo = context.watch<PayingStateRepo>();
    final cart = cartRepo.allCartItems();

    return Scaffold(
      body: Stack(
        children: [
          Column(
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
              Expanded(
                child: Center(
                    child: PrimaryButton(
                        onPressed: () async {
                          payingStateRepo.next();
                          receiptRepo.createReceipt(cart);
                          await Future.delayed(const Duration(seconds: 1));
                          payingStateRepo.next();
                          await Future.delayed(const Duration(seconds: 1));
                          cartRepo.clearCart();
                          payingStateRepo.reset();
                          if (context.mounted) Navigator.pop(context);
                        },
                        child: const Text("Betal"))),
              ),
            ],
          ),
          if (payingStateRepo.state != PayingState.unset) ...[
            Container(
              color: Colors.black.withValues(alpha: 0.5),
            ),
          ],
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ...switch (payingStateRepo.state) {
                  PayingState.unset => [],
                  PayingState.loading => [
                      Container(
                        decoration: const BoxDecoration(
                          borderRadius: BorderRadius.all(Radius.circular(10)),
                          color: Colors.white,
                        ),
                        padding: const EdgeInsets.all(20),
                        child: const SizedBox(
                          width: 50,
                          height: 50,
                          child: CircularProgressIndicator(
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.blue),
                            strokeWidth: 6.0,
                          ),
                        ),
                      ),
                    ],
                  PayingState.done => [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(
                          borderRadius: BorderRadius.all(Radius.circular(10)),
                          color: Colors.white,
                        ),
                        child: const Icon(
                          Icons.check_rounded,
                          color: Colors.blue,
                          size: 70,
                        ),
                      )
                    ]
                },
              ],
            ),
          )
        ],
      ),
    );
  }
}
