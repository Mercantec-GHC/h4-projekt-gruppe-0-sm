import 'package:flutter/material.dart';
import 'package:mobile/models/coordinate.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/client.dart';
import 'package:mobile/server/server.dart';

class ProductController extends ChangeNotifier {
  int _nextId = 0;
  List<Product> products = [];
  String query = "";
  ProductController() {
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
          barcode: "5060337502900",
          name: "Monster Energi Drik",
          priceInDkkCents: 1500,
          description: ""),
      Product(
          id: _nextId++,
          barcode: "5712870659220",
          name: "Amper Energi Drik",
          priceInDkkCents: 750,
          description: ""),
      Product(
          id: _nextId++,
          barcode: "5710326001937",
          name: "Danskvand Med Brus",
          priceInDkkCents: 500,
          description: "Med smag a blåbær"),
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

class ProductControllerByServer extends ChangeNotifier {
  final client = BackendServer();
  List<Product> products = [];
  String query = "";
  ProductControllerByServer() {
    fetchProductsFromServer();
  }

  Future<void> fetchProductsFromServer() async {
    final res = client.allProducts();
    if (res is Error) {
      return;
    }
    products = (res as Success<List<Product>>).data;
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
