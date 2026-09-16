import 'package:uuid/uuid.dart';

/// ID 生成工具。
class IdUtils {
  IdUtils._();

  static const _uuid = Uuid();

  static String newId() => _uuid.v4();
}
