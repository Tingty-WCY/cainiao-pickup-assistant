import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/errors/app_exception.dart';
import '../models/enums.dart';
import '../models/package_input.dart';
import '../services/package_service.dart';
import '../services/parser_service.dart';

/// 导入编排服务（第 33~36 节）。
///
/// 文本导入 = 解析 → 归一化 → 去重 → 保存。
/// 剪贴板/OCR 第二阶段接入，统一走 [importText]。
class ImportService {
  ImportService(this._parser, this._package);

  final ParserService _parser;
  final PackageService _package;

  /// 解析并保存文本导入。
  Future<PackageSaveResultWrapper> importText(
    String text, {
    required String accountId,
    DataSource source = DataSource.text,
  }) async {
    if (text.trim().isEmpty) {
      throw const AppException('请输入物流信息');
    }
    if (accountId.isEmpty) {
      throw const AppException('请先添加账号');
    }
    final input = _parser.parse(text, source: source);
    final result = await _package.addFromInput(input, accountId: accountId);
    return PackageSaveResultWrapper(input: input, result: result);
  }
}

/// 包装解析结果 + 保存结果，便于 UI 展示「识别结果」。
class PackageSaveResultWrapper {
  const PackageSaveResultWrapper({
    required this.input,
    required this.result,
  });

  final PackageInput input;
  final PackageSaveResult result;
}

final importServiceProvider = Provider<ImportService>((ref) => ImportService(
      ref.watch(parserServiceProvider),
      ref.watch(packageServiceProvider),
    ));
