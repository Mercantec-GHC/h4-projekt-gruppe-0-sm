class Coordinate {
  final double x;
  final double y;

  Coordinate({required this.x, required this.y});

  Coordinate.fromJson(Map<String, dynamic> json)
      : x = json["x"],
        y = json["y"];
}
