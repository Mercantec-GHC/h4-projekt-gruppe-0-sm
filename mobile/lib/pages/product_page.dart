import 'package:flutter/material.dart';
import 'package:mobile/repos/cart.dart';
import 'package:mobile/repos/product.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:provider/provider.dart';

class ProductPage extends StatelessWidget {
  final Product product;

  const ProductPage({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Card(
        margin: const EdgeInsets.all(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Column(children: [
            Row(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const BackButton(),
                    Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product.name,
                            style: const TextStyle(
                              fontSize: 20,
                            ),
                          ),
                          Text(
                            "${product.price} kr",
                            style: const TextStyle(
                              fontSize: 16,
                            ),
                          )
                        ])
                  ],
                ),
              ],
            ),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Image(
                      image: AssetImage("assets/${product.name}.png"),
                      height: 250,
                      fit: BoxFit.fitHeight,
                    ),
                    Text(
                      product.name,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    Text(
                      "${product.price} kr",
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 20, bottom: 20),
                      child: Text(product.description),
                    ),
                    PrimaryButton(
                        onPressed: () {}, child: const Text("Find i butik")),
                    PrimaryButton(
                        onPressed: () {
                          var cartRepo = context.read<CartRepo>();
                          cartRepo.addToCart(product);
                        },
                        child: const Text("Tilføj til indkøbskurv")),
                  ],
                ),
              ),
            )
          ]),
        ),
      ),
    );
  }
}
