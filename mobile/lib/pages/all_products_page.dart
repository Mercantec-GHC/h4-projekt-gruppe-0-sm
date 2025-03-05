import 'package:flutter/material.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/repos/product.dart';
import 'package:mobile/utils/price.dart';
import 'package:mobile/widgets/sized_card.dart';
import 'package:provider/provider.dart';
import 'product_page.dart';

class ProductImage extends StatefulWidget {
  final String productName;

  const ProductImage(this.productName, {super.key});

  @override
  State<StatefulWidget> createState() {
    return _ProductImageState();
  }
}

class _ProductImageState extends State<ProductImage> {
  late ImageProvider<Object> image;

  @override
  void initState() {
    image = Image.asset(
      "assets/products/${widget.productName}.png",
    ).image;
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Ink.image(
      image: image,
      onImageError: (_, __) {
        setState(() {
          image = Image.asset("assets/placeholder.png").image;
        });
      },
      fit: BoxFit.contain,
      width: 100,
    );
  }
}

class ProductListItem extends StatelessWidget {
  final int productId;
  final String name;
  final int price;
  final ProductPage productPage;

  final Product product;

  const ProductListItem({
    super.key,
    required this.productId,
    required this.name,
    required this.price,
    required this.productPage,
    required this.product,
  });

  @override
  Widget build(BuildContext context) {
    return SizedCard(
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
                      Text(formatDkkCents(price),
                          style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  )),
              ClipRRect(
                  borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(10),
                      bottomRight: Radius.circular(10)),
                  child: ProductImage(name)),
            ],
          )),
    );
  }
}

class AllProductsPage extends StatelessWidget {
  const AllProductsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final productRepo = Provider.of<ProductRepoByMemory>(context);
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
              child:
                  Consumer<ProductRepoByMemory>(builder: (_, productRepo, __) {
                final products = productRepo.filteredProducts;
                return ListView.builder(
                  shrinkWrap: true,
                  itemBuilder: (_, idx) => ProductListItem(
                    productId: products[idx].id,
                    name: products[idx].name,
                    price: products[idx].priceInDkkCent,
                    productPage: ProductPage(product: products[idx]),
                    product: products[idx],
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
