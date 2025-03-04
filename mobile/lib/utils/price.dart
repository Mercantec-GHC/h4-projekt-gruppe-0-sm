import 'package:intl/intl.dart';

String formatDkkCents(int priceInDkkCents) {
  final formatter = NumberFormat("###,##0.00", "da_DK");
  return "${formatter.format(priceInDkkCents / 100.0)} kr";
}
