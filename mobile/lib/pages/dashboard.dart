import 'package:flutter/material.dart';
import 'package:mobile/pages/all_products_page.dart';
import 'package:mobile/pages/cart_page.dart';
import 'package:mobile/pages/all_receipts_page.dart';
import 'package:mobile/pages/home_page.dart';
import 'package:mobile/repos/routing.dart';
import 'package:mobile/repos/cart.dart';
import 'package:mobile/repos/user.dart';
import 'package:provider/provider.dart';

class Dashboard extends StatelessWidget {
  final User user;

  final List<StatelessWidget> pages = [];

  Dashboard({super.key, required this.user}) {
    pages.addAll([
      HomePage(
        user: user,
      ),
      const AllProductsPage(),
      CartPage(user: user),
      const AllReceiptsPage(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final pageIndexProvider = Provider.of<Routing>(context);
    int currentIndex = pageIndexProvider.currentIndex;
    final CartRepo cartRepo = context.watch<CartRepo>();

    return Scaffold(
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        onTap: (index) => pageIndexProvider.routeToIndex(index),
        currentIndex: currentIndex,
        items: <BottomNavigationBarItem>[
          BottomNavigationBarItem(
              icon: Icon(currentIndex == 0 ? Icons.home : Icons.home_outlined),
              label: "Hjem"),
          BottomNavigationBarItem(
              icon: Icon(
                  currentIndex == 1 ? Icons.search : Icons.search_outlined),
              label: "Varer"),
          BottomNavigationBarItem(
              icon: cartRepo.totalItemsInCart() == 0
                  ? Icon(currentIndex == 2
                      ? Icons.shopping_cart
                      : Icons.shopping_cart_outlined)
                  : Badge.count(
                      backgroundColor: Theme.of(context).primaryColor,
                      count: cartRepo.totalItemsInCart(),
                      child: Icon(currentIndex == 2
                          ? Icons.shopping_cart
                          : Icons.shopping_cart_outlined),
                    ),
              label: "Kurv"),
          BottomNavigationBarItem(
              icon: Icon(currentIndex == 3
                  ? Icons.receipt_long
                  : Icons.receipt_long_outlined),
              label: "Kvitteringer")
        ],
      ),
      body: SafeArea(child: pages[currentIndex]),
    );
  }
}
