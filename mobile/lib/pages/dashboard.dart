import 'package:flutter/material.dart';
import 'package:mobile/pages/all_products_page.dart';
import 'package:mobile/pages/cart_page.dart';
import 'package:mobile/pages/all_receipts_page.dart';
import 'package:mobile/repos/bottom_navigation_bar.dart';
import 'package:mobile/repos/cart.dart';
import 'package:provider/provider.dart';

class Dashboard extends StatelessWidget {
  final List<StatelessWidget> pages = [
    const AllProductsPage(),
    const CartPage(),
    const AllReceiptsPage(),
  ];

  Dashboard({super.key});

  @override
  Widget build(BuildContext context) {
    final pageIndexProvider = Provider.of<BottomNavigationBarRepo>(context);
    int currentIndex = pageIndexProvider.currentIndex;
    final CartRepo cartRepo = context.watch<CartRepo>();

    return Scaffold(
      bottomNavigationBar: BottomNavigationBar(
        onTap: (index) => pageIndexProvider.setIndex(index),
        currentIndex: currentIndex,
        items: <BottomNavigationBarItem>[
          BottomNavigationBarItem(
              icon: Icon(currentIndex == 0 ? Icons.home : Icons.home_outlined),
              label: "Home"),
          BottomNavigationBarItem(
              icon: Badge.count(
                count: cartRepo.totalItemsInCart(),
                child: Icon(currentIndex == 1
                    ? Icons.shopping_cart
                    : Icons.shopping_cart_outlined),
              ),
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
