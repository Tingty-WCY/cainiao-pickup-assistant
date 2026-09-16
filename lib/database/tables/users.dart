import 'package:drift/drift.dart';

/// 用户表。第一版通常只有一个本地用户，预留多用户/家庭模式。
class Users extends Table {
  TextColumn get id => text()();
  TextColumn get name => text().withLength(min: 1, max: 128)();
  TextColumn get createdAt => text()();
  TextColumn get updatedAt => text()();

  @override
  Set<Column> get primaryKey => {id};
}
