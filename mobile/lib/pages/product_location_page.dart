import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:mobile/models/coordinate.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/repos/location_image.dart';
import 'package:provider/provider.dart';

class ProductLocationPage extends StatelessWidget {
  final Product product;
  const ProductLocationPage({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        body: SafeArea(
      child: Column(
        children: [
          Row(
            children: [
              const BackButton(),
              Text(product.name),
            ],
          ),
          Consumer<LocationImageController>(
              builder: (context, locationImage, child) {
            if (locationImage.image == null) {
              return const CircularProgressIndicator(
                color: Colors.blue,
              );
            }
            if (product.location == null) {
              return Text("Lokation af ${product.name} kunne ikke findes");
            }
            return LayoutBuilder(
              builder: (context, constraints) {
                double parentWidth = constraints.maxWidth;

                final image = locationImage.image!;
                double imageWidth = image.width.toDouble();
                double imageHeight = image.height.toDouble();
                double scale = (parentWidth / imageWidth).clamp(0.0, 1.0);

                return CustomPaint(
                  size: Size(imageWidth * scale, imageHeight * scale),
                  painter: LocationImagePainter(
                      image: locationImage.image!,
                      location: product.location!,
                      scale: scale),
                );
              },
            );
          })
        ],
      ),
    ));
  }
}

class LocationImagePainter extends CustomPainter {
  final ui.Image image;
  final Coordinate location;
  final double scale;

  LocationImagePainter(
      {required this.image, required this.location, required this.scale});

  @override
  void paint(Canvas canvas, Size size) {
    Paint paint = Paint();

    canvas.scale(scale, scale);

    canvas.drawImage(image, const Offset(0, 0), paint);

    Paint circlePaint = Paint();
    circlePaint.color = Colors.red;

    canvas.drawCircle(Offset(location.x, location.y), 50, circlePaint);
  }

  @override
  bool shouldRepaint(covariant LocationImagePainter oldDelegate) {
    return oldDelegate.image != image || oldDelegate.scale != scale;
  }
}
