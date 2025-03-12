import 'package:mobile/models/coordinate.dart';
import 'package:mobile/models/product.dart';
import 'package:mobile/server/server.dart';

class MockServer implements Server {
  @override
  Future<Response<List<Product>>> allProducts() async {
    var nextId = 0;
    return Success(data: <Product>[
      Product(
          id: nextId++,
          name: "Minimælk",
          priceInDkkCents: 1200,
          description: "Konventionel minimælk med fedtprocent på 0,4%"),
      Product(
          id: nextId++,
          name: "Letmælk",
          priceInDkkCents: 1300,
          description: "Konventionel letmælk med fedtprocent på 1,5%",
          location: Coordinate(x: 1800, y: 100)),
      Product(
          id: nextId++,
          name: "Frilands Øko Supermælk",
          priceInDkkCents: 2000,
          description:
              "Økologisk mælk af frilandskøer med fedtprocent på 3,5%. Ikke homogeniseret eller pasteuriseret. Skaber store muskler og styrker knoglerne 💪"),
      Product(
          id: nextId++,
          name: "Øko Gulerødder 1 kg",
          priceInDkkCents: 1000,
          description: ""),
      Product(
          id: nextId++,
          name: "Øko Agurk",
          priceInDkkCents: 1000,
          description: ""),
      Product(
          id: nextId++,
          name: "Æbler 1 kg",
          priceInDkkCents: 1000,
          description: ""),
      Product(
          id: nextId++,
          name: "Basmati Ris",
          priceInDkkCents: 2000,
          description: ""),
      Product(
          id: nextId++,
          name: "Haribo Mix",
          priceInDkkCents: 3000,
          description: ""),
      Product(
          id: nextId++, name: "Smør", priceInDkkCents: 3000, description: ""),
      Product(
          id: nextId++,
          name: "Harboe Cola",
          priceInDkkCents: 500,
          description: ""),
      Product(
          id: nextId++,
          barcode: "5060337502900",
          name: "Monster Energi Drik",
          priceInDkkCents: 1500,
          description: ""),
      Product(
          id: nextId++,
          barcode: "5712870659220",
          name: "Amper Energi Drik",
          priceInDkkCents: 750,
          description: ""),
      Product(
          id: nextId++,
          barcode: "5710326001937",
          name: "Danskvand Med Brus",
          priceInDkkCents: 500,
          description: "Med smag a blåbær"),
      Product(
          id: nextId++,
          name: "Spaghetti",
          priceInDkkCents: 1000,
          description: ""),
      Product(
          id: nextId++,
          name: "Rød Cecil",
          priceInDkkCents: 6000,
          description: ""),
      Product(
          id: nextId++,
          name: "Jägermeister 750 ml",
          priceInDkkCents: 12000,
          description: ""),
      Product(
          id: nextId++,
          barcode: "5711953068881",
          name: "Protein Chokoladedrik",
          priceInDkkCents: 1500,
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
  Future<Response<Null>> login(
    String name,
    String email,
    String password,
  ) async {
    return Success(data: null);
  }
}
