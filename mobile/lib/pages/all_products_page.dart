import 'package:flutter/material.dart';
import 'package:mobile/repos/product.dart';
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
    return Container(
      margin: const EdgeInsets.all(10),
      height: 100,
      decoration: BoxDecoration(
          color: const Color(0xFFFFFFFF),
          border: Border.all(color: const Color(0xFF666666)),
          borderRadius: const BorderRadius.all(Radius.circular(10))),
      child: ElevatedButton(
          style: ButtonStyle(
              backgroundColor: WidgetStateProperty.all(Colors.transparent),
              elevation: WidgetStateProperty.all(0),
              shape: WidgetStateProperty.all(const RoundedRectangleBorder()),
              padding: WidgetStateProperty.all(EdgeInsets.zero),
              splashFactory: NoSplash.splashFactory),
          onPressed: () {
            Navigator.of(context)
                .push(MaterialPageRoute(builder: (context) => productPage));
          },
          child: Expanded(
              child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                  padding: const EdgeInsets.fromLTRB(10, 10, 0, 10),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style:
                            const TextStyle(fontSize: 20, color: Colors.black),
                      ),
                      Text(
                        "${price.toString()} kr",
                        style:
                            const TextStyle(fontSize: 16, color: Colors.black),
                      )
                    ],
                  )),
              ClipRRect(
                  borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(10),
                      bottomRight: Radius.circular(10)),
                  child: Image(
                    image: AssetImage(imagePath),
                    fit: BoxFit.contain,
                    width: 100,
                  ))
            ],
          ))),
    );
  }
}

class AllProductsPage extends StatelessWidget {
  const AllProductsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Expanded(
          child: Column(children: [
            const Row(
              children: [
                BackButton(),
                Expanded(
                  child: TextField(
                      decoration: InputDecoration(
                          label: Text("Search"),
                          contentPadding: EdgeInsets.only(top: 20))),
                ),
              ],
            ),
            Consumer<ProductRepo>(builder: (_, productRepo, __) {
              final products = productRepo.allProducts();
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
          ]),
        ),
      ],
    );
  }
}
