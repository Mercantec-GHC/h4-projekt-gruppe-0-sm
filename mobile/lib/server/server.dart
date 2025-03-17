import 'package:mobile/models/cart_item.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/models/user.dart';

abstract class Server {
  Future<Response<List<Product>>> allProducts();

  Future<Response<Null>> register(
    String name,
    String email,
    String password,
  );

  Future<Response<String>> login(
    String email,
    String password,
  );
  Future<Response<Null>> logout(String token);

  Future<Response<User>> sessionUser(String token);

  Future<Response<Null>> purchaseCart(String token, List<CartItem> cartItems);

  Future<Response<Null>> addBalance(String token);
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
