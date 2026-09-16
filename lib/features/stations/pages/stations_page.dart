import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../../app/router.dart';
import '../../../core/utils/ui.dart';
import '../../../models/station_model.dart';
import '../../../widgets/empty_state.dart';

/// 驿站列表页。
class StationsPage extends ConsumerWidget {
  const StationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stations = ref.watch(stationsProvider);
    final packages = ref.watch(allPackagesProvider);

    final pendingCounts = <String, int>{};
    if (packages.hasValue) {
      for (final v in packages.value!) {
        if (v.pkg.isPending && v.station != null) {
          pendingCounts[v.station!.id] = (pendingCounts[v.station!.id] ?? 0) + 1;
        }
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('驿站')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddDialog(context, ref),
        child: const Icon(Icons.add),
      ),
      body: stations.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('加载失败：$e')),
        data: (list) {
          if (list.isEmpty) {
            return EmptyState(
              icon: Icons.location_on_outlined,
              title: '还没有添加驿站',
              subtitle: '导入快递时会自动创建驿站，也可以手动添加',
              actionLabel: '添加驿站',
              onAction: () => _showAddDialog(context, ref),
            );
          }
          return ListView.builder(
            itemCount: list.length,
            itemBuilder: (_, i) {
              final s = list[i];
              final count = pendingCounts[s.id] ?? 0;
              return _StationTile(
                station: s,
                pending: count,
                onTap: () =>
                    context.go(AppRoutes.stationDetailPath(s.id)),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _showAddDialog(BuildContext context, WidgetRef ref) async {
    final nameCtrl = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('添加驿站'),
        content: TextField(
          controller: nameCtrl,
          decoration: const InputDecoration(
            labelText: '驿站名称',
            hintText: '例如：XX大学菜鸟驿站',
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('取消')),
          FilledButton(
            onPressed: () async {
              final name = nameCtrl.text.trim();
              if (name.isNotEmpty) {
                await ref.read(stationServiceProvider).create(name: name);
              }
              if (ctx.mounted) Navigator.of(ctx).pop();
            },
            child: const Text('保存'),
          ),
        ],
      ),
    );
  }
}

class _StationTile extends StatelessWidget {
  const _StationTile({
    required this.station,
    required this.pending,
    required this.onTap,
  });

  final StationModel station;
  final int pending;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ListTile(
        leading: CircleAvatar(
          backgroundColor: stationTypeColor(station.type).withOpacity(0.15),
          child: Icon(Icons.location_on, color: stationTypeColor(station.type)),
        ),
        title: Text(station.name),
        subtitle: Text(station.type.label),
        trailing: pending > 0
            ? Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('待取 $pending',
                    style: const TextStyle(color: Colors.white, fontSize: 12)),
              )
            : const Text('无待取',
                style: TextStyle(color: Color(0xFF8A8F99))),
        onTap: onTap,
      );
}
