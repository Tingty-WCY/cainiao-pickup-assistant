import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/enums.dart';
import '../models/package_input.dart';

/// 文本解析服务（第 34/35 节）。
///
/// 将用户粘贴的物流文本（淘宝/京东/拼多多/短信/菜鸟等）解析为 [PackageInput]。
/// 采用启发式正则，不依赖任何第三方平台账号或密码。
class ParserService {
  ParserService();

  static const Map<String, String> _courierKeywords = {
    '京东': '京东',
    '中通': '中通',
    '圆通': '圆通',
    '申通': '申通',
    '韵达': '韵达',
    '顺丰': '顺丰',
    '极兔': '极兔',
    '邮政': '邮政EMS',
    'EMS': '邮政EMS',
    '德邦': '德邦',
    '百世': '百世',
    '丹鸟': '丹鸟',
  };

  PackageInput parse(String text, {DataSource source = DataSource.text}) {
    final content = text.trim();
    if (content.isEmpty) {
      return PackageInput(source: source);
    }

    final courierCompany = _detectCourier(content);
    final pickupCode = _detectPickupCode(content);
    final station = _detectStation(content);
    final trackingNumber = _detectTrackingNumber(content);
    final status = _detectStatus(content, hasPickupCode: pickupCode != null);

    return PackageInput(
      courierCompany: courierCompany,
      pickupCode: pickupCode,
      stationName: station?.$1,
      stationAddress: null,
      trackingNumber: trackingNumber,
      status: status,
      source: source,
    );
  }

  String? _detectCourier(String text) {
    for (final entry in _courierKeywords.entries) {
      if (text.contains(entry.key)) return entry.value;
    }
    return null;
  }

  String? _detectPickupCode(String text) {
    // 优先匹配「取件码：528」「取件码 528」「取件码A238」
    final primary = RegExp(r'取件码[：:\s]*([A-Za-z0-9]{2,12})');
    final m = primary.firstMatch(text);
    if (m != null) return m.group(1);

    // 兜底：紧邻「码」的数字/字母组合
    final fallback = RegExp(r'码[：:\s]*([A-Za-z0-9]{3,10})');
    final m2 = fallback.firstMatch(text);
    if (m2 != null) return m2.group(1);
    return null;
  }

  /// 返回 (驿站名称, 驿站类型)。
  (String, StationType)? _detectStation(String text) {
    (String, StationType)? match(RegExp reg, StationType type, String suffix) {
      final m = reg.firstMatch(text);
      if (m == null) return null;
      final prefix = m.group(1) ?? '';
      final name = '${prefix.trim()}$suffix'.trim();
      return (name.isEmpty ? suffix : name, type);
    }

    final result = match(RegExp(r'(.*?)菜鸟驿站'), StationType.cainiao, '菜鸟驿站') ??
        match(RegExp(r'(.*?)兔喜'), StationType.tuxi, '兔喜') ??
        match(RegExp(r'(.*?)丰巢'), StationType.fengchao, '丰巢') ??
        match(RegExp(r'(.*?)京东站'), StationType.jd, '京东站') ??
        match(RegExp(r'(.*?)京东驿站'), StationType.jd, '京东驿站') ??
        match(RegExp(r'(.*?)驿站'), StationType.other, '驿站') ??
        match(RegExp(r'(.*?)快递柜'), StationType.fengchao, '快递柜');
    return result;
  }

  String? _detectTrackingNumber(String text) {
    final labeled = RegExp(r'(?:快递单号|运单号|单号)[：:\s]*([A-Za-z0-9]{6,})');
    final m = labeled.firstMatch(text);
    if (m != null) return m.group(1);

    // 兜底：10 位以上连续字母数字（排除纯取件码短串）
    final fallback = RegExp(r'\b([A-Za-z0-9]{10,})\b');
    final m2 = fallback.firstMatch(text);
    if (m2 != null) return m2.group(1);
    return null;
  }

  PackageStatus _detectStatus(String text, {required bool hasPickupCode}) {
    if (text.contains('已取') || text.contains('已签收')) {
      return PackageStatus.pickedUp;
    }
    if (text.contains('运输中') || text.contains('派送中') || text.contains('已揽收')) {
      return PackageStatus.shipping;
    }
    if (text.contains('已送达') ||
        text.contains('已到站') ||
        text.contains('待取') ||
        hasPickupCode) {
      return PackageStatus.pendingPickup;
    }
    return PackageStatus.arrived;
  }
}

final parserServiceProvider =
    Provider<ParserService>((ref) => ParserService());
