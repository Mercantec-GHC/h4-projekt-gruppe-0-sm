import 'package:intl/intl.dart';

String formatDkkCents(int priceDkkCents) {
  final formatter = NumberFormat("###,##0.00", "da_DK");
  return "${formatter.format(priceDkkCents / 100.0)} kr";
}
