import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../database/app_database.dart';
import '../database/database_provider.dart';
import '../models/enums.dart';
import '../models/station_model.dart';

/// 驿站仓储（Stations 表 ↔ StationModel）。
class StationRepository {
  StationRepository(this._db);

  final AppDatabase _db;

  StationModel _toModel(Station s) => StationModel(
        id: s.id,
        name: s.name,
        type: StationTypeX.fromName(s.type),
        address: s.address,
        phone: s.phone,
        latitude: s.latitude,
        longitude: s.longitude,
        createdAt: TimeUtils.parse(s.createdAt) ?? DateTime.now(),
        updatedAt: TimeUtils.parse(s.updatedAt) ?? DateTime.now(),
      );

  Stream<List<StationModel>> watchAll() =>
      _db.select(_db.stations).watch().map((rows) => rows.map(_toModel).toList());

  Future<StationModel?> getById(String id) async {
    final row = await (_db.select(_db.stations)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();
    return row == null ? null : _toModel(row);
  }

  /// 按名称查找（用于导入时自动关联驿站）。
  Future<StationModel?> findByName(String name) async {
    final row = await (_db.select(_db.stations)
          ..where((t) => t.name.equals(name)))
        .getSingleOrNull();
    return row == null ? null : _toModel(row);
  }

  Future<void> create(StationModel s) async {
    await _db.into(_db.stations).insert(
          StationsCompanion.insert(
            id: Value(s.id),
            name: Value(s.name),
            type: Value(s.type.name),
            address: Value(s.address),
            phone: Value(s.phone),
            latitude: Value(s.latitude),
            longitude: Value(s.longitude),
            createdAt: Value(TimeUtils.toIso(s.createdAt)),
            updatedAt: Value(TimeUtils.toIso(s.updatedAt)),
          ),
        );
  }

  Future<void> update(StationModel s) async {
    await (_db.update(_db.stations)..where((t) => t.id.equals(s.id))).write(
      StationsCompanion(
        name: Value(s.name),
        type: Value(s.type.name),
        address: Value(s.address),
        phone: Value(s.phone),
        latitude: Value(s.latitude),
        longitude: Value(s.longitude),
        updatedAt: Value(TimeUtils.toIso(s.updatedAt)),
      ),
    );
  }

  Future<void> delete(String id) async {
    await (_db.delete(_db.stations)..where((t) => t.id.equals(id))).go();
  }
}

final stationRepositoryProvider = Provider<StationRepository>((ref) =>
    StationRepository(ref.watch(appDatabaseProvider)));
