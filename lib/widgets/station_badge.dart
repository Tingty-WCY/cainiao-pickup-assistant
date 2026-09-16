import 'package:flutter/material.dart';

import '../core/utils/ui.dart';
import '../models/station_model.dart';

/// 驿站徽标（名称 + 类型色点）。
class StationBadge extends StatelessWidget {
  const StationBadge(this.station, {super.key});

  final StationModel station;

  @override
  Widget build(BuildContext context) {
    final color = stationTypeColor(station.type);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.location_on, size: 16, color: color),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            station.name,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
