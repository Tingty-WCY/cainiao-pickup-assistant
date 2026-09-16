import 'package:drift/drift.dart';

/// 驿站表。
class Stations extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();

  /// StationType.name
  TextColumn get type => text().withDefault(const Constant('OTHER'))();

  TextColumn get address => text().nullable()();
  TextColumn get phone => text().nullable()();

  RealColumn get latitude => real().nullable()();
  RealColumn get longitude => real().nullable()();

  TextColumn get createdAt => text()();
  TextColumn get updatedAt => text()();

  @override
  Set<Column> get primaryKey => {id};
}
