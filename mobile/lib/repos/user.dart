import 'package:flutter/material.dart';
import 'package:mobile/results.dart';

class UsersRepo extends ChangeNotifier {
  int nextId = 0;
  final List<User> users = [];

  UsersRepo() {
    addTestUsers();
  }

  Result<User, String> getUserById(int id) {
    for (var i = 0; i < users.length; i++) {
      if (users[i].id == id) {
        return Ok(users[i]);
      }
    }
    return Err("User with id $id doesn't exist");
  }

  Result<User, String> getUserByMail(String mail) {
    for (var i = 0; i < users.length; i++) {
      if (users[i].mail == mail) {
        return Ok(users[i]);
      }
    }
    return Err("User with mail $mail doesn't exist");
  }

  Result<User, String> addUser(String name, String mail, String password) {
    if (getUserByMail(mail) is Ok) {
      return Err("User with mail $mail already exists");
    }

    final user = User(
        id: nextId++,
        name: name,
        mail: mail,
        password: password,
        balanceInDkkCents: 0);
    users.add(user);

    return Ok(user);
  }

  Result<User, String> login(String mail, String password) {
    for (var i = 0; i < users.length; i++) {
      if (users[i].mail != mail) {
        continue;
      }
      if (users[i].password == password) {
        return Ok(users[i]);
      }
      return Err("Wrong password for user with mail $mail");
    }
    return Err("User with mail $mail doesn't exist");
  }

  Result<int, String> pay(int userId, int amount) {
    final user = getUserById(userId);
    if (user is Ok) {
      return (user as User).pay(amount);
    }
    return Err("User with id $userId doesn't exist");
  }

  void addTestUsers() {
    users
      ..add(User(
          id: nextId++,
          mail: "test@test.com",
          name: "test",
          password: "test",
          balanceInDkkCents: 10000))
      ..add(User(
          id: nextId++,
          mail: "",
          name: "",
          password: "",
          balanceInDkkCents: 100000));
  }
}

class User {
  final int id;
  final String mail;
  final String name;
  final String password;

  // balance is in øre
  int balanceInDkkCents;

  User(
      {required this.id,
      required this.mail,
      required this.name,
      required this.password,
      required this.balanceInDkkCents});

  Result<int, String> pay(int amount) {
    if (balanceInDkkCents < amount) {
      return Err("User can not afford paying amount $amount");
    }
    balanceInDkkCents -= amount;
    return Ok(balanceInDkkCents);
  }
}
