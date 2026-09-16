import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../../app/router.dart';
import '../../../models/enums.dart';
import '../../../models/package_view.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/package_card.dart';

/// 快递列表页：搜索 + 状态筛选。
class PackagesPage extends ConsumerStatefulWidget {
  const PackagesPage({super.key});

  @override
  ConsumerState<PackagesPage> createState() => _PackagesPageState();
}

class _PackagesPageState extends ConsumerState<PackagesPage> {
  final _tabs = const ['全部', '待取', '运输中', '已取', '异常'];
  int _tab = 0;
  final _query = TextEditingController();

  bool _matchTab(PackageView v) {
    switch (_tab) {
      case 1:
        return v.pkg.status.isPending;
      case 2:
        return v.pkg.status == PackageStatus.shipping;
      case 3:
        return v.pkg.status == PackageStatus.pickedUp;
      case 4:
        return v.pkg.status == PackageStatus.expired;
      default:
        return true;
    }
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final q = _query.text.trim();
    final list = q.isEmpty
        ? ref.watch(allPackagesProvider)
        : ref.watch(searchPackagesProvider(q));

    return Scaffold(
      appBar: AppBar(title: const Text('快递')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              controller: _query,
              decoration: InputDecoration(
                hintText: '搜索快递、取件码、驿站',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: const Color(0xFFEEF0F5),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _tabs.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) => ChoiceChip(
                label: Text(_tabs[i]),
                selected: _tab == i,
                onSelected: (_) => setState(() => _tab = i),
              ),
            ),
          ),
          Expanded(
            child: list.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('加载失败：$e')),
              data: (all) {
                final filtered = all.where(_matchTab).toList();
                if (filtered.isEmpty) {
                  return const EmptyState(
                    icon: Icons.inbox_outlined,
                    title: '没有匹配的快递',
                    subtitle: '换个关键词或筛选条件试试',
                  );
                }
                return ListView(
                  children: filtered
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
          ),
        ],
      ),
    );
  }
}
