import 'package:mobile/results.dart';

class User {
  final int id;
  final String email;
  final String name;

  // balance is in øre
  int balanceInDkkCents;

  User({
    required this.id,
    required this.email,
    required this.name,
    required this.balanceInDkkCents,
  });

  User.fromJson(Map<String, dynamic> json)
      : email = json["email"],
        id = json["id"],
        name = json["name"],
        balanceInDkkCents = json["balance_dkk_cent"];

  void addBalanceFounds(int amount) {
    balanceInDkkCents += amount;
  }

  Result<int, String> pay(int amount) {
    if (balanceInDkkCents < amount) {
      return Err("User can not afford paying amount $amount");
    }
    balanceInDkkCents -= amount;
    return Ok(balanceInDkkCents);
  }
}
