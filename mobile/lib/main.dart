import 'package:flutter/material.dart';
import 'package:mobile/repos/cart.dart';
import 'package:mobile/repos/paying_state.dart';
import 'package:mobile/repos/product.dart';
import 'package:mobile/repos/receipt.dart';
import 'package:provider/provider.dart';
import 'pages/landing_page.dart';
import 'package:mobile/repos/bottom_navigation_bar.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => BottomNavigationBarRepo()),
        ChangeNotifierProvider(create: (_) => ProductRepo()),
        ChangeNotifierProvider(create: (_) => CartRepo()),
        ChangeNotifierProvider(create: (_) => ReceiptRepo()),
        ChangeNotifierProvider(create: (_) => PayingStateRepo()),
      ],
      child: MaterialApp(
        title: 'Fresh Plaza',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
          scaffoldBackgroundColor: const Color(0xFFDFDFDF),
          textTheme: const TextTheme(
            headlineLarge: TextStyle(color: Color(0xFF000000), fontSize: 64),
            bodyLarge: TextStyle(color: Color(0xFF000000), fontSize: 20),
            bodyMedium: TextStyle(color: Color(0xFF000000), fontSize: 16),
          ),
          useMaterial3: true,
        ),
        home: const LandingPage(),
      ),
    );
  }
}
