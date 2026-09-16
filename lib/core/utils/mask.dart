/// 数据脱敏工具（默认隐藏隐私信息）。
class MaskUtils {
  MaskUtils._();

  /// 手机号脱敏：13812341234 → 138****1234
  static String maskPhone(String? phone) {
    if (phone == null || phone.length < 7) return phone ?? '';
    final start = phone.substring(0, 3);
    final end = phone.substring(phone.length - 4);
    return '$start****$end';
  }

  /// 快递单号脱敏：SF123456789012345678 → SF1234********5678
  static String maskTracking(String? tracking) {
    if (tracking == null || tracking.length <= 8) return tracking ?? '';
    final start = tracking.substring(0, 4);
    final end = tracking.substring(tracking.length - 4);
    return '$start********$end';
  }
}
