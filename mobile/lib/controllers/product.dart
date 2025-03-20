import 'package:flutter/material.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';

class ProductController extends ChangeNotifier {
  final Server server;

  List<Product> products = [];
  String query = "";
  ProductController({required this.server}) {
    fetchProductsFromServer();
  }

  Future<void> fetchProductsFromServer() async {
    final res = await server.allProducts();
    switch (res) {
      case Ok<List<Product>, String>(value: final data):
        products = data;
        notifyListeners();
      case Err<List<Product>, String>():
        return;
    }
  }

  Image productImage(int productId) {
    return server.productImage(productId);
  }

  List<Product> get filteredProducts {
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
