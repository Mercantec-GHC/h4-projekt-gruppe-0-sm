import 'package:flutter/material.dart';
import 'package:mobile/pages/finish_shopping_page.dart';
import 'package:mobile/repos/cart.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:mobile/widgets/primary_card.dart';
import 'package:provider/provider.dart';

class CartItemView extends StatelessWidget {
  final CartRepo cartRepo;
  final int productId;
  final String name;
  final int price;
  final String imagePath;
  final int amount;

  const CartItemView(
      {super.key,
      required this.cartRepo,
      required this.productId,
      required this.name,
      required this.price,
      required this.imagePath,
      required this.amount});

  @override
  Widget build(BuildContext context) {
    return PrimaryCard(
      child: Row(
        children: [
          Expanded(
            child: Container(
                padding: const EdgeInsets.all(10),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(name,
                                style: Theme.of(context).textTheme.bodyLarge),
                          ),
                          Text("$price kr",
                              style: Theme.of(context).textTheme.bodyMedium),
                        ],
                      ),
                    ),
                    Row(
                      children: [
                        Column(
                          children: [
                            Expanded(
                              child: Text("$amount stk",
                                  style: Theme.of(context).textTheme.bodyLarge),
                            ),
                            Row(
                              children: [
                                IconButton(
                                    onPressed: () {
                                      cartRepo.incrementAmount(productId);
                                    },
                                    icon: const Icon(Icons.add)),
                                IconButton(
                                    onPressed: () {
                                      if (cartRepo.willRemoveOnNextDecrement(
                                          productId)) {
                                        removeCartItemDialog(context);
                                      } else {
                                        cartRepo.decrementAmount(productId);
                                      }
                                    },
                                    icon: const Icon(Icons.remove))
                              ],
                            ),
                          ],
                        )
                      ],
                    ),
                  ],
                )),
          ),
          IconButton(
              onPressed: () => removeCartItemDialog(context),
              icon: const Icon(Icons.delete_outline)),
          Image(width: 100, image: AssetImage(imagePath))
        ],
      ),
    );
  }

  Future<void> removeCartItemDialog(BuildContext context) {
    return showDialog<void>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          content: Text(
              "Er du sikker på, at du vil slette ${name.toLowerCase()} fra indkøbskurven?"),
          actions: <Widget>[
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  margin: const EdgeInsets.only(right: 5),
                  child: TextButton(
                    style: TextButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white),
                    child: const Text('Slet'),
                    onPressed: () {
                      cartRepo.removeCartItem(productId);
                      Navigator.of(context).pop();
                    },
                  ),
                ),
                Container(
                  margin: const EdgeInsets.only(left: 5),
                  child: PrimaryButton(
                    child: const Text('Annullér'),
                    onPressed: () {
                      Navigator.of(context).pop();
                    },
                  ),
                ),
              ],
            )
          ],
        );
      },
    );
  }
}

class CartPage extends StatelessWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          Expanded(
            child: Consumer<CartRepo>(
              builder: (_, cartRepo, __) {
                final cart = cartRepo.allCartItems();
                return ListView.builder(
                  shrinkWrap: true,
                  itemBuilder: (_, idx) => CartItemView(
                      cartRepo: cartRepo,
                      productId: cart[idx].product.id,
                      name: cart[idx].product.name,
                      price: cart[idx].product.price,
                      imagePath: "assets/boykisser.png",
                      amount: cart[idx].amount),
                  itemCount: cart.length,
                );
              },
            ),
          ),
          Container(
            decoration:
                const BoxDecoration(color: Color(0xFFFFFFFF), boxShadow: [
              BoxShadow(
                blurRadius: 10,
                spreadRadius: -4,
              )
            ]),
            padding: const EdgeInsets.all(10),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        margin: const EdgeInsets.only(right: 10),
                        child: PrimaryButton(
                            onPressed: () {},
                            child: const Text("Indtast vare")),
                      ),
                    ),
                    Expanded(
                      child: Container(
                        margin: const EdgeInsets.only(left: 10),
                        child: PrimaryButton(
                            onPressed: () {}, child: const Text("Skan vare")),
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        margin: const EdgeInsets.only(top: 10),
                        child: PrimaryButton(
                            onPressed: () {
                              Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                      builder: (context) =>
                                          const FinishShoppingPage()));
                            },
                            child: const Text("Afslut indkøb")),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
