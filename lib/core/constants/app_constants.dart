/// 全局常量。
class AppConstants {
  AppConstants._();

  /// 第一版默认本地用户 ID（本地优先，通常只有一个用户）。
  static const String defaultUserId = 'local-user';

  static const String appName = '取件助手';
  static const String appNameEn = 'PickCode';

  /// 数据导出格式版本，便于未来数据库结构升级。
  static const int exportVersion = 1;
}
