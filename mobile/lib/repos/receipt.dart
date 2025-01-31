import 'package:flutter/material.dart';
import 'package:mobile/repos/product.dart';

class ReceiptRepo extends ChangeNotifier {
  final List<Receipt> receipts = [
    Receipt(
        id: 0,
        date: DateTime.fromMillisecondsSinceEpoch(1730031200000),
        receiptItems: [
          ReceiptItem(
              product: Product(
                  id: 1,
                  name: "Letmælk",
                  price: 13,
                  description: "Konventionel minimælk med fedtprocent på 0,4%"),
              amount: 1),
          ReceiptItem(
              product: Product(
                  id: 0,
                  name: "Minimælk",
                  price: 12,
                  description: "Konventionel minimælk med fedtprocent på 0,4%"),
              amount: 3),
        ]),
    Receipt(id: 1, date: DateTime.now(), receiptItems: [
      ReceiptItem(
          product: Product(
              id: 1,
              name: "Letmælk",
              price: 13,
              description: "Konventionel minimælk med fedtprocent på 0,4%"),
          amount: 3),
      ReceiptItem(
          product: Product(
              id: 0,
              name: "Minimælk",
              price: 12,
              description: "Konventionel minimælk med fedtprocent på 0,4%"),
          amount: 1),
    ])
  ];

  List<Receipt> allReceipts() {
    return receipts;
  }

  Receipt? receiptWithId(int id) {
    for (var i = 0; i < receipts.length; i++) {
      if (receipts[i].id == id) {
        return receipts[i];
      }
    }
    return null;
  }
}

class Receipt {
  final int id;
  final DateTime date;
  final List<ReceiptItem> receiptItems;

  Receipt({required this.date, required this.receiptItems, required this.id});

  ReceiptItem? withProductId(int productId) {
    for (var i = 0; i < receiptItems.length; i++) {
      if (receiptItems[i].product.id == productId) {
        return receiptItems[i];
      }
    }
    return null;
  }

  int totalPrice() {
    var result = 0;
    for (var i = 0; i < receiptItems.length; i++) {
      result += receiptItems[i].totalPrice();
    }
    return result;
  }

  String dateFormatted() {
    return "${date.day}-${date.month}-${date.year}";
  }
}

class ReceiptItem {
  final Product product;
  final int amount;
  ReceiptItem({required this.product, required this.amount});

  int totalPrice() {
    return product.price * amount;
  }
}
