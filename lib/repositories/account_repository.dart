import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../database/app_database.dart';
import '../database/database_provider.dart';
import '../models/account_model.dart';
import '../models/enums.dart';

/// 账号仓储（Accounts 表 ↔ AccountModel）。
class AccountRepository {
  AccountRepository(this._db);

  final AppDatabase _db;

  AccountModel _toModel(Account a) => AccountModel(
        id: a.id,
        userId: a.userId,
        platform: PlatformX.fromName(a.platform),
        phone: a.phone,
        nickname: a.nickname,
        enabled: a.enabled == 1,
        createdAt: TimeUtils.parse(a.createdAt) ?? DateTime.now(),
        updatedAt: TimeUtils.parse(a.updatedAt) ?? DateTime.now(),
      );

  Stream<List<AccountModel>> watchAll(String userId) =>
      (_db.select(_db.accounts)
            ..where((t) => t.userId.equals(userId)))
          .watch()
          .map((rows) => rows.map(_toModel).toList());

  Stream<List<AccountModel>> watchEnabled(String userId) =>
      (_db.select(_db.accounts)
            ..where((t) => t.userId.equals(userId) & t.enabled.equals(1)))
          .watch()
          .map((rows) => rows.map(_toModel).toList());

  Future<AccountModel?> getById(String id) async {
    final row = await (_db.select(_db.accounts)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();
    return row == null ? null : _toModel(row);
  }

  Future<void> create(AccountModel a) async {
    await _db.into(_db.accounts).insert(
          AccountsCompanion.insert(
            id: Value(a.id),
            userId: Value(a.userId),
            platform: Value(a.platform.name),
            phone: Value(a.phone),
            nickname: Value(a.nickname),
            enabled: Value(a.enabled ? 1 : 0),
            createdAt: Value(TimeUtils.toIso(a.createdAt)),
            updatedAt: Value(TimeUtils.toIso(a.updatedAt)),
          ),
        );
  }

  Future<void> update(AccountModel a) async {
    await (_db.update(_db.accounts)..where((t) => t.id.equals(a.id))).write(
      AccountsCompanion(
        platform: Value(a.platform.name),
        phone: Value(a.phone),
        nickname: Value(a.nickname),
        enabled: Value(a.enabled ? 1 : 0),
        updatedAt: Value(TimeUtils.toIso(a.updatedAt)),
      ),
    );
  }

  Future<void> delete(String id) async {
    await (_db.delete(_db.accounts)..where((t) => t.id.equals(id))).go();
  }
}

final accountRepositoryProvider = Provider<AccountRepository>((ref) =>
    AccountRepository(ref.watch(appDatabaseProvider)));
