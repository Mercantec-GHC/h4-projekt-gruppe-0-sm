import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:mobile/models/cart_item.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/models/receipt.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';

class BackendServer implements Server {
  final _apiUrl = "http://192.168.1.128:8080/api";
  // final _apiUrl = "http://127.0.0.1:8080/api";

  Future<Result<dynamic, String>> _postJson<Body>({
    required String endpoint,
    required Body body,
    Map<String, String>? headers,
  }) async {
    final encoded = json.encode(body);
    return Future<Result<dynamic, String>>.sync(() {
      return http.post(
        Uri.parse("$_apiUrl/$endpoint"),
        body: encoded,
        headers: {
          "Content-Type": "application/json",
          ...?headers,
        },
      ).then((res) {
        return Ok(json.decode(res.body));
      });
    }).catchError((e) {
      switch (e) {
        case http.ClientException(message: _):
          return const Err("connection refused");
        default:
          throw e;
      }
    });
  }

  Future<Result<dynamic, String>> _getJson<Body>({
    required String endpoint,
    Map<String, String>? headers,
  }) async {
    return Future<Result<dynamic, String>>.sync(() {
      return http.get(
        Uri.parse("$_apiUrl/$endpoint"),
        headers: {
          "Content-Type": "application/json",
          ...?headers,
        },
      ).then((res) {
        return Ok(json.decode(res.body));
      });
    }).catchError((e) {
      switch (e) {
        case http.ClientException(message: _):
          return const Err("connection refused");
        default:
          throw e;
      }
    });
  }

  @override
  Future<Result<List<Product>, String>> allProducts() async {
    final res = await _getJson(
      endpoint: "$_apiUrl/products/all",
    );

    return res.flatMap((body) {
      if (body["ok"]) {
        return Ok((body["products"] as List<dynamic>)
            .map(((productJson) => Product.fromJson(productJson)))
            .toList());
      } else {
        return Err(body["msg"]);
      }
    });
  }

  @override
  Future<Result<Null, String>> register(
    String name,
    String email,
    String password,
  ) async {
    final res = await _postJson(
      endpoint: "users/register",
      body: {"name": name, "email": email, "password": password},
    );

    return res.flatMap((body) {
      if (body["ok"]) {
        return const Ok(null);
      } else {
        return Err(body["msg"]);
      }
    });
  }

  @override
  Future<Result<String, String>> login(
    String email,
    String password,
  ) async {
    final res = (await _postJson(
      endpoint: "sessions/login",
      body: {"email": email, "password": password},
    ));

    return res.flatMap((body) {
      if (body["ok"]) {
        return Ok(body["token"]);
      } else {
        return Err(body["msg"]);
      }
    });
  }

  @override
  Future<Result<Null, String>> logout(String token) async {
    final res = await _postJson(endpoint: "sessions/logout", body: {});

    return res.flatMap((body) {
      if (body["ok"]) {
        return const Ok(null);
      } else {
        return Err(body["msg"]);
      }
    });
  }

  @override
  Future<Result<User, String>> sessionUser(String token) async {
    final res = await _getJson(
      endpoint: "$_apiUrl/sessions/user",
      headers: {"Session-Token": token},
    );
    return res.flatMap((body) {
      if (body["ok"]) {
        return Ok(User.fromJson(body["user"]));
      } else {
        return Err(body["msg"]);
      }
    });
  }

  @override
  Future<Result<Null, String>> purchaseCart(
      String token, List<CartItem> cartItems) async {
    final res = await _postJson(
        endpoint: "$_apiUrl/carts/purchase",
        headers: {"Content-Type": "application/json", "Session-Token": token},
        body: json.encode({
          "items": cartItems
              .map((cartItem) => {
                    "product_id": cartItem.product.id,
                    "amount": cartItem.amount
                  })
              .toList()
        }));

    return res.flatMap((body) {
      if (body["ok"]) {
        return const Ok(null);
      } else {
        return Err(body["msg"]);
      }
    });
  }

  @override
  Future<Result<Null, String>> addBalance(String token) async {
    final res =
        await _postJson(endpoint: "$_apiUrl/users/balance/add", headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Session-Token": token
    }, body: {});

    return res.flatMap((body) {
      if (body["ok"]) {
        return const Ok(null);
      } else {
        return Err(body["msg"]);
      }
    });
  }

  @override
  Future<Result<List<ReceiptHeader>, String>> allReceipts(String token) async {
    final res = await _getJson(
      endpoint: "$_apiUrl/receipts/all",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Session-Token": token
      },
    );

    return res.flatMap((body) {
      if (body["ok"]) {
        return Ok((body["receipts"] as List<dynamic>)
            .map(((receiptHeaderJson) =>
                ReceiptHeader.fromJson(receiptHeaderJson)))
            .toList());
      } else {
        return Err(body["msg"]);
      }
    });
  }

  @override
  Future<Result<Receipt, String>> oneReceipt(String token, int id) async {
    final res = await _getJson(
      endpoint: "$_apiUrl/receipts/one?receipt_id=$id",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Session-Token": token
      },
    );
    return res.flatMap((body) {
      if (body["ok"]) {
        return Ok((Receipt.fromJson(body["receipt"] as Map<String, dynamic>)));
      } else {
        return Err(body["msg"]);
      }
    });
  }

  @override
  Image productImage(int productId) {
    return Image.network("$_apiUrl/products/image.png?product_id=$productId");
  }
}
