import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/security/security.dart';
import '../core/utils/id.dart';
import '../core/utils/time.dart';
import '../models/enums.dart';
import '../models/station_model.dart';
import '../repositories/station_repository.dart';

/// 驿站业务服务。
class StationService {
  StationService(this._repo);

  final StationRepository _repo;

  Stream<List<StationModel>> watchAll() => _repo.watchAll();

  Future<StationModel> create({
    required String name,
    StationType type = StationType.other,
    String? address,
    String? phone,
  }) async {
    final now = TimeUtils.nowIso();
    final model = StationModel(
      id: IdUtils.newId(),
      name: SecurityPolicy.sanitize(name),
      type: type,
      address: address,
      phone: phone,
      createdAt: TimeUtils.parse(now)!,
      updatedAt: TimeUtils.parse(now)!,
    );
    await _repo.create(model);
    return model;
  }

  /// 导入时按名称查找，找不到则新建。
  Future<StationModel> findOrCreate(String name,
      [StationType type = StationType.other]) async {
    final existing = await _repo.findByName(name);
    if (existing != null) return existing;
    return create(name: name, type: type);
  }

  Future<void> update(StationModel station) =>
      _repo.update(station.copyWith(updatedAt: TimeUtils.parse(TimeUtils.nowIso())!));

  Future<void> delete(String id) => _repo.delete(id);
}

final stationServiceProvider = Provider<StationService>(
    (ref) => StationService(ref.watch(stationRepositoryProvider)));
