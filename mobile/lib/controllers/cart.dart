import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/models/cart_item.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';
import 'package:path_provider/path_provider.dart';

class ProductIdException implements Exception {}

abstract class CartController extends ChangeNotifier {
  List<CartItem> allCartItems();
  CartItem? withProductId(int productId);
  void incrementAmount(int productId);
  void decrementAmount(int productId);
  bool willRemoveOnNextDecrement(int productId);
  void removeCartItem(int productId);
  void addToCart(Product product);
  int totalItemsInCart();
  int totalPrice();
  void clearCart();
}

class CartControllerMemory extends CartController {
  final Server server;
  final List<CartItem> cart = [];

  final SessionController sessionController;

  CartControllerMemory({required this.server, required this.sessionController});

  @override
  List<CartItem> allCartItems() {
    return cart;
  }

  @override
  CartItem? withProductId(int productId) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].product.id == productId) {
        return cart[i];
      }
    }
    return null;
  }

  @override
  void incrementAmount(int productId) {
    final cartItem = withProductId(productId);
    if (cartItem == null) {
      throw ProductIdException();
    }
    cartItem.amount++;
    notifyListeners();
  }

  @override
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

  @override
  bool willRemoveOnNextDecrement(int productId) {
    final cartItem = withProductId(productId);
    if (cartItem == null) {
      throw ProductIdException();
    }
    return cartItem.amount <= 1;
  }

  @override
  void removeCartItem(int productId) {
    final cartItem = withProductId(productId);
    if (cartItem == null) {
      throw ProductIdException();
    }
    cart.remove(cartItem);
    notifyListeners();
  }

  @override
  void addToCart(Product product) {
    final cartItem = withProductId(product.id);
    if (cartItem == null) {
      cart.add(CartItem(product: product, amount: 1));
    } else {
      cartItem.amount++;
    }
    notifyListeners();
  }

  @override
  int totalItemsInCart() {
    return cart.fold<int>(0, (prev, cartItem) => prev + cartItem.amount);
  }

  @override
  int totalPrice() {
    return cart.fold<int>(
        0,
        (prev, cartItem) =>
            prev + cartItem.amount * cartItem.product.priceDkkCent);
  }

  @override
  void clearCart() {
    cart.clear();
    notifyListeners();
  }

  Future<Result<Null, String>> purchase() async {
    final res = await sessionController.requestWithSession(
        (server, sessionToken) => server.purchaseCart(sessionToken, cart));
    switch (res) {
      case Ok<Null, String>():
        await sessionController.loadUpdatedUser();
        return const Ok(null);
      case Err<Null, String>(value: final message):
        return Err(message);
    }
  }
}

class CartControllerCache extends CartControllerMemory {
  static Future<File> get _cacheFile async {
    final directory = await getApplicationCacheDirectory();
    return File("${directory.path}/cart.json").create();
  }

  CartControllerCache(
      {required super.server, required super.sessionController}) {
    load();
  }

  void save() async {
    final json =
        jsonEncode(cart.map((cartItem) => CartItem.toJson(cartItem)).toList());
    (await _cacheFile).writeAsString(json);
  }

  void load() async {
    final json = await (await _cacheFile).readAsString();
    if (json.isEmpty) {
      return;
    }
    final res = jsonDecode(json);
    final cartItems = (res as List<dynamic>)
        .map(((cartItems) => CartItem.fromJson(cartItems)))
        .toList();
    cart.insertAll(0, cartItems);
    notifyListeners();
  }

  @override
  void incrementAmount(int productId) {
    super.incrementAmount(productId);
    save();
  }

  @override
  void decrementAmount(int productId) {
    super.decrementAmount(productId);
    save();
  }

  @override
  void removeCartItem(int productId) {
    super.removeCartItem(productId);
    save();
  }

  @override
  void addToCart(Product product) {
    super.addToCart(product);
    save();
  }

  @override
  void clearCart() {
    super.clearCart();
    save();
  }
}
