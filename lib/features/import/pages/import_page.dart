import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../../app/router.dart';
import '../../../core/errors/app_exception.dart';
import '../../../models/enums.dart';
import '../../../models/package_input.dart';
import '../../../widgets/empty_state.dart';

/// 导入页（第 33~37 节）：粘贴物流 / 手动添加。
class ImportPage extends ConsumerStatefulWidget {
  const ImportPage({super.key});

  @override
  ConsumerState<ImportPage> createState() => _ImportPageState();
}

class _ImportPageState extends ConsumerState<ImportPage> {
  final _textCtrl = TextEditingController();
  final _courierCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _stationCtrl = TextEditingController();
  String? _accountId;

  @override
  void dispose() {
    _textCtrl.dispose();
    _courierCtrl.dispose();
    _codeCtrl.dispose();
    _stationCtrl.dispose();
    super.dispose();
  }

  Future<void> _addFromText() async {
    final text = _textCtrl.text.trim();
    if (text.isEmpty) return;
    if (_accountId == null) {
      _toast('请先添加账号');
      return;
    }
    try {
      final res = await ref.read(importServiceProvider).importText(
            text,
            accountId: _accountId!,
            source: DataSource.text,
          );
      _textCtrl.clear();
      _toast(res.result.created ? '已添加快递' : '已更新重复快递');
    } on AppException catch (e) {
      _toast(e.message);
    } catch (e) {
      _toast('添加失败，请重试');
    }
  }

  Future<void> _addManual() async {
    if (_accountId == null) {
      _toast('请先添加账号');
      return;
    }
    final input = PackageInput(
      accountId: _accountId,
      courierCompany: _courierCtrl.text.trim(),
      pickupCode: _codeCtrl.text.trim(),
      stationName: _stationCtrl.text.trim(),
      status: PackageStatus.pendingPickup,
      source: DataSource.manual,
    );
    if (input.courierCompany == null || input.courierCompany!.isEmpty) {
      _toast('请填写快递公司');
      return;
    }
    try {
      final res =
          await ref.read(packageServiceProvider).addFromInput(input, accountId: _accountId!);
      _courierCtrl.clear();
      _codeCtrl.clear();
      _stationCtrl.clear();
      _toast(res.created ? '已添加快递' : '已更新重复快递');
    } on AppException catch (e) {
      _toast(e.message);
    } catch (e) {
      _toast('添加失败，请重试');
    }
  }

  void _toast(String msg) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  @override
  Widget build(BuildContext context) {
    final accounts = ref.watch(enabledAccountsProvider);
    final parser = ref.watch(parserServiceProvider);
    final preview = _textCtrl.text.trim().isNotEmpty
        ? parser.parse(_textCtrl.text, source: DataSource.text)
        : null;

    // 默认选中第一个账号。
    if (_accountId == null && accounts.hasValue && accounts.value!.isNotEmpty) {
      _accountId = accounts.value!.first.id;
    }

    return Scaffold(
      appBar: AppBar(title: const Text('添加快递')),
      body: accounts.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('加载失败：$e')),
        data: (list) {
          if (list.isEmpty) {
            return EmptyState(
              icon: Icons.person_add_alt_1_outlined,
              title: '还没有添加账号',
              subtitle: '请先在「我的」中添加电商平台账号',
              actionLabel: '去添加账号',
              onAction: () => context.go(AppRoutes.profile),
            );
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _accountPicker(list),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('粘贴物流信息',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _textCtrl,
                        maxLines: 4,
                        decoration: const InputDecoration(
                          hintText: '例如：您的中通快递已送达XX菜鸟驿站，取件码528。',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                      if (preview != null) _Preview(input: preview),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _addFromText,
                          child: const Text('识别并添加'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('手动添加',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _courierCtrl,
                        decoration: const InputDecoration(
                          labelText: '快递公司',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _codeCtrl,
                        decoration: const InputDecoration(
                          labelText: '取件码',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _stationCtrl,
                        decoration: const InputDecoration(
                          labelText: '驿站名称（可选）',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: _addManual,
                          child: const Text('添加'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _accountPicker(List<AccountModel> list) => DropdownButtonFormField<String>(
        value: _accountId,
        decoration: const InputDecoration(
          labelText: '所属账号',
          border: OutlineInputBorder(),
        ),
        items: list
            .map((a) => DropdownMenuItem(
                  value: a.id,
                  child: Text('${a.platform.label} · ${a.phone}'),
                ))
            .toList(),
        onChanged: (v) => setState(() => _accountId = v),
      );
}

class _Preview extends StatelessWidget {
  const _Preview({required this.input});

  final PackageInput input;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(top: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF2F5FF),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('识别结果',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            _Row('快递公司', input.courierCompany ?? '未识别'),
            _Row('取件码', input.pickupCode ?? '未识别'),
            _Row('驿站', input.stationName ?? '未识别'),
            _Row('状态', input.status?.label ?? '待取件'),
          ],
        ),
      );
}

class _Row extends StatelessWidget {
  const _Row(this.k, this.v);

  final String k;
  final String v;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          children: [
            SizedBox(
              width: 72,
              child: Text(k,
                  style: const TextStyle(color: Color(0xFF8A8F99))),
            ),
            Expanded(child: Text(v)),
          ],
        ),
      );
}
