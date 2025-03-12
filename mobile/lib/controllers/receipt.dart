import 'package:flutter/material.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/controllers/cart.dart';

class ReceiptController extends ChangeNotifier {
  int nextId = 0;
  final List<Receipt> receipts = [];

  List<Receipt> allReceipts() {
    return receipts;
  }

  List<Receipt> sortedReceiptsByDate() {
    List<Receipt> clonedReceipts = [];
    for (var i = 0; i < receipts.length; i++) {
      clonedReceipts.add(receipts[i]);
    }
    clonedReceipts.sort((a, b) => b.date.compareTo(a.date));
    return clonedReceipts;
  }

  Receipt? receiptWithId(int id) {
    for (var i = 0; i < receipts.length; i++) {
      if (receipts[i].id == id) {
        return receipts[i];
      }
    }
    return null;
  }

  void createReceipt(List<CartItem> cartItems) {
    List<ReceiptItem> receiptItems = [];
    for (var i = 0; i < cartItems.length; i++) {
      final ReceiptItem receiptItem = ReceiptItem(
          amount: cartItems[i].amount, product: cartItems[i].product);
      receiptItems.add(receiptItem);
    }
    receipts.add(Receipt(
        date: DateTime.now(), receiptItems: receiptItems, id: nextId++));
    notifyListeners();
  }
}

class Receipt {
  final int id;
  final DateTime date;
  final List<ReceiptItem> receiptItems;

  Receipt({required this.date, required this.receiptItems, required this.id});

  List<ReceiptItem> allReceiptItems() {
    return receiptItems;
  }

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
    return product.priceInDkkCents * amount;
  }
}
