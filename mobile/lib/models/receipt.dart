class Receipt {
  final int id;
  final DateTime timestamp;
  final List<ReceiptItem> receiptItems;

  Receipt(
      {required this.timestamp, required this.receiptItems, required this.id});

  List<ReceiptItem> allReceiptItems() {
    return receiptItems;
  }

  ReceiptItem? withProductId(int productId) {
    for (var i = 0; i < receiptItems.length; i++) {
      if (receiptItems[i].productId == productId) {
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

  Receipt.fromJson(Map<String, dynamic> json)
      : id = json["receipt_id"],
        timestamp = DateTime.parse(json["timestamp"]),
        receiptItems = (json["products"] as List<dynamic>)
            .map(((receiptItem) => ReceiptItem.fromJson(receiptItem)))
            .toList();
}

class ReceiptItem {
  final int productId;
  final String name;
  final int priceDkkCent;
  final int amount;
  ReceiptItem(
      {required this.productId,
      required this.name,
      required this.priceDkkCent,
      required this.amount});

  int totalPrice() {
    return priceDkkCent * amount;
  }

  ReceiptItem.fromJson(Map<String, dynamic> json)
      : productId = json["product_id"],
        name = json["name"],
        priceDkkCent = json["price_dkk_cent"],
        amount = json["amount"];
}

class ReceiptHeader {
  final int id;
  final DateTime timestamp;
  final int totalDkkCent;

  ReceiptHeader(
      {required this.timestamp, required this.id, required this.totalDkkCent});

  ReceiptHeader.fromJson(Map<String, dynamic> json)
      : id = json["id"],
        totalDkkCent = json["total_dkk_cent"],
        timestamp = DateTime.parse(json["timestamp"]);
}
