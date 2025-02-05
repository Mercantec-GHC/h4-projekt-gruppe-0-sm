import 'dart:async';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class LocationImageRepo extends ChangeNotifier {
  ui.Image? image;

  Future<void> load() async {
    final ByteData data = await rootBundle.load('assets/floor_plan.png');
    final Uint8List list = data.buffer.asUint8List();

    final Completer<ui.Image> completer = Completer();
    ui.decodeImageFromList(list, (ui.Image img) {
      image = img;
      notifyListeners();
      completer.complete(img);
    });

    await completer.future;
  }
}
