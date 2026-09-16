import 'enums.dart';

/// 快递领域模型（App 最核心的数据）。
class PackageModel {
  const PackageModel({
    required this.id,
    required this.accountId,
    this.stationId,
    required this.source,
    required this.courierCompany,
    this.trackingNumber,
    this.pickupCode,
    required this.status,
    this.arrivedAt,
    this.pickedUpAt,
    this.remark,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String accountId;
  final String? stationId;
  final DataSource source;
  final String courierCompany;
  final String? trackingNumber;
  final String? pickupCode;
  final PackageStatus status;
  final DateTime? arrivedAt;
  final DateTime? pickedUpAt;
  final String? remark;
  final DateTime createdAt;
  final DateTime updatedAt;

  PackageModel copyWith({
    String? id,
    String? accountId,
    String? stationId,
    DataSource? source,
    String? courierCompany,
    String? trackingNumber,
    String? pickupCode,
    PackageStatus? status,
    DateTime? arrivedAt,
    DateTime? pickedUpAt,
    String? remark,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) =>
      PackageModel(
        id: id ?? this.id,
        accountId: accountId ?? this.accountId,
        stationId: stationId ?? this.stationId,
        source: source ?? this.source,
        courierCompany: courierCompany ?? this.courierCompany,
        trackingNumber: trackingNumber ?? this.trackingNumber,
        pickupCode: pickupCode ?? this.pickupCode,
        status: status ?? this.status,
        arrivedAt: arrivedAt ?? this.arrivedAt,
        pickedUpAt: pickedUpAt ?? this.pickedUpAt,
        remark: remark ?? this.remark,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );

  /// 是否为「待取」状态（首页重点）。
  bool get isPending => status.isPending;
}
