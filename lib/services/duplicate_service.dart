import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/enums.dart';
import '../models/package_input.dart';
import '../models/package_model.dart';
import '../repositories/package_repository.dart';

/// 自动去重服务（第 47/48 节）。
///
/// 优先使用 (快递单号 + 账号)，其次 (快递单号)，再次 (快递公司 + 取件码 + 驿站 + 账号)。
/// 仍无法判断时不自动合并，交由用户确认。
class DuplicateService {
  DuplicateService(this._repo);

  final PackageRepository _repo;

  Future<PackageModel?> findExisting(
    PackageInput input, {
    required String accountId,
    String? stationId,
  }) async {
    final all = await _repo.getAll();

    // 1. tracking_number + account_id
    if (input.trackingNumber != null && input.trackingNumber!.isNotEmpty) {
      final byBoth = all.where((p) =>
          p.trackingNumber == input.trackingNumber && p.accountId == accountId);
      if (byBoth.isNotEmpty) return byBoth.first;

      // 2. tracking_number
      final byTrack =
          all.where((p) => p.trackingNumber == input.trackingNumber);
      if (byTrack.isNotEmpty) return byTrack.first;
    }

    // 3. courier_company + pickup_code + station_id + account_id
    if (input.courierCompany != null &&
        input.pickupCode != null &&
        stationId != null) {
      final byComposite = all.where((p) =>
          p.courierCompany == input.courierCompany &&
          p.pickupCode == input.pickupCode &&
          p.stationId == stationId &&
          p.accountId == accountId);
      if (byComposite.isNotEmpty) return byComposite.first;
    }

    return null;
  }
}

final duplicateServiceProvider = Provider<DuplicateService>(
    (ref) => DuplicateService(ref.watch(packageRepositoryProvider)));
