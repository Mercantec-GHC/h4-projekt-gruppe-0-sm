import 'package:mobile/models/product.dart';

class CartItem {
  final Product product;
  int amount;

  CartItem({required this.product, required this.amount});

  static Map<String, dynamic> toJson(CartItem cartItem) {
    return {
      "product": Product.toJson(cartItem.product),
      "amount": cartItem.amount
    };
  }

  CartItem.fromJson(Map<String, dynamic> json)
      : product = Product.fromJson(json["product"]),
        amount = json["amount"];
}
