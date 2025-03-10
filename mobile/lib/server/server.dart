import 'package:mobile/models/product.dart';

abstract class Server {
  Future<Response<List<Product>>> allProducts();

  Future<Response<Null>> register(
    String name,
    String email,
    String password,
  );

  Future<Response<Null>> login(
    String name,
    String email,
    String password,
  );
}

sealed class Response<Data> {}

class Success<Data> extends Response<Data> {
  Data data;
  Success({required this.data});
}

class Error<Data> extends Response<Data> {
  String message;
  Error({required this.message});
}
