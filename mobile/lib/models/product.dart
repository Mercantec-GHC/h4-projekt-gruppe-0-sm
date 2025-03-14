import 'package:mobile/models/coordinate.dart';

class Product {
  final int id;
  final String name;
  final String description;
  final int priceDkkCent;
  final Coordinate? location;
  final String? barcode;

  Product({
    required this.id,
    required this.name,
    required this.priceDkkCent,
    required this.description,
    this.location,
    this.barcode,
  });

  static Map<String, dynamic> toJson(Product product) {
    return {
      "id": product.id,
      "name": product.name,
      "description": product.description,
      "price_dkk_cent": product.priceDkkCent,
      "location": product.location,
      "barcode": product.barcode,
    };
  }

  Product.fromJson(Map<String, dynamic> json)
      : id = json["id"],
        name = json["name"],
        description = json["description"],
        priceDkkCent = json["price_dkk_cent"],
        location = null,
        barcode = json["barcode"];
}
