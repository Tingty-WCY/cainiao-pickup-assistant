import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants/app_constants.dart';
import '../core/errors/app_exception.dart';
import '../core/security/security.dart';
import '../core/utils/id.dart';
import '../core/utils/time.dart';
import '../models/account_model.dart';
import '../models/enums.dart';
import '../repositories/account_repository.dart';

/// 账号业务服务（AccountRepository + 业务规则）。
class AccountService {
  AccountService(this._repo);

  final AccountRepository _repo;

  Stream<List<AccountModel>> watchAccounts(
          [String userId = AppConstants.defaultUserId]) =>
      _repo.watchAll(userId);

  Stream<List<AccountModel>> watchEnabled(
          [String userId = AppConstants.defaultUserId]) =>
      _repo.watchEnabled(userId);

  Future<AccountModel> create({
    required Platform platform,
    required String phone,
    required String nickname,
    String userId = AppConstants.defaultUserId,
  }) async {
    if (!SecurityPolicy.isValidPhone(phone)) {
      throw const AppException('手机号格式不正确');
    }
    final now = TimeUtils.nowIso();
    final model = AccountModel(
      id: IdUtils.newId(),
      userId: userId,
      platform: platform,
      phone: phone,
      nickname: SecurityPolicy.sanitize(nickname),
      enabled: true,
      createdAt: TimeUtils.parse(now)!,
      updatedAt: TimeUtils.parse(now)!,
    );
    await _repo.create(model);
    return model;
  }

  Future<void> update(AccountModel account) =>
      _repo.update(account.copyWith(updatedAt: TimeUtils.parse(TimeUtils.nowIso())!));

  Future<void> setEnabled(String id, bool enabled) async {
    final existing = await _repo.getById(id);
    if (existing == null) return;
    await _repo.update(existing.copyWith(
      enabled: enabled,
      updatedAt: TimeUtils.parse(TimeUtils.nowIso())!,
    ));
  }

  Future<void> delete(String id) => _repo.delete(id);
}

final accountServiceProvider = Provider<AccountService>(
    (ref) => AccountService(ref.watch(accountRepositoryProvider)));
