import 'package:flutter/material.dart';
import 'package:mobile/repos/routing.dart';
import 'package:mobile/repos/cart.dart';
import 'package:mobile/repos/paying_state.dart';
import 'package:mobile/repos/receipt.dart';
import 'package:mobile/repos/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/utils/price.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:mobile/widgets/receipt_item.dart';
import 'package:provider/provider.dart';

class FinishShoppingPage extends StatelessWidget {
  final User user;

  const FinishShoppingPage({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    final CartRepo cartRepo = context.read<CartRepo>();
    final ReceiptRepo receiptRepo = context.read<ReceiptRepo>();
    final PayingStateRepo payingStateRepo = context.watch<PayingStateRepo>();
    final cart = cartRepo.allCartItems();

    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const BackButton(),
                Container(
                  margin: const EdgeInsets.all(20),
                  child: ListView.builder(
                      shrinkWrap: true,
                      itemBuilder: (_, idx) => ReceiptItemView(
                          pricePerAmount: cart[idx].product.priceInDkkCents,
                          name: cart[idx].product.name,
                          amount: cart[idx].amount),
                      itemCount: cart.length),
                ),
                Container(
                  margin: const EdgeInsets.all(20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Total:",
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(formatDkkCents(cartRepo.totalPrice())),
                    ],
                  ),
                ),
                Expanded(
                  child: Center(
                      child: PrimaryButton(
                          onPressed: () async {
                            payingStateRepo.next();
                            await Future.delayed(const Duration(seconds: 1));
                            if (user.pay(cartRepo.totalPrice()) is Err) {
                              if (context.mounted) {
                                showDialog<String>(
                                  context: context,
                                  builder: (BuildContext context) =>
                                      AlertDialog(
                                    content: const Text(
                                        'Du har desværre ikke råd til at købe dette'),
                                    actions: <Widget>[
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.pop(context, 'OK'),
                                        child: const Text('OK'),
                                      ),
                                    ],
                                  ),
                                );
                              }
                              payingStateRepo.reset();
                              return;
                            }
                            receiptRepo.createReceipt(cart);
                            payingStateRepo.next();
                            await Future.delayed(const Duration(seconds: 1));
                            cartRepo.clearCart();
                            payingStateRepo.reset();
                            if (context.mounted) {
                              Navigator.pop(context);
                              final Routing routing = context.read<Routing>();
                              routing.routeTo(PageSelector.homePage);
                            }
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
                          child: SizedBox(
                            width: 50,
                            height: 50,
                            child: CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(
                                  Theme.of(context).primaryColor),
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
                          child: Icon(
                            Icons.check_rounded,
                            color: Theme.of(context).primaryColor,
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
      ),
    );
  }
}
