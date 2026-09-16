import 'package:flutter/material.dart';

/// 高对比、大字号取件码展示（首页核心视觉元素）。
class PickupCodeText extends StatelessWidget {
  const PickupCodeText(
    this.code, {
    super.key,
    this.size = 40,
    this.color,
  });

  final String code;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final textColor = color ?? Theme.of(context).colorScheme.primary;
    return Text(
      code,
      style: TextStyle(
        fontSize: size,
        fontWeight: FontWeight.w800,
        letterSpacing: 2,
        color: textColor,
        fontFamily: 'monospace',
      ),
    );
  }
}
