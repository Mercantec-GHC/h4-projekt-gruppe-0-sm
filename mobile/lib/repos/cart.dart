import 'package:flutter/material.dart';
import 'package:mobile/repos/product.dart';

class ProductIdException implements Exception {}

class CartRepo extends ChangeNotifier {
  final List<CartItem> cart = [
    CartItem(
        product: Product(
            id: 1,
            name: "Letmælk",
            price: 13,
            description: "Konventionel letmælk med fedtprocent på 1,5%"),
        amount: 1),
    CartItem(
        product: Product(
            id: 2,
            name: "Frilands Øko Supermælk",
            price: 20,
            description:
                "Økologisk mælk af frilandskøer med fedtprocent på 3,5%. Ikke homogeniseret eller pasteuriseret. Skaber store muskler og styrker knoglerne 💪"),
        amount: 6),
    CartItem(
        product: Product(
            id: 1,
            name: "Letmælk",
            price: 13,
            description: "Konventionel letmælk med fedtprocent på 1,5%"),
        amount: 1),
    CartItem(
        product: Product(
            id: 1,
            name: "Letmælk",
            price: 13,
            description: "Konventionel letmælk med fedtprocent på 1,5%"),
        amount: 1),
    CartItem(
        product: Product(
            id: 1,
            name: "Letmælk",
            price: 13,
            description: "Konventionel letmælk med fedtprocent på 1,5%"),
        amount: 1),
    CartItem(
        product: Product(
            id: 1,
            name: "Letmælk",
            price: 13,
            description: "Konventionel letmælk med fedtprocent på 1,5%"),
        amount: 1),
    CartItem(
        product: Product(
            id: 1,
            name: "Letmælk",
            price: 13,
            description: "Konventionel letmælk med fedtprocent på 1,5%"),
        amount: 1),
    CartItem(
        product: Product(
            id: 1,
            name: "Letmælk",
            price: 13,
            description: "Konventionel letmælk med fedtprocent på 1,5%"),
        amount: 1),
  ];

  List<CartItem> allCartItems() {
    return cart;
  }

  CartItem withProductId(int productId) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].product.id == productId) {
        return cart[i];
      }
    }
    throw ProductIdException();
  }

  void incrementAmount(int productId) {
    var cartItem = withProductId(productId);
    cartItem.amount++;
    notifyListeners();
  }

  void decrementAmount(int productId) {
    var cartItem = withProductId(productId);
    if (--cartItem.amount <= 0) {
      removeCartItem(cartItem);
    }
    notifyListeners();
  }

  void removeCartItem(CartItem cartItem) {
    cart.remove(cartItem);
    notifyListeners();
  }
}

class CartItem {
  final Product product;
  int amount;

  CartItem({required this.product, required this.amount});
}
