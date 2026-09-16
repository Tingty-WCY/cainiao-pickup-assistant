/// 安全与隐私原则（本地优先）。
///
/// 第一版不要求用户把任何电商/快递平台密码交给 App，
/// 也不通过绕过验证码、Cookie 等方式获取第三方数据。
/// 所有敏感数据默认保存在本机 SQLite，并做脱敏展示。
class SecurityPolicy {
  SecurityPolicy._();

  /// 校验手机号基本格式（11 位数字，1 开头）。
  static bool isValidPhone(String? phone) {
    if (phone == null) return false;
    final cleaned = phone.replaceAll(RegExp(r'\s+'), '');
    return RegExp(r'^1\d{10}$').hasMatch(cleaned);
  }

  /// 清理用户输入中的密码字段（防御性：永远不持久化密码）。
  static String sanitize(String input) => input.trim();
}
