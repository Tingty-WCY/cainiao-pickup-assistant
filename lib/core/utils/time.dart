/// 时间工具。数据库统一以 ISO8601 字符串存储。
class TimeUtils {
  TimeUtils._();

  /// 当前 UTC 时间字符串。
  static String nowIso() => DateTime.now().toUtc().toIso8601String();

  /// 将时间转为可存储的 ISO8601 字符串（UTC）。
  static String toIso(DateTime dt) => dt.toUtc().toIso8601String();

  static DateTime? parse(String? iso) {
    if (iso == null || iso.isEmpty) return null;
    return DateTime.tryParse(iso);
  }

  /// 本地可读时间，例如 "今天 10:32"。
  static String formatRelative(DateTime? time) {
    if (time == null) return '';
    final local = time.toLocal();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final thatDay = DateTime(local.year, local.month, local.day);
    final diffDays = today.difference(thatDay).inDays;
    final hm = '${local.hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')}';
    if (diffDays == 0) return '今天 $hm';
    if (diffDays == 1) return '昨天 $hm';
    if (diffDays == -1) return '明天 $hm';
    return '${local.month}月${local.day}日 $hm';
  }

  static String formatDate(DateTime? time) {
    if (time == null) return '';
    final local = time.toLocal();
    return '${local.year}-${local.month.toString().padLeft(2, '0')}-'
        '${local.day.toString().padLeft(2, '0')}';
  }
}
