import 'package:flutter/material.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/pages/product_location_page.dart';
import 'package:mobile/controllers/add_to_cart_state.dart';
import 'package:mobile/controllers/cart.dart';
import 'package:mobile/utils/price.dart';
import 'package:mobile/widgets/primary_button.dart';
import 'package:provider/provider.dart';

class ProductPage extends StatelessWidget {
  final Product product;
  final Image image;

  const ProductPage({super.key, required this.product, required this.image});

  @override
  Widget build(BuildContext context) {
    final AddToCartStateController addToCartStateRepo =
        context.watch<AddToCartStateController>();
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
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
                            formatDkkCents(product.priceDkkCent),
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
                    SizedBox(
                      height: 300,
                      child: image,
                    ),
                    Text(
                      product.name,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    Text(
                      formatDkkCents(product.priceDkkCent),
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 20, bottom: 20),
                      child: Text(product.description),
                    ),
                    PrimaryButton(
                        onPressed: () {
                          Navigator.of(context).push(MaterialPageRoute(
                              builder: (context) =>
                                  ProductLocationPage(product: product)));
                        },
                        child: const Text("Find i butik")),
                    PrimaryButton(
                        onPressed: () {
                          final snackBarDuration = const Duration(seconds: 2);
                          addToCartStateRepo.notify(snackBarDuration);
                          final snackBar = SnackBar(
                            content: Text(
                                'Tilføjet ${addToCartStateRepo.currentAmount} ${product.name} til kurven'),
                            duration: const Duration(seconds: 2),
                          );
                          ScaffoldMessenger.of(context).removeCurrentSnackBar();
                          final cartRepo = context.read<CartControllerCache>();
                          cartRepo.addToCart(product);
                          ScaffoldMessenger.of(context).showSnackBar(snackBar);
                        },
                        child: const Text("Tilføj til indkøbskurv")),
                  ],
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
