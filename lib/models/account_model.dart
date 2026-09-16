import 'enums.dart';

/// 账号领域模型（平台 + 手机号 + 昵称独立管理）。
class AccountModel {
  const AccountModel({
    required this.id,
    required this.userId,
    required this.platform,
    required this.phone,
    required this.nickname,
    required this.enabled,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String userId;
  final Platform platform;
  final String phone;
  final String nickname;
  final bool enabled;
  final DateTime createdAt;
  final DateTime updatedAt;

  AccountModel copyWith({
    String? id,
    String? userId,
    Platform? platform,
    String? phone,
    String? nickname,
    bool? enabled,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) =>
      AccountModel(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        platform: platform ?? this.platform,
        phone: phone ?? this.phone,
        nickname: nickname ?? this.nickname,
        enabled: enabled ?? this.enabled,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );

  String get displayName =>
      nickname.isNotEmpty ? nickname : '${platform.label}账号';
}
