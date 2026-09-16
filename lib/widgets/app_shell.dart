import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../app/router.dart';

/// 底部导航容器（含中间的「＋导入」突出按钮）。
class AppShell extends StatelessWidget {
  const AppShell({required this.child, super.key});

  final Widget child;

  int _currentIndex(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith(AppRoutes.packages)) return 1;
    if (loc.startsWith(AppRoutes.import)) return 2;
    if (loc.startsWith(AppRoutes.stations)) return 3;
    if (loc.startsWith(AppRoutes.profile)) return 4;
    return 0; // home
  }

  void _onTap(BuildContext context, int index) {
    switch (index) {
      case 0:
        context.go(AppRoutes.home);
      case 1:
        context.go(AppRoutes.packages);
      case 2:
        context.go(AppRoutes.import);
      case 3:
        context.go(AppRoutes.stations);
      case 4:
        context.go(AppRoutes.profile);
    }
  }

  @override
  Widget build(BuildContext context) {
    final index = _currentIndex(context);
    return Scaffold(
      body: child,
      bottomNavigationBar: BottomAppBar(
        height: 64,
        padding: EdgeInsets.zero,
        elevation: 8,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _NavItem(icon: Icons.home_outlined, activeIcon: Icons.home, label: '首页', selected: index == 0, onTap: () => _onTap(context, 0)),
            _NavItem(icon: Icons.local_shipping_outlined, activeIcon: Icons.local_shipping, label: '快递', selected: index == 1, onTap: () => _onTap(context, 1)),
            const _CenterImportButton(),
            _NavItem(icon: Icons.location_on_outlined, activeIcon: Icons.location_on, label: '驿站', selected: index == 3, onTap: () => _onTap(context, 3)),
            _NavItem(icon: Icons.person_outline, activeIcon: Icons.person, label: '我的', selected: index == 4, onTap: () => _onTap(context, 4)),
          ],
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? Theme.of(context).colorScheme.primary : Colors.grey;
    return InkWell(
      onTap: onTap,
      child: SizedBox(
        width: 56,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(selected ? activeIcon : icon, color: color),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontSize: 11, color: color)),
          ],
        ),
      ),
    );
  }
}

class _CenterImportButton extends StatelessWidget {
  const _CenterImportButton();

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.go(AppRoutes.import),
      child: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Theme.of(context).colorScheme.primary.withOpacity(0.35),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: const Icon(Icons.add, color: Colors.white, size: 30),
      ),
    );
  }
}
