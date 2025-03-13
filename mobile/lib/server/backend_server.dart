import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:mobile/models/product.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/server/server.dart';

class BackendServer implements Server {
  final _apiUrl = "http://192.168.1.128:8080/api";
  // final _apiUrl = "http://127.0.0.1:8080/api";

  Future<http.Response> _post(
      {required String endpoint, required Map<String, dynamic> body}) async {
    final encoded = json.encode(body);
    return await http.post(
      Uri.parse("$_apiUrl/$endpoint"),
      body: encoded,
      headers: {"Content-Type": "application/json"},
    );
  }

  @override
  Future<Response<List<Product>>> allProducts() async {
    final res = await http
        .get(
          Uri.parse("$_apiUrl/products/all"),
        )
        .then((res) => json.decode(res.body));
    if (res["ok"]) {
      return Success(
          data: (res["products"] as List<dynamic>)
              .map(((product) => Product.fromJson(product)))
              .toList());
    } else {
      return Error(message: res["msg"]);
    }
  }

  @override
  Future<Response<Null>> register(
    String name,
    String email,
    String password,
  ) async {
    final res = await _post(
      endpoint: "users/register",
      body: {"name": name, "email": email, "password": password},
    ).then((res) => json.decode(res.body));

    if (res["ok"]) {
      return Success(data: null);
    } else {
      return Error(message: res["msg"]);
    }
  }

  @override
  Future<Response<String>> login(
    String email,
    String password,
  ) async {
    final res = await _post(
      endpoint: "sessions/login",
      body: {"email": email, "password": password},
    ).then((res) => json.decode(res.body));

    if (res["ok"]) {
      return Success(data: res["token"]);
    } else {
      return Error(message: res["msg"]);
    }
  }

  @override
  Future<Response<Null>> logout(String token) async {
    final res = await _post(
      endpoint: "sessions/logout",
      body: {
        "token": token,
      },
    ).then((res) => json.decode(res.body));

    if (res["ok"]) {
      return Success(data: null);
    } else {
      return Error(message: res["msg"]);
    }
  }

  @override
  Future<Response<User>> sessionUser(String token) async {
    ("sending request fr with token $token");
    final res = await http.get(
      Uri.parse("$_apiUrl/sessions/user"),
      headers: {"Session-Token": token},
    ).then((res) => json.decode(res.body));
    if (res["ok"]) {
      return Success(data: User.fromJson(res["user"]));
    } else {
      return Error(message: res["msg"]);
    }
  }

  @override
  Future<Response<Null>> payForCart(String token) async {
    final res = await _post(
      endpoint: "cart/pay",
      body: {
        "token": token,
      },
    ).then((res) => json.decode(res.body));

    if (res["ok"]) {
      return Success(data: null);
    } else {
      return Error(message: res["msg"]);
    }
  }
}
