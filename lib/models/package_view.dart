import 'account_model.dart';
import 'package_model.dart';
import 'station_model.dart';

/// 带关联信息的快递视图模型，供 UI 直接展示。
/// 包含：快递本体 + 所属账号（手机号/平台）+ 所属驿站。
class PackageView {
  const PackageView({
    required this.pkg,
    this.account,
    this.station,
  });

  final PackageModel pkg;
  final AccountModel? account;
  final StationModel? station;

  String get stationName => station?.name ?? '未指定驿站';
  String get maskedPhone =>
      account == null ? '' : MaskUtils.maskPhone(account!.phone);
  String get platformLabel => account?.platform.label ?? '';
}
