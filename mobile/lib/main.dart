import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/pages/log_in_page.dart';
import 'package:mobile/repos/add_to_cart_state.dart';
import 'package:mobile/repos/cart.dart';
import 'package:mobile/repos/location_image.dart';
import 'package:mobile/repos/paying_state.dart';
import 'package:mobile/repos/product.dart';
import 'package:mobile/repos/receipt.dart';
import 'package:mobile/repos/user.dart';
import 'package:provider/provider.dart';
import 'package:mobile/repos/routing.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  final apiUrl = "10.135.51.114:8080/api";
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => Routing()),
        ChangeNotifierProvider(create: (_) => ProductRepo()),
        ChangeNotifierProvider(create: (_) => CartRepo()),
        ChangeNotifierProvider(create: (_) => ReceiptRepo()),
        ChangeNotifierProvider(create: (_) => PayingStateRepo()),
        ChangeNotifierProvider(create: (_) => AddToCartStateRepo()),
        ChangeNotifierProvider(create: (_) => LocationImageRepo()),
        ChangeNotifierProvider(create: (_) => UsersRepo()),
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
        home: const LogInPage(),
      ),
    );
  }
}
