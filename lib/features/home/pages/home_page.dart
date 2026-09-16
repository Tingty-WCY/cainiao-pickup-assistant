import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../../app/router.dart';
import '../../../models/dashboard_summary.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/package_card.dart';
import '../pages/pickup_mode_page.dart';

/// 首页：直接回答「几个待取 / 在哪 / 取件码多少」。按驿站分组。
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(dashboardProvider);

    Future<void> markPickedUp(String id) async {
      await ref.read(packageServiceProvider).markPickedUp(id);
    }

    void openPickupMode(String stationId, String stationName) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) =>
              PickupModePage(stationId: stationId, stationName: stationName),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('取件助手'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            tooltip: '搜索',
            onPressed: () => context.go(AppRoutes.packages),
          ),
          IconButton(
            icon: const Icon(Icons.rocket_launch_outlined),
            tooltip: '取件模式',
            onPressed: () {
              final groups = summary.asData?.value.groupByStation() ?? {};
              final firstKey = groups.keys.firstWhere(
                (k) => k != null,
                orElse: () => null,
              );
              if (firstKey == null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('暂无可取件快递')),
                );
                return;
              }
              final station = groups[firstKey]!.first.station;
              openPickupMode(firstKey, station?.name ?? '未指定驿站');
            },
          ),
        ],
      ),
      body: summary.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('加载失败：$e')),
        data: (data) => _Body(
          summary: data,
          onMarkPickedUp: markPickedUp,
          openPickupMode: openPickupMode,
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.summary,
    required this.onMarkPickedUp,
    required this.openPickupMode,
  });

  final DashboardSummary summary;
  final Future<void> Function(String id) onMarkPickedUp;
  final void Function(String stationId, String stationName) openPickupMode;

  @override
  Widget build(BuildContext context) {
    if (summary.totalPending == 0) {
      return EmptyState(
        icon: Icons.local_shipping_outlined,
        title: '目前没有待取快递',
        subtitle: '把物流信息粘贴到这里可以快速添加',
        actionLabel: '导入快递',
        onAction: () => context.go(AppRoutes.import),
      );
    }

    final groups = summary.groupByStation();
    final keys = groups.keys.toList()
      ..sort((a, b) {
        if (a == null) return 1;
        if (b == null) return -1;
        return 0;
      });

    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
          child: Text(
            '今天有 ${summary.totalPending} 个快递待取',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
        ),
        ...keys.map((key) {
          final items = groups[key]!;
          final name = items.first.station?.name ?? '未指定驿站';
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    const Icon(Icons.location_on,
                        size: 18, color: Color(0xFF2B6CFF)),
                    const SizedBox(width: 6),
                    Text(name,
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(width: 8),
                    Text('${items.length} 件',
                        style: const TextStyle(
                            fontSize: 13, color: Color(0xFF8A8F99))),
                    const Spacer(),
                    if (key != null)
                      TextButton(
                        onPressed: () => openPickupMode(key, name),
                        child: const Text('取件'),
                      ),
                  ],
                ),
              ),
              ...items.map((view) => PackageCard(
                    view: view,
                    onPickedUp: () => onMarkPickedUp(view.pkg.id),
                    onTap: () =>
                        context.go(AppRoutes.packageDetailPath(view.pkg.id)),
                  )),
            ],
          );
        }),
        const SizedBox(height: 16),
      ],
    );
  }
}
