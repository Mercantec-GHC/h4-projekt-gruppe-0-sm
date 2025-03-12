import 'dart:async';

import 'package:flutter/material.dart';

class AddToCartStateController extends ChangeNotifier {
  int currentAmount = 0;
  Timer resetTimer = Timer(const Duration(), () {});

  void notify(Duration displayDuration) {
    resetTimer.cancel();
    currentAmount++;
    notifyListeners();
    resetTimer = Timer(displayDuration, () => currentAmount = 0);
  }
}
