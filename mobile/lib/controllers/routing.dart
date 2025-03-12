import 'package:flutter/material.dart';

enum PageSelector { homePage, productsPage, cartPage, receiptsPage }

class RoutingController extends ChangeNotifier {
  int currentIndex = 0;

  void routeTo(PageSelector page) {
    currentIndex = page.index;
    notifyListeners();
  }

  void routeToIndex(int index) {
    currentIndex = index;
    notifyListeners();
  }
}
