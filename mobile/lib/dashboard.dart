import 'package:flutter/material.dart';
import 'package:mobile/all_products_page.dart';
import 'package:mobile/cart_page.dart';
import 'package:mobile/receipts_page.dart';
import 'package:provider/provider.dart';

class BottomNavigationBarProvider extends ChangeNotifier {
  int currentIndex = 0;

  void setIndex(int index) {
    currentIndex = index;
    notifyListeners();
  }
}

class Dashboard extends StatelessWidget {
  final List<StatelessWidget> pages = [
    const AllProductsPage(),
    const CartPage(),
    const ReceiptsPage(),
  ];

  Dashboard({super.key});

  @override
  Widget build(BuildContext context) {
    final pageIndexProvider = Provider.of<BottomNavigationBarProvider>(context);
    int currentIndex = pageIndexProvider.currentIndex;

    return Scaffold(
      bottomNavigationBar: BottomNavigationBar(
        onTap: (index) => pageIndexProvider.setIndex(index),
        currentIndex: currentIndex,
        items: <BottomNavigationBarItem>[
          BottomNavigationBarItem(
              icon: Icon(currentIndex == 0 ? Icons.home : Icons.home_outlined),
              label: "Home"),
          BottomNavigationBarItem(
              icon: Icon(currentIndex == 1
                  ? Icons.shopping_cart
                  : Icons.shopping_cart_outlined),
              label: "Cart"),
          BottomNavigationBarItem(
              icon: Icon(currentIndex == 2
                  ? Icons.receipt_long
                  : Icons.receipt_long_outlined),
              label: "Receipts")
        ],
      ),
      body: pages[currentIndex],
    );
  }
}

//Consumer<ProductRepo>(builder: (_, productRepo, __) {
//              final products = productRepo.allProducts();
//              return ListView.builder(
//                shrinkWrap: true,
//                itemBuilder: (_, idx) => ProductListItem(
//                  name: products[idx].name,
//                  price: products[idx].price,
//                  imagePath: "assets/${products[idx].name}.png",
//                  productPage: ProductPage(product: products[idx]),
//                ),
//                itemCount: products.length,
//              );
//            })
