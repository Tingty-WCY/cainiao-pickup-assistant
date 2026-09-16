import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/errors/app_exception.dart';

/// 设置页：隐私原则 + 数据管理（导出 / 导入）。
class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  final _importCtrl = TextEditingController();

  @override
  void dispose() {
    _importCtrl.dispose();
    super.dispose();
  }

  void _toast(String msg) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  Future<void> _export() async {
    try {
      final path = await ref.read(dataExportServiceProvider).exportToFile();
      _toast('已导出到：$path');
    } on AppException catch (e) {
      _toast(e.message);
    } catch (e) {
      _toast('导出失败：$e');
    }
  }

  Future<void> _import() async {
    final json = _importCtrl.text.trim();
    if (json.isEmpty) return;
    try {
      final count =
          await ref.read(dataExportServiceProvider).importFromJson(json);
      _importCtrl.clear();
      _toast('已导入 $count 条数据');
    } on AppException catch (e) {
      _toast(e.message);
    } catch (e) {
      _toast('导入失败：JSON 格式不正确');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('设置')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: const Color(0xFFF2F5FF),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('隐私原则',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  SizedBox(height: 8),
                  Text('• 数据默认仅保存在本机，不上传服务器。\n'
                      '• 不要求提供任何电商/快递平台密码。\n'
                      '• 手机号、单号等默认脱敏展示。',
                      style: TextStyle(height: 1.5)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text('数据管理',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.upload_outlined),
            title: const Text('导出数据'),
            subtitle: const Text('导出为 JSON 文件（含版本号）'),
            trailing: const Icon(Icons.chevron_right),
            onTap: _export,
          ),
          ListTile(
            leading: const Icon(Icons.download_outlined),
            title: const Text('导入数据'),
            subtitle: const Text('粘贴此前导出的 JSON'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => showDialog(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text('导入数据'),
                content: TextField(
                  controller: _importCtrl,
                  maxLines: 6,
                  decoration: const InputDecoration(
                    hintText: '粘贴 JSON 内容',
                    border: OutlineInputBorder(),
                  ),
                ),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      child: const Text('取消')),
                  FilledButton(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      _import();
                    },
                    child: const Text('导入'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text('通知（第二阶段）',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          const ListTile(
            leading: Icon(Icons.notifications_outlined),
            title: Text('到站提醒'),
            subtitle: Text('仅提醒「已到站 / 待取件」'),
          ),
        ],
      ),
    );
  }
}
