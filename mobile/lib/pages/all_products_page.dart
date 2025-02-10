import 'package:flutter/material.dart';
import 'package:mobile/repos/product.dart';
import 'package:mobile/widgets/primary_card.dart';
import 'package:provider/provider.dart';
import 'product_page.dart';

class ProductListItem extends StatelessWidget {
  final String name;
  final int price;
  final String imagePath;
  final ProductPage productPage;
  const ProductListItem(
      {super.key,
      required this.name,
      required this.price,
      required this.imagePath,
      required this.productPage});

  @override
  Widget build(BuildContext context) {
    return PrimaryCard(
      child: InkWell(
          borderRadius: const BorderRadius.all(Radius.circular(10)),
          onTap: () {
            Navigator.of(context)
                .push(MaterialPageRoute(builder: (context) => productPage));
          },
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                  padding: const EdgeInsets.fromLTRB(10, 10, 0, 10),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: Theme.of(context).textTheme.bodyLarge),
                      Text("${price.toString()} kr",
                          style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  )),
              ClipRRect(
                  borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(10),
                      bottomRight: Radius.circular(10)),
                  child: Ink.image(
                    image: const AssetImage("assets/boykisser.png"),
                    fit: BoxFit.contain,
                    width: 100,
                  ))
            ],
          )),
    );
  }
}

class AllProductsPage extends StatelessWidget {
  const AllProductsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final productRepo = Provider.of<ProductRepo>(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Expanded(
          child: Column(children: [
            Row(
              children: [
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.only(left: 10, right: 10),
                    child: TextField(
                        onChanged: (query) {
                          productRepo.searchProducts(query);
                        },
                        decoration: const InputDecoration(
                            label: Text("Search"),
                            contentPadding: EdgeInsets.only(top: 20))),
                  ),
                ),
              ],
            ),
            Expanded(
              child: Consumer<ProductRepo>(builder: (_, productRepo, __) {
                final products = productRepo.filteredProducts;
                return ListView.builder(
                  shrinkWrap: true,
                  itemBuilder: (_, idx) => ProductListItem(
                    name: products[idx].name,
                    price: products[idx].price,
                    imagePath: "assets/${products[idx].name}.png",
                    productPage: ProductPage(product: products[idx]),
                  ),
                  itemCount: products.length,
                );
              }),
            ),
          ]),
        ),
      ],
    );
  }
}
