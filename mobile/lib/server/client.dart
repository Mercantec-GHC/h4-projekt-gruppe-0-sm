import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:mobile/models/product.dart';
import 'package:mobile/server/server.dart';

class BackendServer implements Server {
  final _apiUrl = "10.135.51.114:8080/api";

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
      return Error(message: res["message"]);
    } else {
      return Success(
          data: res.map(((product) => Product.fromJson(product))).toList());
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
      return Error(message: res["message"]);
    }
  }

  @override
  Future<Response<Null>> login(
    String name,
    String email,
    String password,
  ) async {
    final res = await _post(
      endpoint: "auth/login",
      body: {"email": email, "password": password},
    ).then((res) => json.decode(res.body));

    if (res["ok"]) {
      return Success(data: null);
    } else {
      return Error(message: res["message"]);
    }
  }
}
