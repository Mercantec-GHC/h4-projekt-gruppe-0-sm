import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:mobile/models/cart_item.dart';
import 'package:mobile/models/coordinate.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/models/receipt.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/results.dart';

abstract class Server {
  Future<Result<List<Product>, String>> allProducts();

  Future<Result<Null, String>> register(
    String name,
    String email,
    String password,
  );

  Future<Result<String, String>> login(
    String email,
    String password,
  );
  Future<Result<Null, String>> logout(String token);

  Future<Result<User, String>> sessionUser(String token);

  Future<Result<Null, String>> purchaseCart(
      String token, List<CartItem> cartItems);

  Future<Result<Null, String>> addBalance(String token);

  Future<Result<List<ReceiptHeader>, String>> allReceipts(String token);
  Future<Result<Receipt, String>> oneReceipt(String token, int id);

  Future<Result<Coordinate, String>> productCoords(int id);

  Image productImage(int productId);
}

class ErrorMessages {
  final String language;

  static ErrorMessages? _instance;

  static init(String language) {
    _instance = ErrorMessages(language: language);
  }

  static ErrorMessages get instance {
    final instance = _instance;
    if (instance == null) {
      throw NotInitialized();
    }
    return instance;
  }

  ErrorMessages({required this.language});

  static String fancy(String message) {
    return instance._fancy(message);
  }

  String _fancy(String message) {
    switch (language) {
      case "danish":
        return _fancyDanish(message);
      default:
        return "error: $message";
    }
  }

  String _fancyDanish(String message) {
    switch (message) {
      case "insufficient funds":
        return "Du har desværre ikke nok penge på kontoen.";
      case "bad request":
        return "Fejl i kommunikation mellem app og server.";

      default:
        if (kDebugMode) {
          throw NotTranslated(message: message);
        }
        return "error: $message";
    }
  }
}

class NotInitialized implements Exception {}

class NotTranslated implements Exception {
  final String message;

  NotTranslated({required this.message});

  @override
  String toString() {
    return "${super.toString()}: message \"$message\" is not translated";
  }
}
