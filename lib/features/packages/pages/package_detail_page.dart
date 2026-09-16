import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/utils/mask.dart';
import '../../../core/utils/time.dart';
import '../../../core/utils/ui.dart';
import '../../../models/enums.dart';
import '../../../widgets/pickup_code_text.dart';

/// 快递详情页。
class PackageDetailPage extends ConsumerWidget {
  const PackageDetailPage({super.key, required this.packageId});

  final String packageId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final view = ref.watch(packageByIdProvider(packageId));

    return Scaffold(
      appBar: AppBar(title: const Text('快递详情')),
      body: view.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('加载失败：$e')),
        data: (v) {
          if (v == null) {
            return const Center(child: Text('快递不存在'));
          }
          final pkg = v.pkg;
          final picked = pkg.status == PackageStatus.pickedUp;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Text(pkg.courierCompany,
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 12),
                      if (pkg.pickupCode != null)
                        PickupCodeText(pkg.pickupCode!, size: 48),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusColor(pkg.status).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(pkg.status.label,
                            style: TextStyle(color: statusColor(pkg.status))),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              _InfoTile('驿站', v.stationName),
              _InfoTile('账号', v.maskedPhone.isEmpty
                  ? (v.platformLabel)
                  : '${v.platformLabel} · ${v.maskedPhone}'),
              _InfoTile('来源', pkg.source.label),
              _InfoTile(
                '快递单号',
                pkg.trackingNumber == null
                    ? '—'
                    : MaskUtils.maskTracking(pkg.trackingNumber),
              ),
              _InfoTile('到达时间',
                  pkg.arrivedAt == null ? '—' : TimeUtils.formatRelative(pkg.arrivedAt)),
              _InfoTile('备注', pkg.remark ?? '—'),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        if (pkg.pickupCode != null) {
                          Clipboard.setData(
                              ClipboardData(text: pkg.pickupCode!));
                          ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('已复制取件码')));
                        }
                      },
                      child: const Text('复制取件码'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: picked
                          ? null
                          : () async {
                              await ref
                                  .read(packageServiceProvider)
                                  .markPickedUp(pkg.id);
                            },
                      child: Text(picked ? '已取件' : '标记已取'),
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(label, style: const TextStyle(color: Color(0xFF8A8F99))),
        subtitle: Text(value, style: const TextStyle(fontSize: 15)),
      );
}
