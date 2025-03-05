import 'package:mobile/models/coordinate.dart';

class Product {
  final int id;
  final String name;
  final String description;
  final int priceInDkkCent;
  final Coordinate? location;
  final String? barcode;

  Product({
    required this.id,
    required this.name,
    required this.priceInDkkCent,
    required this.description,
    this.location,
    this.barcode,
  });
}
