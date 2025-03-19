import 'package:flutter/material.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/models/receipt.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';

class ReceiptHeaderController extends ChangeNotifier {
  List<ReceiptHeader> _receiptHeaders = [];

  final Server server;

  final SessionController sessionController;

  ReceiptHeaderController(
      {required this.server, required this.sessionController}) {
    fetchReceiptsFromServer();
  }

  Future<void> fetchReceiptsFromServer() async {
    final res = await sessionController.requestWithSession(
        (Server server, String token) => server.allReceipts(token));

    switch (res) {
      case Ok<List<ReceiptHeader>, String>(value: final receiptHeaders):
        _receiptHeaders = receiptHeaders;
      case Err<List<ReceiptHeader>, String>():
        break;
    }
    notifyListeners();
  }

  List<ReceiptHeader> receiptHeadersSortedByDate() {
    List<ReceiptHeader> clonedReceiptHeaders = [];
    for (var i = 0; i < _receiptHeaders.length; i++) {
      clonedReceiptHeaders.add(_receiptHeaders[i]);
    }
    clonedReceiptHeaders.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return clonedReceiptHeaders;
  }
}
