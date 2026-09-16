import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../database/app_database.dart';
import '../database/database_provider.dart';
import '../models/account_model.dart';
import '../models/enums.dart';
import '../models/package_model.dart';
import '../models/package_view.dart';
import '../models/station_model.dart';
import 'account_repository.dart';
import 'station_repository.dart';

/// 快递仓储（Packages 表 ↔ PackageModel / PackageView）。
class PackageRepository {
  PackageRepository(this._db, this._accounts, this._stations);

  final AppDatabase _db;
  final AccountRepository _accounts;
  final StationRepository _stations;

  PackageModel _toModel(Package p) => PackageModel(
        id: p.id,
        accountId: p.accountId,
        stationId: p.stationId,
        source: DataSourceX.fromName(p.source),
        courierCompany: p.courierCompany,
        trackingNumber: p.trackingNumber,
        pickupCode: p.pickupCode,
        status: PackageStatusX.fromName(p.status),
        arrivedAt: TimeUtils.parse(p.arrivedAt),
        pickedUpAt: TimeUtils.parse(p.pickedUpAt),
        remark: p.remark,
        createdAt: TimeUtils.parse(p.createdAt) ?? DateTime.now(),
        updatedAt: TimeUtils.parse(p.updatedAt) ?? DateTime.now(),
      );

  AccountModel _toAccount(Account a) => AccountModel(
        id: a.id,
        userId: a.userId,
        platform: PlatformX.fromName(a.platform),
        phone: a.phone,
        nickname: a.nickname,
        enabled: a.enabled == 1,
        createdAt: TimeUtils.parse(a.createdAt) ?? DateTime.now(),
        updatedAt: TimeUtils.parse(a.updatedAt) ?? DateTime.now(),
      );

  StationModel _toStation(Station s) => StationModel(
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

  PackageView _toView(
    Package p, {
    Account? account,
    Station? station,
  }) =>
      PackageView(
        pkg: _toModel(p),
        account: account == null ? null : _toAccount(account),
        station: station == null ? null : _toStation(station),
      );

  /// 基础 join 查询构造器。
  JoinedSelectStatement<Package, Package> _joinQuery() =>
      _db.select(_db.packages).join([
        leftOuterJoin(
            _db.accounts, _db.accounts.id.equalsExp(_db.packages.accountId)),
        leftOuterJoin(
            _db.stations, _db.stations.id.equalsExp(_db.packages.stationId)),
      ]);

  PackageView _mapRow(TypedResult row) => _toView(
        row.readTable(_db.packages),
        account: row.readTableOrNull(_db.accounts),
        station: row.readTableOrNull(_db.stations),
      );

  /// 全部快递（含关联），按到达/创建时间倒序。
  Stream<List<PackageView>> watchAll() =>
      (_joinQuery()..orderBy([OrderingTerm.desc(_db.packages.arrivedAt)]))
          .watch()
          .map((rows) => rows.map(_mapRow).toList());

  /// 待取快递（已到站 / 待取件）。
  Stream<List<PackageView>> watchPending() => (_joinQuery()
        ..where(_db.packages.status.isIn([
          PackageStatus.arrived.name,
          PackageStatus.pendingPickup.name,
        ]))
        ..orderBy([OrderingTerm.desc(_db.packages.arrivedAt)]))
      .watch()
      .map((rows) => rows.map(_mapRow).toList());

  Stream<PackageView?> watchById(String id) =>
      (_joinQuery()..where(_db.packages.id.equals(id)))
          .watchSingleOrNull()
          .map((row) => row == null ? null : _mapRow(row));

  Stream<List<PackageView>> watchByStation(String stationId) =>
      (_joinQuery()
            ..where(_db.packages.stationId.equals(stationId))
            ..orderBy([OrderingTerm.desc(_db.packages.arrivedAt)]))
          .watch()
          .map((rows) => rows.map(_mapRow).toList());

  /// 搜索：取件码 / 单号 / 快递公司 / 驿站名 / 手机号。
  Stream<List<PackageView>> search(String query) {
    final q = query.trim();
    if (q.isEmpty) return watchAll();
    final pattern = '%$q%';
    final stmt = _joinQuery()
      ..where(
        _db.packages.pickupCode.like(pattern) |
            _db.packages.trackingNumber.like(pattern) |
            _db.packages.courierCompany.like(pattern) |
            _db.stations.name.like(pattern) |
            _db.accounts.phone.like(pattern),
      );
    return stmt.watch().map((rows) => rows.map(_mapRow).toList());
  }

  Future<PackageModel?> getById(String id) async {
    final row = await (_db.select(_db.packages)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();
    return row == null ? null : _toModel(row);
  }

  /// 获取全部快递模型（去重/导出等场景使用）。
  Future<List<PackageModel>> getAll() async {
    final rows = await (_db.select(_db.packages)
          ..orderBy([(t) => OrderingTerm.desc(t.arrivedAt)]))
        .get();
    return rows.map(_toModel).toList();
  }

  Future<void> create(PackageModel p) async {
    await _db.into(_db.packages).insert(
          PackagesCompanion.insert(
            id: Value(p.id),
            accountId: Value(p.accountId),
            stationId: Value(p.stationId),
            source: Value(p.source.name),
            courierCompany: Value(p.courierCompany),
            trackingNumber: Value(p.trackingNumber),
            pickupCode: Value(p.pickupCode),
            status: Value(p.status.name),
            arrivedAt: Value(p.arrivedAt == null
                ? null
                : TimeUtils.toIso(p.arrivedAt!)),
            pickedUpAt: Value(p.pickedUpAt == null
                ? null
                : TimeUtils.toIso(p.pickedUpAt!)),
            remark: Value(p.remark),
            createdAt: Value(TimeUtils.toIso(p.createdAt)),
            updatedAt: Value(TimeUtils.toIso(p.updatedAt)),
          ),
        );
  }

  Future<void> update(PackageModel p) async {
    await (_db.update(_db.packages)..where((t) => t.id.equals(p.id))).write(
      PackagesCompanion(
        accountId: Value(p.accountId),
        stationId: Value(p.stationId),
        source: Value(p.source.name),
        courierCompany: Value(p.courierCompany),
        trackingNumber: Value(p.trackingNumber),
        pickupCode: Value(p.pickupCode),
        status: Value(p.status.name),
        arrivedAt: Value(p.arrivedAt == null
            ? null
            : TimeUtils.toIso(p.arrivedAt!)),
        pickedUpAt: Value(p.pickedUpAt == null
            ? null
            : TimeUtils.toIso(p.pickedUpAt!)),
        remark: Value(p.remark),
        updatedAt: Value(TimeUtils.toIso(p.updatedAt)),
      ),
    );
  }

  /// 标记为已取件，并记录时间。
  Future<void> markPickedUp(String id, DateTime at) async {
    await (_db.update(_db.packages)..where((t) => t.id.equals(id))).write(
      PackagesCompanion(
        status: Value(PackageStatus.pickedUp.name),
        pickedUpAt: Value(TimeUtils.toIso(at)),
        updatedAt: Value(TimeUtils.toIso(DateTime.now())),
      ),
    );
  }

  /// 更新取件码，并把旧值写入历史表。
  Future<void> changePickupCode(
    String id,
    String oldCode,
    String newCode,
    DataSource source,
  ) async {
    await (_db.update(_db.packages)..where((t) => t.id.equals(id))).write(
      PackagesCompanion(
        pickupCode: Value(newCode),
        updatedAt: Value(TimeUtils.toIso(DateTime.now())),
      ),
    );
    await _db.into(_db.pickupCodeHistory).insert(
          PickupCodeHistoryCompanion.insert(
            id: Value(IdUtils.newId()),
            packageId: Value(id),
            oldCode: Value(oldCode.isEmpty ? null : oldCode),
            newCode: Value(newCode),
            changedAt: Value(TimeUtils.nowIso()),
            source: Value(source.name),
          ),
        );
  }

  Future<void> delete(String id) async {
    await (_db.delete(_db.packages)..where((t) => t.id.equals(id))).go();
  }
}

final packageRepositoryProvider = Provider<PackageRepository>((ref) =>
    PackageRepository(
      ref.watch(appDatabaseProvider),
      ref.watch(accountRepositoryProvider),
      ref.watch(stationRepositoryProvider),
    ));
