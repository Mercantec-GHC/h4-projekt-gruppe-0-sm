import 'package:flutter/material.dart';
import 'global_components.dart';

class ProductListItem extends StatelessWidget {
  final String name;
  final int price;
  final String imagePath;
  const ProductListItem(
      {super.key,
      required this.name,
      required this.price,
      required this.imagePath});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.all(10),
      height: 100,
      decoration: BoxDecoration(
          color: Color(0xFFFFFFFF),
          border: Border.all(),
          borderRadius: BorderRadius.all(Radius.circular(10))),
      child: ElevatedButton(
          style: ButtonStyle(
              backgroundColor: WidgetStateProperty.all(Colors.transparent),
              elevation: WidgetStateProperty.all(0),
              shape: WidgetStateProperty.all(RoundedRectangleBorder()),
              padding: WidgetStateProperty.all(EdgeInsets.zero),
              splashFactory: NoSplash.splashFactory),
          onPressed: () {},
          child: Expanded(
              child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                  padding: EdgeInsets.fromLTRB(10, 10, 0, 10),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        name,
                        style: TextStyle(fontSize: 24, color: Colors.black),
                      ),
                      Text(
                        "${price.toString()} kr",
                        style: TextStyle(fontSize: 16, color: Colors.black),
                      )
                    ],
                  )),
              ClipRRect(
                  borderRadius: BorderRadius.only(
                      topRight: Radius.circular(10),
                      bottomRight: Radius.circular(10)),
                  child:
                      Image(image: AssetImage(imagePath), fit: BoxFit.contain))
            ],
          ))),
    );
  }
}

class Dashboard extends StatelessWidget {
  const Dashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        body: Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Expanded(
          child: Column(children: [
            TextField(
                decoration: InputDecoration(
                    label: Text("Search"),
                    contentPadding: EdgeInsets.only(top: 20))),
            Expanded(
              child: ListView(
                children: [
                  ProductListItem(
                    name: "idk",
                    price: 12,
                    imagePath: "assets/boykisser.png",
                  ),
                  ProductListItem(
                    name: "idk",
                    price: 12,
                    imagePath: "assets/boykisser.png",
                  ),
                ],
              ),
            )
          ]),
        ),
      ],
    ));
  }
}
