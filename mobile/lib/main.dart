import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/pages/dashboard.dart';
import 'package:mobile/pages/log_in_page.dart';
import 'package:mobile/controllers/add_to_cart_state.dart';
import 'package:mobile/controllers/cart.dart';
import 'package:mobile/controllers/location_image.dart';
import 'package:mobile/controllers/paying_state.dart';
import 'package:mobile/controllers/product.dart';
import 'package:mobile/controllers/receipt.dart';
import 'package:mobile/controllers/user.dart';
import 'package:mobile/server/backend_server.dart';
import 'package:provider/provider.dart';
import 'package:mobile/controllers/routing.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final server = BackendServer();
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => RoutingController()),
        ChangeNotifierProvider(
            create: (_) => ProductController(server: server)),
        ChangeNotifierProvider(create: (_) => CartController()),
        ChangeNotifierProvider(create: (_) => ReceiptController()),
        ChangeNotifierProvider(create: (_) => PayingStateController()),
        ChangeNotifierProvider(create: (_) => AddToCartStateController()),
        ChangeNotifierProvider(create: (_) => LocationImageController()),
        ChangeNotifierProvider(create: (_) => UsersController(server: server)),
        ChangeNotifierProvider(
            create: (_) => SessionController(server: server)),
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
          home: Consumer<SessionController>(
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
