import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/errors/app_exception.dart';
import '../core/utils/id.dart';
import '../core/utils/time.dart';
import '../models/enums.dart';
import '../models/package_input.dart';
import '../models/package_model.dart';
import '../repositories/package_repository.dart';
import '../services/duplicate_service.dart';
import '../services/station_service.dart';

/// 保存结果：区分新建与更新（去重命中）。
class PackageSaveResult {
  const PackageSaveResult({
    required this.id,
    required this.created,
    this.updated = false,
  });

  final String id;
  final bool created;
  final bool updated;
}

/// 快递业务服务（Normalizer + DuplicateService + Repository）。
class PackageService {
  PackageService(this._repo, this._duplicate, this._stations);

  final PackageRepository _repo;
  final DuplicateService _duplicate;
  final StationService _stations;

  /// 统一的保存入口：解析结果 → 去重 → 新建/更新。
  Future<PackageSaveResult> addFromInput(
    PackageInput input, {
    required String accountId,
  }) async {
    if (accountId.isEmpty) {
      throw const AppException('请先选择或添加账号');
    }

    // 解析驿站名称 → stationId（不存在则新建）。
    String? stationId;
    if (input.stationName != null && input.stationName!.isNotEmpty) {
      final station = await _stations.findOrCreate(input.stationName!);
      stationId = station.id;
    }

    // 去重判断。
    final existing = await _duplicate.findExisting(
      input,
      accountId: accountId,
      stationId: stationId,
    );

    final now = TimeUtils.parse(TimeUtils.nowIso())!;
    final courier = input.courierCompany ?? '未知快递';
    final status = input.status ?? PackageStatus.pendingPickup;

    if (existing != null) {
      // 命中：更新而非新建。若取件码变化，记录历史。
      final codeChanged =
          input.pickupCode != null && input.pickupCode != existing.pickupCode;
      final updated = existing.copyWith(
        stationId: stationId ?? existing.stationId,
        courierCompany: courier,
        trackingNumber: input.trackingNumber ?? existing.trackingNumber,
        pickupCode: input.pickupCode ?? existing.pickupCode,
        status: status == PackageStatus.unknown ? existing.status : status,
        arrivedAt: existing.arrivedAt ?? now,
        updatedAt: now,
      );
      await _repo.update(updated);
      if (codeChanged && input.pickupCode != null) {
        await _repo.changePickupCode(
          existing.id,
          existing.pickupCode ?? '',
          input.pickupCode!,
          input.source,
        );
      }
      return PackageSaveResult(id: existing.id, created: false, updated: true);
    }

    // 未命中：新建。
    final model = PackageModel(
      id: IdUtils.newId(),
      accountId: accountId,
      stationId: stationId,
      source: input.source,
      courierCompany: courier,
      trackingNumber: input.trackingNumber,
      pickupCode: input.pickupCode,
      status: status,
      arrivedAt: status.isPending ? now : null,
      pickedUpAt: null,
      remark: input.stationAddress,
      createdAt: now,
      updatedAt: now,
    );
    await _repo.create(model);
    return PackageSaveResult(id: model.id, created: true);
  }

  Future<void> markPickedUp(String id) =>
      _repo.markPickedUp(id, TimeUtils.parse(TimeUtils.nowIso())!);

  Future<void> changePickupCode(String id, String newCode, DataSource source) async {
    final existing = await _repo.getById(id);
    if (existing == null) return;
    final old = existing.pickupCode ?? '';
    if (old == newCode) return;
    await _repo.changePickupCode(id, old, newCode, source);
  }
}

final packageServiceProvider = Provider<PackageService>((ref) => PackageService(
      ref.watch(packageRepositoryProvider),
      ref.watch(duplicateServiceProvider),
      ref.watch(stationServiceProvider),
    ));
