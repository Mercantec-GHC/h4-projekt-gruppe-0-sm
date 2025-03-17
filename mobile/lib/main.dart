import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/controllers/user.dart';
import 'package:mobile/pages/dashboard.dart';
import 'package:mobile/pages/log_in_page.dart';
import 'package:mobile/controllers/add_to_cart_state.dart';
import 'package:mobile/controllers/cart.dart';
import 'package:mobile/controllers/location_image.dart';
import 'package:mobile/controllers/paying_state.dart';
import 'package:mobile/controllers/product.dart';
import 'package:mobile/controllers/receipt.dart';
import 'package:mobile/controllers/users.dart';
import 'package:mobile/server/backend_server.dart';
import 'package:mobile/server/server.dart';
import 'package:provider/provider.dart';
import 'package:mobile/controllers/routing.dart';

void main() {
  final server = BackendServer();
  final users = UsersController(server: server);

  final user = UserController(server: server);
  user.loadUser().ignore();

  runApp(MyApp(
    users: users,
    server: server,
  ));
}

class MyApp extends StatelessWidget {
  final UsersController users;

  final Server server;

  const MyApp({super.key, required this.users, required this.server});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => UserController(server: server)),
        ChangeNotifierProvider(create: (_) => RoutingController()),
        ChangeNotifierProvider(
            create: (_) => ProductController(server: server)),
        ChangeNotifierProvider(
            create: (_) => CartControllerCache(server: server)),
        ChangeNotifierProvider(create: (_) => ReceiptController()),
        ChangeNotifierProvider(create: (_) => PayingStateController()),
        ChangeNotifierProvider(create: (_) => AddToCartStateController()),
        ChangeNotifierProvider(create: (_) => LocationImageController()),
        Provider(create: (_) => users),
      ],
      child: MaterialApp(
          title: 'Fresh Plaza',
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(
                seedColor: const Color.fromARGB(255, 149, 92, 255)),
            scaffoldBackgroundColor: const Color(0xFFFAFAFF),
            textTheme:
                GoogleFonts.merriweatherTextTheme(Theme.of(context).textTheme),
            useMaterial3: true,
          ),
          home: Consumer<UserController>(
            builder: (_, sessionController, __) {
              if (sessionController.sessionToken is String) {
                return Dashboard();
              }
              return const LogInPage();
            },
          )),
    );
  }
}
