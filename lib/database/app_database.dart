import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

import '../core/constants/app_constants.dart';
import '../core/utils/time.dart';
import 'tables/accounts.dart';
import 'tables/packages.dart';
import 'tables/pickup_code_history.dart';
import 'tables/stations.dart';
import 'tables/users.dart';

part 'app_database.g.dart';

/// 本地数据库（SQLite via Drift）。
///
/// 任何结构变更都必须提升 [schemaVersion] 并在 [onUpgrade] 中编写迁移，
/// 禁止直接删除用户数据库重新创建。
@DriftDatabase(
  tables: [Users, Accounts, Stations, Packages, PickupCodeHistory],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor])
      : super(executor ?? driftDatabase(name: 'pickcode'));

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) => m.createAll(),
        onUpgrade: (m, from, to) async {
          // v1: users / accounts / stations / packages / pickup_code_history
          // 后续版本示例（取消注释并补充迁移逻辑）：
          // if (from < 2) {
          //   await m.addColumn(packages, packages.courierTracking);
          // }
          // if (from < 3) {
          //   await m.alterTable(TableMigration(notifications));
          // }
        },
        beforeOpen: (details) async {
          if (details.wasCreated) {
            // 首次创建：插入默认本地用户，为多用户/家庭模式预留。
            await into(users).insert(
              UsersCompanion.insert(
                id: Value(AppConstants.defaultUserId),
                name: Value('本地用户'),
                createdAt: Value(TimeUtils.nowIso()),
                updatedAt: Value(TimeUtils.nowIso()),
              ),
            );
          }
        },
      );
}
