import 'package:flutter/material.dart';

import '../models/enums.dart';

/// 状态对应的展示颜色。
Color statusColor(PackageStatus status) {
  switch (status) {
    case PackageStatus.pendingPickup:
    case PackageStatus.arrived:
      return const Color(0xFF2B6CFF);
    case PackageStatus.shipping:
      return const Color(0xFFFF8A3D);
    case PackageStatus.pickedUp:
      return const Color(0xFF13B871);
    case PackageStatus.expired:
      return const Color(0xFFE5484D);
    case PackageStatus.waiting:
    case PackageStatus.unknown:
      return const Color(0xFF8A8F99);
  }
}

/// 驿站类型对应的强调色。
Color stationTypeColor(StationType type) {
  switch (type) {
    case StationType.cainiao:
      return const Color(0xFF2B6CFF);
    case StationType.fengchao:
      return const Color(0xFF13B871);
    case StationType.tuxi:
      return const Color(0xFFFF8A3D);
    case StationType.jd:
      return const Color(0xFFE5484D);
    default:
      return const Color(0xFF8A8F99);
  }
}
