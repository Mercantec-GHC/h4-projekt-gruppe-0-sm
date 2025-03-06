import 'package:barcode_scan2/model/android_options.dart';
import 'package:barcode_scan2/model/scan_options.dart';
import 'package:barcode_scan2/platform_wrapper.dart';
import 'package:flutter/material.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/pages/finish_shopping_page.dart';
import 'package:mobile/repos/cart.dart';
import 'package:mobile/repos/product.dart';
import 'package:mobile/repos/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/utils/price.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:mobile/widgets/sized_card.dart';
import 'package:provider/provider.dart';

class CartItemView extends StatelessWidget {
  final CartRepo cartRepo;
  final int productId;
  final String name;
  final int price;
  final int amount;

  const CartItemView(
      {super.key,
      required this.cartRepo,
      required this.productId,
      required this.name,
      required this.price,
      required this.amount});

  @override
  Widget build(BuildContext context) {
    return SizedCard(
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
                          Text(formatDkkCents(price),
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
          Image(
            width: 100,
            image: AssetImage("assets/products/$name.png"),
            errorBuilder: (_, __, ___) => const Image(
              image: AssetImage("assets/placeholder.png"),
              width: 100,
            ),
          )
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
  final User user;
  const CartPage({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return Column(
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
                    price: cart[idx].product.priceInDkkCents,
                    amount: cart[idx].amount),
                itemCount: cart.length,
              );
            },
          ),
        ),
        Container(
          decoration: const BoxDecoration(color: Color(0xFFFFFFFF), boxShadow: [
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
                          onPressed: () {
                            final inputController = TextEditingController();
                            showDialog(
                                context: context,
                                builder: (BuildContext context) => AlertDialog(
                                      title: const Text(
                                          "Indtast stregkode nummer"),
                                      content: TextField(
                                        keyboardType: TextInputType.number,
                                        controller: inputController,
                                      ),
                                      actions: [
                                        TextButton(
                                            onPressed: () =>
                                                Navigator.of(context).pop(),
                                            child: const Text("Cancel")),
                                        TextButton(
                                            onPressed: () {
                                              final productRepo =
                                                  context.read<ProductRepo>();
                                              final CartRepo cartRepo =
                                                  context.read<CartRepo>();
                                              final productResult = productRepo
                                                  .productWithBarcode(
                                                      inputController.text);
                                              switch (productResult) {
                                                case Ok<Product, String>():
                                                  cartRepo.addToCart(
                                                      productResult.value);
                                                  final snackBar = SnackBar(
                                                      content: Text(
                                                          "Tilføjet ${productResult.value.name} til indkøbskurven"));
                                                  ScaffoldMessenger.of(context)
                                                      .showSnackBar(snackBar);
                                                case Err<Product, String>():
                                                  final snackBar = const SnackBar(
                                                      content: Text(
                                                          "Den indtastede stregkode eksistere ikke"));
                                                  ScaffoldMessenger.of(context)
                                                      .showSnackBar(snackBar);
                                              }
                                              Navigator.of(context).pop();
                                            },
                                            child: const Text("Ok"))
                                      ],
                                    ));
                          },
                          child: const Text("Indtast vare")),
                    ),
                  ),
                  Expanded(
                    child: Container(
                      margin: const EdgeInsets.only(left: 10),
                      child: PrimaryButton(
                          onPressed: () async {
                            final result = await BarcodeScanner.scan(
                                options: const ScanOptions(
                                    android: AndroidOptions(
                                        appBarTitle: "Skan varer"),
                                    strings: {
                                  "cancel": "Annullér",
                                  "flash_on": "Lommelygte til",
                                  "flash_off": "Lommelygte fra"
                                }));
                            switch (result.type.name) {
                              case "Cancelled":
                                final snackBar = const SnackBar(
                                    content:
                                        Text("Skanning af varer annulleret"));
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context)
                                      .showSnackBar(snackBar);
                                }
                              case "Barcode":
                                if (!context.mounted) {
                                  return;
                                }
                                final CartRepo cartRepo =
                                    context.read<CartRepo>();
                                final productRepo = context.read<ProductRepo>();
                                final productResult = productRepo
                                    .productWithBarcode(result.rawContent);
                                switch (productResult) {
                                  case Ok<Product, String>():
                                    {
                                      cartRepo.addToCart(productResult.value);
                                      final snackBar = SnackBar(
                                          content: Text(
                                              "Tilføjet ${productResult.value.name} til indkøbskurven"));
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(snackBar);
                                    }
                                  case Err<Product, String>():
                                    final snackBar = const SnackBar(
                                        content: Text(
                                            "Varen du prøver at tilføje eksistere ikke"));
                                    ScaffoldMessenger.of(context)
                                        .showSnackBar(snackBar);
                                }

                              case "Error":
                                if (!context.mounted) {
                                  return;
                                }
                                final snackBar = const SnackBar(
                                    content:
                                        Text("Der skete en fejl, prøv igen"));
                                ScaffoldMessenger.of(context)
                                    .showSnackBar(snackBar);

                              default:
                                throw Exception("Unreachable");
                            }
                          },
                          child: const Text("Skan vare")),
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
                                        FinishShoppingPage(user: user)));
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
    );
  }
}
