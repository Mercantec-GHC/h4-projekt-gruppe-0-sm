import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:mobile/models/coordinate.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/results.dart';

class ProductRepo extends ChangeNotifier {
  int _nextId = 0;
  List<Product> products = [];
  String query = "";
  ProductRepo() {
    _addAllProducts();
  }

  int getNextId() {
    return _nextId++;
  }

  get filteredProducts {
    if (query.trim().isEmpty) {
      return products;
    }
    return products.where((product) {
      final nameLower = product.name.toLowerCase();
      final descriptionLower = product.description.toLowerCase();
      final searchLower = query.toLowerCase();

      return nameLower.contains(searchLower) ||
          descriptionLower.contains(searchLower);
    }).toList();
  }

  void searchProducts(String query) {
    this.query = query;
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
          priceInDkkCents: 1200,
          description: "Konventionel minimælk med fedtprocent på 0,4%"),
      Product(
          id: _nextId++,
          name: "Letmælk",
          priceInDkkCents: 1300,
          description: "Konventionel letmælk med fedtprocent på 1,5%",
          location: Coordinate(x: 1800, y: 100)),
      Product(
          id: _nextId++,
          name: "Frilands Øko Supermælk",
          priceInDkkCents: 2000,
          description:
              "Økologisk mælk af frilandskøer med fedtprocent på 3,5%. Ikke homogeniseret eller pasteuriseret. Skaber store muskler og styrker knoglerne 💪"),
      Product(
          id: _nextId++,
          name: "Øko Gulerødder 1 kg",
          priceInDkkCents: 1000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Øko Agurk",
          priceInDkkCents: 1000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Æbler 1 kg",
          priceInDkkCents: 1000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Basmati Ris",
          priceInDkkCents: 2000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Haribo Mix",
          priceInDkkCents: 3000,
          description: ""),
      Product(
          id: _nextId++, name: "Smør", priceInDkkCents: 3000, description: ""),
      Product(
          id: _nextId++,
          name: "Harboe Cola",
          priceInDkkCents: 500,
          description: ""),
      Product(
          id: _nextId++,
          name: "Monster Energi Drik",
          priceInDkkCents: 2000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Spaghetti",
          priceInDkkCents: 1000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Rød Cecil",
          priceInDkkCents: 6000,
          description: ""),
      Product(
          id: _nextId++,
          name: "Jägermeister 750 ml",
          priceInDkkCents: 12000,
          description: ""),
      Product(
          id: _nextId++,
          barcode: "5711953068881",
          name: "Protein Chokoladedrik",
          priceInDkkCents: 1500,
          description: "Arla's protein chokolade drik der giver store muskler"),
    ];
  }
}

class ProductRepoByServer extends ChangeNotifier {
  String apiUrl = "http://127.0.0.1:8080/products.json";
  List<Product> products = [];
  String query = "";
  ProductRepoByServer() {
    fetchProductsFromServer();
  }

  Future<void> fetchProductsFromServer() async {
    final res = await http.get(
      Uri.parse(apiUrl),
    );
    final productsJson = List<Map<String, dynamic>>.from(jsonDecode(res.body));
    products =
        productsJson.map(((product) => Product.fromJson(product))).toList();
    notifyListeners();
  }

  get filteredProducts {
    if (query.trim().isEmpty) {
      return products;
    }
    return products.where((product) {
      final nameLower = product.name.toLowerCase();
      final descriptionLower = product.description.toLowerCase();
      final searchLower = query.toLowerCase();

      return nameLower.contains(searchLower) ||
          descriptionLower.contains(searchLower);
    }).toList();
  }

  void searchProducts(String query) {
    this.query = query;
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
}
