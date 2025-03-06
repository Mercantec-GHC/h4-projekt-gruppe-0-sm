import 'package:mobile/models/coordinate.dart';

class Product {
  final int id;
  final String name;
  final String description;
  final int priceInDkkCents;
  final Coordinate? location;
  final String? barcode;

  Product({
    required this.id,
    required this.name,
    required this.priceInDkkCents,
    required this.description,
    this.location,
    this.barcode,
  });

  Product.fromJson(Map<String, dynamic> json)
      : id = json["id"],
        name = json["name"],
        description = json["description"],
        priceInDkkCents = json["priceInDkkCents"],
        location = null,
        barcode = null;
}
