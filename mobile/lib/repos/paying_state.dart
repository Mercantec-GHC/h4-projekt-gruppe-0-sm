import 'package:flutter/material.dart';

class PayingStateRepo extends ChangeNotifier {
  PayingState state = PayingState.unset;

  void next() {
    state = switch (state) {
      PayingState.unset => PayingState.loading,
      PayingState.loading => PayingState.done,
      PayingState.done => PayingState.done,
    };
    notifyListeners();
  }

  void reset() {
    state = PayingState.unset;
    notifyListeners();
  }
}

enum PayingState {
  unset,
  loading,
  done,
}
