import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/dashboard_summary.dart';
import '../repositories/account_repository.dart';
import '../repositories/package_repository.dart';
import '../repositories/station_repository.dart';
import '../services/account_service.dart';
import '../services/dashboard_service.dart';
import '../services/package_service.dart';
import '../services/parser_service.dart';
import '../services/station_service.dart';

/// UI 层常用 StreamProvider 集合。

/// 全部快递（含关联），实时监听。
final allPackagesProvider = StreamProvider<List<PackageView>>(
    (ref) => ref.watch(packageRepositoryProvider).watchAll());

/// 待取快递（已到站 / 待取件）。
final pendingPackagesProvider = StreamProvider<List<PackageView>>(
    (ref) => ref.watch(packageRepositoryProvider).watchPending());

/// 首页汇总。
final dashboardProvider = StreamProvider<DashboardSummary>(
    (ref) => ref.watch(dashboardServiceProvider).watchSummary());

/// 账号列表。
final accountsProvider = StreamProvider<List<AccountModel>>(
    (ref) => ref.watch(accountServiceProvider).watchAccounts());

/// 启用中的账号（导入时选择用）。
final enabledAccountsProvider = StreamProvider<List<AccountModel>>(
    (ref) => ref.watch(accountServiceProvider).watchEnabled());

/// 驿站列表。
final stationsProvider = StreamProvider<List<StationModel>>(
    (ref) => ref.watch(stationServiceProvider).watchAll());

/// 单个快递（含关联），按 ID 监听。
final packageByIdProvider =
    StreamProvider.family<PackageView?, String>((ref, id) =>
        ref.watch(packageRepositoryProvider).watchById(id));

/// 某驿站的快递列表。
final stationPackagesProvider =
    StreamProvider.family<List<PackageView>, String>((ref, stationId) =>
        ref.watch(packageRepositoryProvider).watchByStation(stationId));

/// 搜索快递（取件码 / 单号 / 快递公司 / 驿站名 / 手机号）。
final searchPackagesProvider =
    StreamProvider.family<List<PackageView>, String>((ref, query) =>
        ref.watch(packageRepositoryProvider).search(query));

/// 单个驿站（按 ID）。
final stationByIdProvider =
    FutureProvider.family<StationModel?, String>((ref, id) =>
        ref.watch(stationRepositoryProvider).getById(id));

/// 导出全部已注册服务，便于统一覆盖测试/替换。
final servicesProvider = Provider<ServicesBundle>((ref) => ServicesBundle(
      account: ref.watch(accountServiceProvider),
      station: ref.watch(stationServiceProvider),
      package: ref.watch(packageServiceProvider),
      parser: ref.watch(parserServiceProvider),
    ));

class ServicesBundle {
  const ServicesBundle({
    required this.account,
    required this.station,
    required this.package,
    required this.parser,
  });

  final AccountService account;
  final StationService station;
  final PackageService package;
  final ParserService parser;
}
