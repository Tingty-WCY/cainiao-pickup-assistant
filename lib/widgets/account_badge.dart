import 'package:flutter/material.dart';

import '../core/utils/mask.dart';
import '../models/account_model.dart';

/// 账号徽标（平台 + 脱敏手机号）。
class AccountBadge extends StatelessWidget {
  const AccountBadge(this.account, {super.key});

  final AccountModel account;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            account.platform.label,
            style: TextStyle(
              fontSize: 11,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          MaskUtils.maskPhone(account.phone),
          style: const TextStyle(fontSize: 13, color: Color(0xFF8A8F99)),
        ),
      ],
    );
  }
}
