import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../../app/router.dart';
import '../../../core/security/security.dart';
import '../../../core/utils/time.dart';
import '../../../models/account_model.dart';
import '../../../models/enums.dart';
import '../../../widgets/empty_state.dart';

/// 「我的」页面：账号管理 + 数据管理入口 + 设置入口。
class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accounts = ref.watch(accountsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('我的')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(radius: 24, child: Icon(Icons.person)),
                  SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('本地用户',
                          style: TextStyle(
                              fontSize: 18, fontWeight: FontWeight.bold)),
                      Text('数据仅保存在本机',
                          style:
                              TextStyle(color: Color(0xFF8A8F99), fontSize: 13)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text('我的账号',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          accounts.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('加载失败：$e')),
            data: (list) {
              if (list.isEmpty) {
                return EmptyState(
                  icon: Icons.person_add_alt_1_outlined,
                  title: '还没有添加账号',
                  subtitle: '添加你的电商平台账号，快递会自动归类',
                  actionLabel: '添加账号',
                  onAction: () => _showAccountDialog(context, ref),
                );
              }
              return Column(
                children: [
                  ...list.map((a) => _AccountTile(
                        account: a,
                        onEdit: () => _showAccountDialog(context, ref, a),
                        onDelete: () async {
                          await ref
                              .read(accountServiceProvider)
                              .delete(a.id);
                        },
                      )),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () => _showAccountDialog(context, ref),
                    icon: const Icon(Icons.add),
                    label: const Text('添加账号'),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 24),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text('设置'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.go(AppRoutes.settings),
          ),
        ],
      ),
    );
  }

  Future<void> _showAccountDialog(
    BuildContext context,
    WidgetRef ref, [
    AccountModel? existing,
  ]) async {
    Platform platform = existing?.platform ?? Platform.taobao;
    final phoneCtrl = TextEditingController(text: existing?.phone ?? '');
    final nickCtrl =
        TextEditingController(text: existing?.nickname ?? '');

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: Text(existing == null ? '添加账号' : '编辑账号'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<Platform>(
                value: platform,
                decoration: const InputDecoration(labelText: '平台'),
                items: Platform.values
                    .map((p) => DropdownMenuItem(
                          value: p,
                          child: Text(p.label),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => platform = v!),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: '手机号'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: nickCtrl,
                decoration:
                    const InputDecoration(labelText: '昵称（可选）'),
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('取消')),
            FilledButton(
              onPressed: () async {
                final phone = phoneCtrl.text.trim();
                if (!SecurityPolicy.isValidPhone(phone)) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(content: Text('手机号格式不正确')));
                  return;
                }
                if (existing == null) {
                  await ref.read(accountServiceProvider).create(
                        platform: platform,
                        phone: phone,
                        nickname: nickCtrl.text.trim(),
                      );
                } else {
                  await ref.read(accountServiceProvider).update(
                        existing.copyWith(
                          platform: platform,
                          phone: phone,
                          nickname: nickCtrl.text.trim(),
                          updatedAt:
                              TimeUtils.parse(TimeUtils.nowIso())!,
                        ),
                      );
                }
                if (ctx.mounted) Navigator.of(ctx).pop();
              },
              child: const Text('保存'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AccountTile extends StatelessWidget {
  const _AccountTile({
    required this.account,
    required this.onEdit,
    required this.onDelete,
  });

  final AccountModel account;
  final VoidCallback onEdit;
  final Future<void> Function() onDelete;

  @override
  Widget build(BuildContext context) => ListTile(
        leading: CircleAvatar(
          backgroundColor:
              Theme.of(context).colorScheme.primary.withOpacity(0.12),
          child: Text(account.platform.label[0]),
        ),
        title: Text(account.displayName),
        subtitle: Text(
          '${account.platform.label} · ${account.phone}',
          style: const TextStyle(color: Color(0xFF8A8F99)),
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (v) {
            if (v == 'edit') onEdit();
            if (v == 'delete') onDelete();
          },
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'edit', child: Text('编辑')),
            PopupMenuItem(value: 'delete', child: Text('删除')),
          ],
        ),
        onTap: onEdit,
      );
}
