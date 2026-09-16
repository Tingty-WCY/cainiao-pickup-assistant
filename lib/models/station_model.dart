import 'enums.dart';

/// 驿站领域模型。
class StationModel {
  const StationModel({
    required this.id,
    required this.name,
    required this.type,
    this.address,
    this.phone,
    this.latitude,
    this.longitude,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final StationType type;
  final String? address;
  final String? phone;
  final double? latitude;
  final double? longitude;
  final DateTime createdAt;
  final DateTime updatedAt;

  StationModel copyWith({
    String? id,
    String? name,
    StationType? type,
    String? address,
    String? phone,
    double? latitude,
    double? longitude,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) =>
      StationModel(
        id: id ?? this.id,
        name: name ?? this.name,
        type: type ?? this.type,
        address: address ?? this.address,
        phone: phone ?? this.phone,
        latitude: latitude ?? this.latitude,
        longitude: longitude ?? this.longitude,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
}
