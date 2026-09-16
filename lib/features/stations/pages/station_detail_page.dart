import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../../app/router.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/package_card.dart';
import '../../home/pages/pickup_mode_page.dart';

/// 驿站详情页（含进入取件模式）。
class StationDetailPage extends ConsumerWidget {
  const StationDetailPage({super.key, required this.stationId});

  final String stationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final station = ref.watch(stationByIdProvider(stationId));
    final packages = ref.watch(stationPackagesProvider(stationId));

    return Scaffold(
      appBar: AppBar(title: const Text('驿站详情')),
      body: station.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('加载失败：$e')),
        data: (s) {
          if (s == null) return const Center(child: Text('驿站不存在'));
          final pending = packages.whenOrNull(data: (l) => l) ?? [];
          return ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s.name,
                        style: const TextStyle(
                            fontSize: 22, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(s.type.label),
                    if (s.address != null) ...[
                      const SizedBox(height: 4),
                      Text('地址：${s.address}',
                          style:
                              const TextStyle(color: Color(0xFF8A8F99))),
                    ],
                    const SizedBox(height: 8),
                    Text('待取：${pending.length} 件',
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        icon: const Icon(Icons.rocket_launch_outlined),
                        label: const Text('进入取件模式'),
                        onPressed: pending.isEmpty
                            ? null
                            : () => Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => PickupModePage(
                                      stationId: s.id,
                                      stationName: s.name,
                                    ),
                                  ),
                                ),
                      ),
                    ),
                  ],
                ),
              ),
              packages.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text('加载失败：$e')),
                data: (list) {
                  if (list.isEmpty) {
                    return const EmptyState(
                      icon: Icons.local_shipping_outlined,
                      title: '该驿站暂无快递',
                      subtitle: '',
                    );
                  }
                  return Column(
                    children: list
                        .map((view) => PackageCard(
                              view: view,
                              onPickedUp: () => ref
                                  .read(packageServiceProvider)
                                  .markPickedUp(view.pkg.id),
                              onTap: () => context
                                  .go(AppRoutes.packageDetailPath(view.pkg.id)),
                            ))
                        .toList(),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}
