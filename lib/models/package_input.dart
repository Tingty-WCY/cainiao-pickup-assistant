import 'enums.dart';

/// 统一输入模型（第 45 节）。
///
/// 无论数据来自：淘宝 / 京东 / 拼多多 / 短信 / OCR / 手动输入，
/// 最终都转换为 [PackageInput]，再经过 Normalizer → DuplicateService → PackageService。
class PackageInput {
  const PackageInput({
    this.accountId,
    this.phone,
    this.courierCompany,
    this.trackingNumber,
    this.pickupCode,
    this.stationName,
    this.stationAddress,
    this.status,
    required this.source,
  });

  final String? accountId;
  final String? phone;
  final String? courierCompany;
  final String? trackingNumber;
  final String? pickupCode;
  final String? stationName;
  final String? stationAddress;
  final PackageStatus? status;
  final DataSource source;

  PackageInput copyWith({
    String? accountId,
    String? phone,
    String? courierCompany,
    String? trackingNumber,
    String? pickupCode,
    String? stationName,
    String? stationAddress,
    PackageStatus? status,
    DataSource? source,
  }) =>
      PackageInput(
        accountId: accountId ?? this.accountId,
        phone: phone ?? this.phone,
        courierCompany: courierCompany ?? this.courierCompany,
        trackingNumber: trackingNumber ?? this.trackingNumber,
        pickupCode: pickupCode ?? this.pickupCode,
        stationName: stationName ?? this.stationName,
        stationAddress: stationAddress ?? this.stationAddress,
        status: status ?? this.status,
        source: source ?? this.source,
      );
}
