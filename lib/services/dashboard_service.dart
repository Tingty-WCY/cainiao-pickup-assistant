import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/dashboard_summary.dart';
import '../repositories/package_repository.dart';

/// 仪表盘/首页聚合服务。
class DashboardService {
  DashboardService(this._repo);

  final PackageRepository _repo;

  Stream<DashboardSummary> watchSummary() =>
      _repo.watchPending().map((pending) => DashboardSummary(
            totalPending: pending.length,
            pending: pending,
          ));
}

final dashboardServiceProvider = Provider<DashboardService>(
    (ref) => DashboardService(ref.watch(packageRepositoryProvider)));
