import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../core/constants/app_constants.dart';
import '../core/utils/time.dart';
import '../database/app_database.dart';

/// 数据导出 / 导入（第 51/52 节）。
/// 导出 JSON（含 version 便于未来结构升级）；导入采用 replace 避免主键冲突。
class DataExportService {
  DataExportService(this._db);

  final AppDatabase _db;

  Future<String> _exportJsonString() async {
    final users = await _db.select(_db.users).get();
    final accounts = await _db.select(_db.accounts).get();
    final stations = await _db.select(_db.stations).get();
    final packages = await _db.select(_db.packages).get();
    final history = await _db.select(_db.pickupCodeHistory).get();

    final envelope = {
      'version': AppConstants.exportVersion,
      'exportedAt': TimeUtils.nowIso(),
      'users': users
          .map((u) => {
                'id': u.id,
                'name': u.name,
                'createdAt': u.createdAt,
                'updatedAt': u.updatedAt,
              })
          .toList(),
      'accounts': accounts
          .map((a) => {
                'id': a.id,
                'userId': a.userId,
                'platform': a.platform,
                'phone': a.phone,
                'nickname': a.nickname,
                'enabled': a.enabled,
                'createdAt': a.createdAt,
                'updatedAt': a.updatedAt,
              })
          .toList(),
      'stations': stations
          .map((s) => {
                'id': s.id,
                'name': s.name,
                'type': s.type,
                'address': s.address,
                'phone': s.phone,
                'latitude': s.latitude,
                'longitude': s.longitude,
                'createdAt': s.createdAt,
                'updatedAt': s.updatedAt,
              })
          .toList(),
      'packages': packages
          .map((p) => {
                'id': p.id,
                'accountId': p.accountId,
                'stationId': p.stationId,
                'source': p.source,
                'courierCompany': p.courierCompany,
                'trackingNumber': p.trackingNumber,
                'pickupCode': p.pickupCode,
                'status': p.status,
                'arrivedAt': p.arrivedAt,
                'pickedUpAt': p.pickedUpAt,
                'remark': p.remark,
                'createdAt': p.createdAt,
                'updatedAt': p.updatedAt,
              })
          .toList(),
      'pickupCodeHistory': history
          .map((h) => {
                'id': h.id,
                'packageId': h.packageId,
                'oldCode': h.oldCode,
                'newCode': h.newCode,
                'changedAt': h.changedAt,
                'source': h.source,
              })
          .toList(),
    };
    return const JsonEncoder.withIndent('  ').convert(envelope);
  }

  /// 导出为 JSON 文件，返回文件路径。
  Future<String> exportToFile() async {
    final json = await _exportJsonString();
    final dir = await getApplicationDocumentsDirectory();
    final ts = DateTime.now().millisecondsSinceEpoch;
    final path = '${dir.path}/pickcode_export_$ts.json';
    final file = File(path);
    await file.writeAsString(json);
    return path;
  }

  /// 从 JSON 字符串导入（覆盖式）。
  Future<int> importFromJson(String json) async {
    final data = jsonDecode(json) as Map<String, dynamic>;

    await _db.batch((batch) {
      batch.deleteAll(_db.users);
      batch.deleteAll(_db.accounts);
      batch.deleteAll(_db.stations);
      batch.deleteAll(_db.packages);
      batch.deleteAll(_db.pickupCodeHistory);
    });

    var count = 0;

    for (final u in (data['users'] as List? ?? [])) {
      await _db.into(_db.users).insert(
        UsersCompanion.insert(
          id: Value(u['id']),
          name: Value(u['name']),
          createdAt: Value(u['createdAt']),
          updatedAt: Value(u['updatedAt']),
        ),
        mode: InsertMode.replace,
      );
      count++;
    }
    for (final a in (data['accounts'] as List? ?? [])) {
      await _db.into(_db.accounts).insert(
        AccountsCompanion.insert(
          id: Value(a['id']),
          userId: Value(a['userId']),
          platform: Value(a['platform']),
          phone: Value(a['phone']),
          nickname: Value(a['nickname'] ?? ''),
          enabled: Value(a['enabled'] ?? 1),
          createdAt: Value(a['createdAt']),
          updatedAt: Value(a['updatedAt']),
        ),
        mode: InsertMode.replace,
      );
      count++;
    }
    for (final s in (data['stations'] as List? ?? [])) {
      await _db.into(_db.stations).insert(
        StationsCompanion.insert(
          id: Value(s['id']),
          name: Value(s['name']),
          type: Value(s['type'] ?? 'OTHER'),
          address: Value(s['address']),
          phone: Value(s['phone']),
          latitude: Value(s['latitude'] == null
              ? null
              : (s['latitude'] as num).toDouble()),
          longitude: Value(s['longitude'] == null
              ? null
              : (s['longitude'] as num).toDouble()),
          createdAt: Value(s['createdAt']),
          updatedAt: Value(s['updatedAt']),
        ),
        mode: InsertMode.replace,
      );
      count++;
    }
    for (final p in (data['packages'] as List? ?? [])) {
      await _db.into(_db.packages).insert(
        PackagesCompanion.insert(
          id: Value(p['id']),
          accountId: Value(p['accountId']),
          stationId: Value(p['stationId']),
          source: Value(p['source'] ?? 'MANUAL'),
          courierCompany: Value(p['courierCompany']),
          trackingNumber: Value(p['trackingNumber']),
          pickupCode: Value(p['pickupCode']),
          status: Value(p['status'] ?? 'UNKNOWN'),
          arrivedAt: Value(p['arrivedAt']),
          pickedUpAt: Value(p['pickedUpAt']),
          remark: Value(p['remark']),
          createdAt: Value(p['createdAt']),
          updatedAt: Value(p['updatedAt']),
        ),
        mode: InsertMode.replace,
      );
      count++;
    }
    for (final h in (data['pickupCodeHistory'] as List? ?? [])) {
      await _db.into(_db.pickupCodeHistory).insert(
        PickupCodeHistoryCompanion.insert(
          id: Value(h['id']),
          packageId: Value(h['packageId']),
          oldCode: Value(h['oldCode']),
          newCode: Value(h['newCode']),
          changedAt: Value(h['changedAt']),
          source: Value(h['source'] ?? 'UNKNOWN'),
        ),
        mode: InsertMode.replace,
      );
      count++;
    }
    return count;
  }
}

final dataExportServiceProvider = Provider<DataExportService>(
    (ref) => DataExportService(ref.watch(appDatabaseProvider)));
