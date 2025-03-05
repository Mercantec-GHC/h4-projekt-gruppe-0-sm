import 'package:flutter/material.dart';
import 'package:mobile/models/coordinate.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/results.dart';

class ProductRepoByMemory extends ChangeNotifier {
  int _nextId = 0;
  List<Product> products = [];
  late List<Product> filteredProducts;
  ProductRepoByMemory() {
    _addAllProducts();
    filteredProducts = products;
  }

  int getNextId() {
    return _nextId++;
  }

  List<Product> allProducts() {
    return products;
  }

  void searchProducts(String query) {
    if (query.trim().isEmpty) {
      filteredProducts = products;
    } else {
      filteredProducts = products.where((product) {
        final nameLower = product.name.toLowerCase();
        final descriptionLower = product.description.toLowerCase();
        final searchLower = query.toLowerCase();

        return nameLower.contains(searchLower) ||
            descriptionLower.contains(searchLower);
      }).toList();
    }
    notifyListeners();
  }

  Result<Product, String> productWithBarcode(String barcode) {
    for (var i = 0; i < products.length; i++) {
      if (products[i].barcode == barcode) {
        return Ok(products[i]);
      }
    }
    return Err("Product with barcode $barcode doesn't exist");
  }

  void _addAllProducts() {
    products = [
      Product(
          id: _nextId++,
          name: "Minimælk",
          priceInDkkCent: 1200,
          description: "Konventionel minimælk med fedtprocent på 0,4%"),
      Product(
          id: _nextId++,
          name: "Letmælk",
          priceInDkkCent: 1300,
          description: "Konventionel letmælk med fedtprocent på 1,5%",
          location: Coordinate(x: 1800, y: 100)),
      Product(
          id: _nextId++,
          name: "Frilands Øko Supermælk",
          priceInDkkCent: 2000,
          description:
              "Økologisk mælk af frilandskøer med fedtprocent på 3,5%. Ikke homogeniseret eller pasteuriseret. Skaber store muskler og styrker knoglerne 💪"),
      Product(
          id: _nextId++,
          name: "Øko Gulerødder 1 kg",
          priceInDkkCent: 1000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Øko Agurk",
          priceInDkkCent: 1000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Æbler 1 kg",
          priceInDkkCent: 1000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Basmati Ris",
          priceInDkkCent: 2000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Haribo Mix",
          priceInDkkCent: 3000,
          description: ""),
      Product(
          id: _nextId++, name: "Smør", priceInDkkCent: 3000, description: ""),
      Product(
          id: _nextId++,
          name: "Harboe Cola",
          priceInDkkCent: 500,
          description: ""),
      Product(
          id: _nextId++,
          name: "Monster Energi Drik",
          priceInDkkCent: 2000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Spaghetti",
          priceInDkkCent: 1000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Rød Cecil",
          priceInDkkCent: 6000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Jägermeister 750 ml",
          priceInDkkCent: 12000,
          description: ""),
      Product(
          id: _nextId++,
          barcode: "5711953068881",
          name: "Protein Chokoladedrik",
          priceInDkkCent: 1500,
          description: "Arla's protein chokolade drik der giver store muskler"),
    ];
  }
}
