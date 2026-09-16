import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/utils/time.dart';
import '../core/utils/ui.dart';
import '../models/enums.dart';
import '../models/package_view.dart';
import 'pickup_code_text.dart';

/// 快递卡片（第 26 节）。
/// 取件码为核心视觉元素，操作按钮放在拇指易点区域。
class PackageCard extends StatelessWidget {
  const PackageCard({
    super.key,
    required this.view,
    this.onPickedUp,
    this.onTap,
  });

  final PackageView view;
  final VoidCallback? onPickedUp;
  final VoidCallback? onTap;

  Future<void> _copy(BuildContext context) async {
    final code = view.pkg.pickupCode;
    if (code == null || code.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: code));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('已复制取件码：$code')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final pkg = view.pkg;
    final status = pkg.status;
    final code = pkg.pickupCode;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      pkg.courierCompany,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor(status).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      status.label,
                      style: TextStyle(
                          fontSize: 12, color: statusColor(status)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (code != null && code.isNotEmpty) ...[
                Center(child: PickupCodeText(code, size: 40)),
                const SizedBox(height: 12),
              ] else
                const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.location_on,
                      size: 16, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      view.stationName,
                      style: const TextStyle(fontSize: 14),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Text(
                    view.maskedPhone,
                    style:
                        const TextStyle(fontSize: 13, color: Color(0xFF8A8F99)),
                  ),
                  const Spacer(),
                  Text(
                    TimeUtils.formatRelative(pkg.arrivedAt ?? pkg.createdAt),
                    style:
                        const TextStyle(fontSize: 13, color: Color(0xFF8A8F99)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _copy(context),
                      child: const Text('复制'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: onPickedUp,
                      child: const Text('已取'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
