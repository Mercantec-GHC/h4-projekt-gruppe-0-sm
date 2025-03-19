import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/controllers/receipt_header.dart';
import 'package:mobile/controllers/session.dart';
import 'package:mobile/pages/dashboard.dart';
import 'package:mobile/pages/log_in_page.dart';
import 'package:mobile/controllers/add_to_cart_state.dart';
import 'package:mobile/controllers/cart.dart';
import 'package:mobile/controllers/location_image.dart';
import 'package:mobile/controllers/paying_state.dart';
import 'package:mobile/controllers/product.dart';
import 'package:mobile/controllers/receipt.dart';
import 'package:mobile/controllers/users.dart';
import 'package:mobile/results.dart';
import 'package:mobile/server/backend_server.dart';
import 'package:mobile/server/server.dart';
import 'package:provider/provider.dart';
import 'package:mobile/controllers/routing.dart';

void main() {
  final server = BackendServer();
  final usersController = UsersController(server: server);
  final sessionController = SessionController(server: server);

  sessionController.loadCachedUser();

  runApp(MyApp(
    usersController: usersController,
    sessionController: sessionController,
    server: server,
  ));
}

class MyApp extends StatelessWidget {
  final UsersController usersController;
  final SessionController sessionController;

  final Server server;

  const MyApp(
      {super.key,
      required this.usersController,
      required this.sessionController,
      required this.server});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
            create: (_) => SessionProvider(controller: sessionController)),
        ChangeNotifierProvider(
            create: (_) => CurrentUserProvider(controller: sessionController)),
        ChangeNotifierProvider(create: (_) => RoutingController()),
        ChangeNotifierProvider(
            create: (_) => ProductController(server: server)),
        ChangeNotifierProvider(
            create: (_) => CartControllerCache(
                server: server, sessionController: sessionController)),
        Provider(
            create: (_) => ReceiptController(
                server: server, sessionController: sessionController)),
        ChangeNotifierProvider(
            create: (_) => ReceiptHeaderController(
                server: server, sessionController: sessionController)),
        ChangeNotifierProvider(create: (_) => PayingStateController()),
        ChangeNotifierProvider(create: (_) => AddToCartStateController()),
        ChangeNotifierProvider(create: (_) => LocationImageController()),
        Provider(create: (_) => usersController),
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
          home: Consumer2<SessionProvider, CurrentUserProvider>(
            builder: (_, provider1, provider2, ___) {
              if (provider1.controller.hasUser) {
                return Dashboard();
              }
              return FutureBuilder(
                  future: provider1.controller.loadCachedUser(),
                  builder: (_, snapshot) {
                    final error = snapshot.error;
                    if (error != null) {
                      throw error;
                    }
                    if (snapshot.data != null &&
                        snapshot.data is Err<Null, Null>) {
                      return const LoginPage();
                    }
                    return const Scaffold(body: CircularProgressIndicator());
                  });
            },
          )),
    );
  }
}
