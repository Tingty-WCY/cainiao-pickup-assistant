import 'package:drift/drift.dart';

/// 快递表（核心数据表）。
class Packages extends Table {
  TextColumn get id => text()();

  TextColumn get accountId => text()();

  /// 关联驿站，删除驿站时置空（ON DELETE SET NULL）。
  TextColumn get stationId => text().nullable()();

  /// DataSource.name
  TextColumn get source => text().withDefault(const Constant('MANUAL'))();

  TextColumn get courierCompany => text()();
  TextColumn get trackingNumber => text().nullable()();
  TextColumn get pickupCode => text().nullable()();

  /// PackageStatus.name
  TextColumn get status => text().withDefault(const Constant('UNKNOWN'))();

  TextColumn get arrivedAt => text().nullable()();
  TextColumn get pickedUpAt => text().nullable()();
  TextColumn get remark => text().nullable()();

  TextColumn get createdAt => text()();
  TextColumn get updatedAt => text()();

  @override
  Set<Column> get primaryKey => {id};
}
