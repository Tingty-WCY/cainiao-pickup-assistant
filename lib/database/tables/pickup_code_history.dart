import 'package:drift/drift.dart';

/// 取件码变更历史表（处理取件码变化：528 → 839 → 1024）。
class PickupCodeHistory extends Table {
  TextColumn get id => text()();
  TextColumn get packageId => text()();

  TextColumn get oldCode => text().nullable()();
  TextColumn get newCode => text()();

  /// DataSource.name
  TextColumn get changedAt => text()();
  TextColumn get source => text().withDefault(const Constant('UNKNOWN'))();

  @override
  Set<Column> get primaryKey => {id};
}
