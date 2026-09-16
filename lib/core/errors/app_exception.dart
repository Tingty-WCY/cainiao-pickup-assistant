/// 应用统一异常。UI 只展示 [message]，技术细节写入 [cause]。
class AppException implements Exception {
  const AppException(this.message, [this.cause]);

  final String message;
  final Object? cause;

  @override
  String toString() => 'AppException($message)';
}

/// 便捷构造：给用户友好提示，同时保留技术原因。
AppException fail(String message, [Object? cause]) => AppException(message, cause);
