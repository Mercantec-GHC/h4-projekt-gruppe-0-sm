import 'package:mobile/results.dart';

class User {
  final int id;
  final String email;
  final String name;

  // balance is in øre
  int balanceDkkCents;

  User({
    required this.id,
    required this.email,
    required this.name,
    required this.balanceDkkCents,
  });

  User.fromJson(Map<String, dynamic> json)
      : email = json["email"],
        id = json["id"],
        name = json["name"],
        balanceDkkCents = json["balance_dkk_cent"];

  void addBalanceFounds(int amount) {
    balanceDkkCents += amount;
  }

  Result<int, String> pay(int amount) {
    if (balanceDkkCents < amount) {
      return Err("User can not afford paying amount $amount");
    }
    balanceDkkCents -= amount;
    return Ok(balanceDkkCents);
  }
}
