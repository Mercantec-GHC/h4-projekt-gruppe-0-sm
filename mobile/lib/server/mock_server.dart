import 'package:mobile/models/cart_item.dart';
import 'package:mobile/models/coordinate.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/models/user.dart';
import 'package:mobile/server/server.dart';

class MockServer implements Server {
  @override
  Future<Response<List<Product>>> allProducts() async {
    var nextId = 0;
    return Success(data: <Product>[
      Product(
          id: nextId++,
          name: "Minimælk",
          priceDkkCent: 1200,
          description: "Konventionel minimælk med fedtprocent på 0,4%"),
      Product(
          id: nextId++,
          name: "Letmælk",
          priceDkkCent: 1300,
          description: "Konventionel letmælk med fedtprocent på 1,5%",
          location: Coordinate(x: 1800, y: 100)),
      Product(
          id: nextId++,
          name: "Frilands Øko Supermælk",
          priceDkkCent: 2000,
          description:
              "Økologisk mælk af frilandskøer med fedtprocent på 3,5%. Ikke homogeniseret eller pasteuriseret. Skaber store muskler og styrker knoglerne 💪"),
      Product(
          id: nextId++,
          name: "Øko Gulerødder 1 kg",
          priceDkkCent: 1000,
          description: ""),
      Product(
          id: nextId++, name: "Øko Agurk", priceDkkCent: 1000, description: ""),
      Product(
          id: nextId++,
          name: "Æbler 1 kg",
          priceDkkCent: 1000,
          description: ""),
      Product(
          id: nextId++,
          name: "Basmati Ris",
          priceDkkCent: 2000,
          description: ""),
      Product(
          id: nextId++,
          name: "Haribo Mix",
          priceDkkCent: 3000,
          description: ""),
      Product(id: nextId++, name: "Smør", priceDkkCent: 3000, description: ""),
      Product(
          id: nextId++,
          name: "Harboe Cola",
          priceDkkCent: 500,
          description: ""),
      Product(
          id: nextId++,
          barcode: "5060337502900",
          name: "Monster Energi Drik",
          priceDkkCent: 1500,
          description: ""),
      Product(
          id: nextId++,
          barcode: "5712870659220",
          name: "Amper Energi Drik",
          priceDkkCent: 750,
          description: ""),
      Product(
          id: nextId++,
          barcode: "5710326001937",
          name: "Danskvand Med Brus",
          priceDkkCent: 500,
          description: "Med smag a blåbær"),
      Product(
          id: nextId++, name: "Spaghetti", priceDkkCent: 1000, description: ""),
      Product(
          id: nextId++, name: "Rød Cecil", priceDkkCent: 6000, description: ""),
      Product(
          id: nextId++,
          name: "Jägermeister 750 ml",
          priceDkkCent: 12000,
          description: ""),
      Product(
          id: nextId++,
          barcode: "5711953068881",
          name: "Protein Chokoladedrik",
          priceDkkCent: 1500,
          description: "Arla's protein chokolade drik der giver store muskler"),
    ]);
  }

  @override
  Future<Response<Null>> register(
    String name,
    String email,
    String password,
  ) async {
    return Success(data: null);
  }

  @override
  Future<Response<String>> login(
    String email,
    String password,
  ) async {
    return Success(data: "asdsadasdsad");
  }

  @override
  Future<Response<Null>> logout(String token) async {
    return Success(data: null);
  }

  @override
  Future<Response<User>> sessionUser(String token) async {
    return Success(
        data: User(
            id: 0,
            email: "test@test.com",
            name: "testuser",
            balanceDkkCents: 10000));
  }

  @override
  Future<Response<Null>> purchaseCart(
      String token, List<CartItem> cartItems) async {
    return Success(data: null);
  }

  @override
  Future<Response<Null>> addBalance(String token) async {
    return Success(data: null);
  }
}
