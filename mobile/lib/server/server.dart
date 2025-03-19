import 'package:mobile/models/cart_item.dart';
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
}
