import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override 
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        appBar: AppBar(
          title: const Text('Իմ առաջին ծրագիրը'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'Բարի գալուստ իմ էջ',
                style: TextStyle(fontSize: 24),
              ),
              const SizedBox(height: 30),
              ElevatedButton(
                onPressed: () async {
                  final url = Uri.parse(
                    'https://www.instagram.com/gospelsongs0/',
                  );

                  if (await canLaunchUrl(url)) {
                    await launchUrl(url);
                  }
                },
                child: const Text('Մուտք'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}