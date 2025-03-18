import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:mobile/models/cart_item.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';

class BackendServer implements Server {
  final _apiUrl = "http://192.168.1.128:8080/api";
  // final _apiUrl = "http://127.0.0.1:8080/api";

  Future<http.Response> _post(
      {required String endpoint, Map<String, dynamic>? body}) async {
    final encoded = json.encode(body);
    return await http.post(
      Uri.parse("$_apiUrl/$endpoint"),
      body: encoded,
      headers: {"Content-Type": "application/json"},
    );
  }

  @override
  Future<Result<List<Product>, String>> allProducts() async {
    final res = await http
        .get(
          Uri.parse("$_apiUrl/products/all"),
        )
        .then((res) => json.decode(res.body));
    if (res["ok"]) {
      return Ok((res["products"] as List<dynamic>)
          .map(((product) => Product.fromJson(product)))
          .toList());
    } else {
      return Err(res["msg"]);
    }
  }

  @override
  Future<Result<Null, String>> register(
    String name,
    String email,
    String password,
  ) async {
    final res = await _post(
      endpoint: "users/register",
      body: {"name": name, "email": email, "password": password},
    ).then((res) => json.decode(res.body));

    if (res["ok"]) {
      return Ok(null);
    } else {
      return Err(res["msg"]);
    }
  }

  @override
  Future<Result<String, String>> login(
    String email,
    String password,
  ) async {
    final res = await _post(
      endpoint: "sessions/login",
      body: {"email": email, "password": password},
    ).then((res) => json.decode(res.body));

    if (res["ok"]) {
      return Ok(res["token"]);
    } else {
      return Err(res["msg"]);
    }
  }

  @override
  Future<Result<Null, String>> logout(String token) async {
    final res = await _post(
      endpoint: "sessions/logout",
    ).then((res) => json.decode(res.body));

    if (res["ok"]) {
      return Ok(null);
    } else {
      return Err(res["msg"]);
    }
  }

  @override
  Future<Result<User, String>> sessionUser(String token) async {
    ("sending request fr with token $token");
    final res = await http.get(
      Uri.parse("$_apiUrl/sessions/user"),
      headers: {"Session-Token": token},
    ).then((res) => json.decode(res.body));
    if (res["ok"]) {
      return Ok(User.fromJson(res["user"]));
    } else {
      return Err(res["msg"]);
    }
  }

  @override
  Future<Result<Null, String>> purchaseCart(
      String token, List<CartItem> cartItems) async {
    final items = json.encode({
      "items": cartItems
          .map((cartItem) =>
              {"product_id": cartItem.product.id, "amount": cartItem.amount})
          .toList()
    });
    print(items);
    final res = await http
        .post(Uri.parse("$_apiUrl/carts/purchase"),
            headers: {
              "Content-Type": "application/json",
              "Session-Token": token
            },
            body: json.encode({
              "items": cartItems
                  .map((cartItem) => {
                        "product_id": cartItem.product.id,
                        "amount": cartItem.amount
                      })
                  .toList()
            }))
        .then((res) => json.decode(res.body));

    if (res["ok"]) {
      return const Ok(null);
    } else {
      return Err(res["msg"]);
    }
  }

  @override
  Future<Result<Null, String>> addBalance(String token) async {
    print("$_apiUrl/api/users/balance/add");
    final res = await http.post(
      Uri.parse("$_apiUrl/users/balance/add"),
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Session-Token": token
      },
    ).then((res) => json.decode(res.body));

    if (res["ok"]) {
      return Ok(null);
    } else {
      return Err(res["msg"]);
    }
  }
}
