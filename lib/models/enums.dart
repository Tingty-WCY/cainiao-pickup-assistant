/// 平台枚举（对应 accounts.platform）。
enum Platform { taobao, jd, pdd, douyin, xianyu, other }

extension PlatformX on Platform {
  String get label {
    switch (this) {
      case Platform.taobao:
        return '淘宝';
      case Platform.jd:
        return '京东';
      case Platform.pdd:
        return '拼多多';
      case Platform.douyin:
        return '抖音';
      case Platform.xianyu:
        return '闲鱼';
      case Platform.other:
        return '其他';
    }
  }

  static Platform fromName(String? name) =>
      Platform.values.firstWhere((e) => e.name == name, orElse: () => Platform.other);
}

/// 数据来源枚举（对应 packages.source）。
enum DataSource {
  manual,
  text,
  clipboard,
  ocr,
  taobao,
  jd,
  pdd,
  douyin,
  sms,
  other,
}

extension DataSourceX on DataSource {
  String get label {
    switch (this) {
      case DataSource.manual:
        return '手动';
      case DataSource.text:
        return '文本';
      case DataSource.clipboard:
        return '剪贴板';
      case DataSource.ocr:
        return '截图识别';
      case DataSource.taobao:
        return '淘宝';
      case DataSource.jd:
        return '京东';
      case DataSource.pdd:
        return '拼多多';
      case DataSource.douyin:
        return '抖音';
      case DataSource.sms:
        return '短信';
      case DataSource.other:
        return '其他';
    }
  }

  static DataSource fromName(String? name) =>
      DataSource.values.firstWhere((e) => e.name == name, orElse: () => DataSource.other);
}

/// 快递状态枚举（对应 packages.status）。
enum PackageStatus {
  waiting,
  shipping,
  arrived,
  pendingPickup,
  pickedUp,
  expired,
  unknown,
}

extension PackageStatusX on PackageStatus {
  String get label {
    switch (this) {
      case PackageStatus.waiting:
        return '待发货';
      case PackageStatus.shipping:
        return '运输中';
      case PackageStatus.arrived:
        return '已到站';
      case PackageStatus.pendingPickup:
        return '待取件';
      case PackageStatus.pickedUp:
        return '已取件';
      case PackageStatus.expired:
        return '已过期';
      case PackageStatus.unknown:
        return '未知';
    }
  }

  /// 首页重点关注的状态。
  bool get isPending =>
      this == PackageStatus.arrived || this == PackageStatus.pendingPickup;

  static PackageStatus fromName(String? name) => PackageStatus.values
      .firstWhere((e) => e.name == name, orElse: () => PackageStatus.unknown);
}

/// 驿站类型枚举（对应 stations.type）。
enum StationType {
  cainiao,
  fengchao,
  tuxi,
  jd,
  zto,
  yto,
  sto,
  yunda,
  other,
}

extension StationTypeX on StationType {
  String get label {
    switch (this) {
      case StationType.cainiao:
        return '菜鸟';
      case StationType.fengchao:
        return '丰巢';
      case StationType.tuxi:
        return '兔喜';
      case StationType.jd:
        return '京东';
      case StationType.zto:
        return '中通';
      case StationType.yto:
        return '圆通';
      case StationType.sto:
        return '申通';
      case StationType.yunda:
        return '韵达';
      case StationType.other:
        return '其他';
    }
  }

  static StationType fromName(String? name) => StationType.values
      .firstWhere((e) => e.name == name, orElse: () => StationType.other);
}
