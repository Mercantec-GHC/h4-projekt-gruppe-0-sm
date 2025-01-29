import 'package:flutter/material.dart';
import 'package:mobile/repos/product.dart';
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
        ChangeNotifierProvider(create: (_) => ProductRepo()),
        ChangeNotifierProvider(create: (_) => BottomNavigationBarRepo())
      ],
      child: MaterialApp(
        title: 'Fresh Plaza',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
          scaffoldBackgroundColor: const Color(0xECF6F0FF),
          useMaterial3: true,
        ),
        home: const MyHomePage(title: 'Fresh Plaza'),
      ),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: LandingPage(),
    );
  }
}
