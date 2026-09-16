import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../widgets/pickup_code_text.dart';

/// 取件模式（第 28~30 节）：大字体、高对比、少操作、支持复制与连续标记已取。
class PickupModePage extends ConsumerWidget {
  const PickupModePage({
    super.key,
    required this.stationId,
    required this.stationName,
  });

  final String stationId;
  final String stationName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final packages = ref.watch(stationPackagesProvider(stationId));

    final pending = packages.whenOrNull(data: (list) => list) ?? [];

    Future<void> copyAll() async {
      final codes = pending
          .where((v) => v.pkg.pickupCode != null && v.pkg.pickupCode!.isNotEmpty)
          .map((v) => v.pkg.pickupCode!)
          .toList();
      if (codes.isEmpty) return;
      await Clipboard.setData(ClipboardData(text: codes.join('\n')));
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('已复制 ${codes.length} 个取件码')));
      }
    }

    Future<void> markAll() async {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('确认取件'),
          content: Text('将当前驿站的 ${pending.length} 个快递全部标记为已取？'),
          actions: [
            TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('取消')),
            FilledButton(
                onPressed: () => Navigator.of(ctx).pop(true),
                child: const Text('确认')),
          ],
        ),
      );
      if (confirm == true) {
        for (final v in pending) {
          await ref.read(packageServiceProvider).markPickedUp(v.pkg.id);
        }
        if (context.mounted) Navigator.of(context).pop();
      }
    }

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(stationName, style: const TextStyle(color: Colors.white)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('完成', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: packages.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: Colors.white)),
        error: (e, _) => Center(
            child: Text('加载失败：$e', style: const TextStyle(color: Colors.white))),
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Text('该驿站没有待取快递',
                  style: TextStyle(color: Colors.white, fontSize: 18)),
            );
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              ...list.map((view) => Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1A1A1A),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: [
                        PickupCodeText(
                          view.pkg.pickupCode ?? '—',
                          size: 44,
                          color: Colors.white,
                        ),
                        const SizedBox(height: 8),
                        Text(view.pkg.courierCompany,
                            style: const TextStyle(
                                color: Colors.white70, fontSize: 16)),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Colors.white38),
                            ),
                            onPressed: () =>
                                ref.read(packageServiceProvider).markPickedUp(view.pkg.id),
                            child: const Text('标记已取'),
                          ),
                        ),
                      ],
                    ),
                  )),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: copyAll,
                      child: const Text('全部复制'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: markAll,
                      child: const Text('全部取完'),
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}
