import 'package:mobile/controllers/session.dart';
import 'package:mobile/models/receipt.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/server.dart';

class ReceiptController {
  final Server server;
  final SessionController sessionController;

  ReceiptController({required this.server, required this.sessionController});

  Future<Result<Receipt, String>> receiptWithId(int id) async {
    return await sessionController.requestWithSession(
        (Server server, String token) => server.oneReceipt(token, id));
  }
}
