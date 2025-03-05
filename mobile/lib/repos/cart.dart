import 'package:flutter/material.dart';
import 'package:mobile/models/product.dart';

class ProductIdException implements Exception {}

class CartRepo extends ChangeNotifier {
  final List<CartItem> cart = [
    CartItem(
        product: Product(
            id: 1,
            name: "Letmælk",
            priceInDkkCent: 1295,
            description: "Konventionel letmælk med fedtprocent på 1,5%"),
        amount: 1),
    CartItem(
        product: Product(
            id: 2,
            name: "Frilands Øko Supermælk",
            priceInDkkCent: 1995,
            description:
                "Økologisk mælk af frilandskøer med fedtprocent på 3,5%. Ikke homogeniseret eller pasteuriseret. Skaber store muskler og styrker knoglerne 💪"),
        amount: 6),
    CartItem(
        product: Product(
            id: 3,
            name: "Minimælk",
            priceInDkkCent: 1195,
            description: "Konventionel minimælk med fedtprocent på 0,4%"),
        amount: 1),
  ];

  List<CartItem> allCartItems() {
    return cart;
  }

  CartItem? withProductId(int productId) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].product.id == productId) {
        return cart[i];
      }
    }
    return null;
  }

  void incrementAmount(int productId) {
    final cartItem = withProductId(productId);
    if (cartItem == null) {
      throw ProductIdException();
    }
    cartItem.amount++;
    notifyListeners();
  }

  void decrementAmount(int productId) {
    final cartItem = withProductId(productId);
    if (cartItem == null) {
      throw ProductIdException();
    }
    cartItem.amount -= 1;
    if (cartItem.amount <= 0) {
      cart.remove(cartItem);
    }
    notifyListeners();
  }

  bool willRemoveOnNextDecrement(int productId) {
    final cartItem = withProductId(productId);
    if (cartItem == null) {
      throw ProductIdException();
    }
    return cartItem.amount <= 1;
  }

  void removeCartItem(int productId) {
    final cartItem = withProductId(productId);
    if (cartItem == null) {
      throw ProductIdException();
    }
    cart.remove(cartItem);
    notifyListeners();
  }

  void addToCart(Product product) {
    final cartItem = withProductId(product.id);
    if (cartItem == null) {
      cart.add(CartItem(product: product, amount: 1));
    } else {
      cartItem.amount++;
    }
    notifyListeners();
  }

  int totalItemsInCart() {
    return cart.fold<int>(0, (prev, cartItem) => prev + cartItem.amount);
  }

  int totalPrice() {
    return cart.fold<int>(
        0,
        (prev, cartItem) =>
            prev + cartItem.amount * cartItem.product.priceInDkkCent);
  }

  void clearCart() {
    cart.clear();
    notifyListeners();
  }
}

class CartItem {
  final Product product;
  int amount;

  CartItem({required this.product, required this.amount});
}
