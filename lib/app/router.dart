import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../features/accounts/pages/profile_page.dart';
import '../features/home/pages/home_page.dart';
import '../features/import/pages/import_page.dart';
import '../features/packages/pages/package_detail_page.dart';
import '../features/packages/pages/packages_page.dart';
import '../features/settings/pages/settings_page.dart';
import '../features/stations/pages/station_detail_page.dart';
import '../features/stations/pages/stations_page.dart';
import '../widgets/app_shell.dart';

/// 路由路径集中管理，避免散落字符串。
class AppRoutes {
  AppRoutes._();

  static const String home = '/home';
  static const String packages = '/packages';
  static const String import = '/import';
  static const String stations = '/stations';
  static const String profile = '/profile';

  static const String packageDetail = '/package/:id';
  static const String stationDetail = '/station/:id';

  static const String settings = '/settings';

  static String packageDetailPath(String id) => '/package/$id';
  static String stationDetailPath(String id) => '/station/$id';
}

final goRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: AppRoutes.home,
    debugLogDiagnostics: false,
    routes: [
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.home,
            builder: (context, state) => const HomePage(),
          ),
          GoRoute(
            path: AppRoutes.packages,
            builder: (context, state) => const PackagesPage(),
          ),
          GoRoute(
            path: AppRoutes.import,
            builder: (context, state) => const ImportPage(),
          ),
          GoRoute(
            path: AppRoutes.stations,
            builder: (context, state) => const StationsPage(),
          ),
          GoRoute(
            path: AppRoutes.profile,
            builder: (context, state) => const ProfilePage(),
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.packageDetail,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return PackageDetailPage(packageId: id);
        },
      ),
      GoRoute(
        path: AppRoutes.stationDetail,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return StationDetailPage(stationId: id);
        },
      ),
      GoRoute(
        path: AppRoutes.settings,
        builder: (context, state) => const SettingsPage(),
      ),
    ],
  );
});
