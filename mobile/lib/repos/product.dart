import 'package:flutter/material.dart';

class ProductRepo extends ChangeNotifier {
  final List<Product> _products = [
    Product(
        id: 0,
        name: "Minimælk",
        price: 12,
        description: "Konventionel minimælk med fedtprocent på 0,4%"),
    Product(
        id: 1,
        name: "Letmælk",
        price: 13,
        description: "Konventionel letmælk med fedtprocent på 1,5%"),
    Product(
        id: 2,
        name: "Frilands Øko Supermælk",
        price: 20,
        description:
            "Økologisk mælk af frilandskøer med fedtprocent på 3,5%. Ikke homogeniseret eller pasteuriseret. Skaber store muskler og styrker knoglerne 💪")
  ];

  List<Product> allProducts() {
    return _products;
  }

  void changePrice(int idx, int price) {
    _products[idx].price = price;
    notifyListeners();
  }
}

class Product {
  final int id;
  final String name;
  final String description;
  int price;
  Product(
      {required this.id,
      required this.name,
      required this.price,
      required this.description});
}
