import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';

void main() {
  // 捕获框架层异常，避免直接暴露底层错误给用户。
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    // 技术错误记录到日志（此处保留简单打印，生产可替换为日志系统）。
    debugPrint('FlutterError: ${details.exception}');
  };

  runApp(
    const ProviderScope(
      child: PickCodeApp(),
    ),
  );
}
