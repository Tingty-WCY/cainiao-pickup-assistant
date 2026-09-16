import 'package_view.dart';

/// 首页汇总数据。
class DashboardSummary {
  const DashboardSummary({
    required this.totalPending,
    required this.pending,
  });

  final int totalPending;
  final List<PackageView> pending;

  /// 按驿站分组（未知驿站的归到 null 组）。
  Map<String?, List<PackageView>> groupByStation() {
    final map = <String?, List<PackageView>>{};
    for (final p in pending) {
      final key = p.station?.id;
      map.putIfAbsent(key, () => []).add(p);
    }
    return map;
  }
}
