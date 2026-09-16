import 'package:drift/drift.dart';

/// 账号表。一个 User 对应多个电商平台账号（手机号 + 平台 + 昵称独立管理）。
class Accounts extends Table {
  TextColumn get id => text()();
  TextColumn get userId => text()();

  /// Platform.name
  TextColumn get platform => text()();
  TextColumn get phone => text().withLength(min: 1, max: 32)();
  TextColumn get nickname => text().withDefault(const Constant(''))();

  /// 是否启用（1=启用，0=停用），存为 int 以兼容 SQLite。
  IntColumn get enabled => integer().withDefault(const Constant(1))();

  TextColumn get createdAt => text()();
  TextColumn get updatedAt => text()();

  @override
  Set<Column> get primaryKey => {id};
}
