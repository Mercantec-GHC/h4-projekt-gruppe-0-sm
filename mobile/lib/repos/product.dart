import 'package:flutter/material.dart';

class ProductRepo extends ChangeNotifier {
  int _nextId = 0;
  List<Product> products = [];
  ProductRepo() {
    _addAllProducts();
  }

  int getNextId() {
    return _nextId++;
  }

  List<Product> allProducts() {
    return products;
  }

  void changePrice(int idx, int price) {
    products[idx].price = price;
    notifyListeners();
  }

  void _addAllProducts() {
    products = [
      Product(
          id: _nextId++,
          name: "Minimælk",
          price: 12,
          description: "Konventionel minimælk med fedtprocent på 0,4%"),
      Product(
          id: _nextId++,
          name: "Letmælk",
          price: 13,
          description: "Konventionel letmælk med fedtprocent på 1,5%"),
      Product(
          id: _nextId++,
          name: "Frilands Øko Supermælk",
          price: 20,
          description:
              "Økologisk mælk af frilandskøer med fedtprocent på 3,5%. Ikke homogeniseret eller pasteuriseret. Skaber store muskler og styrker knoglerne 💪"),
      Product(
          id: _nextId++,
          name: "Øko Gulerødder 1 kg",
          price: 10,
          description: ""),
      Product(id: _nextId++, name: "Øko Agurk", price: 10, description: ""),
      Product(id: _nextId++, name: "Æbler 1 kg", price: 10, description: ""),
      Product(id: _nextId++, name: "Basmati Ris", price: 20, description: ""),
      Product(id: _nextId++, name: "Haribo Mix", price: 30, description: ""),
      Product(id: _nextId++, name: "Smør", price: 30, description: ""),
      Product(id: _nextId++, name: "Harboe Cola", price: 5, description: ""),
      Product(
          id: _nextId++,
          name: "Monster Energi Drik",
          price: 20,
          description: ""),
      Product(id: _nextId++, name: "Spaghetti", price: 10, description: ""),
      Product(id: _nextId++, name: "Æbler 1 kg", price: 20, description: ""),
      Product(id: _nextId++, name: "Rød Cecil", price: 60, description: ""),
      Product(
          id: _nextId++,
          name: "Jägermeister 750 ml",
          price: 60,
          description: ""),
    ];
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
