import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import type { Package } from '@/types';
import { formatDateTime } from '@/utils';
import { MaskedText } from './MaskedText';
import { StatusBadge } from './StatusBadge';
import { ConfirmDialog } from './ConfirmDialog';
import { theme } from './theme';

/** 左滑露出的删除按钮宽度 */
const SWIPE_WIDTH = 84;

interface Props {
  pkg: Package;
  /** 关联账号的手机号（原始值，由 MaskedText 按开关脱敏） */
  phone?: string;
  /** 关联驿站名称 */
  stationName?: string;
  onPickedUp?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** 批量管理模式：显示复选框，点卡片即切换选中（此时禁用左滑） */
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

/**
 * 紧凑卡片：一屏能看更多快递。
 * 信息优先级：取件码（最大）> 驿站 > 尾号/格口 > 公司 > 时间。
 * 左滑可删除（PanResponder 实现，不依赖 react-native-gesture-handler）。
 */
export function PackageCard({
  pkg,
  phone,
  stationName,
  onPickedUp,
  onEdit,
  onDelete,
  selectMode,
  selected,
  onToggleSelect,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPicked, setConfirmPicked] = useState(false);
  const pan = useRef(new Animated.Value(0)).current;

  /** 进入批量模式时把滑开的卡片收回去 */
  useEffect(() => {
    if (selectMode) {
      Animated.spring(pan, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    }
  }, [selectMode, pan]);

  const closeSwipe = () => {
    Animated.spring(pan, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  };

  const swipeEnabled = !selectMode && !!onDelete;
  const panResponder = useRef(
    PanResponder.create({
      // 只有横向位移明显大于纵向时才抢手势，避免影响 ScrollView 上下滚动
      onMoveShouldSetPanResponder: (_e, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_e, gs) => {
        const x = Math.max(-SWIPE_WIDTH * 1.25, Math.min(0, gs.dx));
        pan.setValue(x);
      },
      onPanResponderRelease: (_e, gs) => {
        const shouldOpen = gs.dx < -SWIPE_WIDTH / 2 || gs.vx < -0.4;
        Animated.spring(pan, {
          toValue: shouldOpen ? -SWIPE_WIDTH : 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
      onPanResponderTerminate: closeSwipe,
    })
  ).current;

  const copy = async () => {
    if (!pkg.pickupCode) return;
    await Clipboard.setStringAsync(pkg.pickupCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const extras = [pkg.tailNumber ? `尾号${pkg.tailNumber}` : '', pkg.boxNo ? `格口${pkg.boxNo}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ marginBottom: 8 }}>
      {/* 左滑露出的删除区：贴在卡片右侧下方 */}
      {swipeEnabled ? (
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: SWIPE_WIDTH,
            backgroundColor: theme.danger,
            borderRadius: theme.radius,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Pressable
            onPress={() => setConfirmDelete(true)}
            style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 2 }}>删除</Text>
          </Pressable>
        </View>
      ) : null}

      <Animated.View
        style={{ transform: [{ translateX: pan }] }}
        {...(swipeEnabled ? panResponder.panHandlers : {})}
      >
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: theme.radius,
            padding: 8,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? theme.primary : theme.border,
          }}
        >
          <Pressable
            onPress={
              selectMode ? () => onToggleSelect?.(pkg.id) : swipeEnabled ? closeSwipe : undefined
            }
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            {selectMode ? (
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={selected ? theme.primary : theme.sub}
                style={{ marginRight: 8 }}
              />
            ) : null}

            {/* 保持独立取件码牌，稍微加宽以容纳近邻宝长码 */}
            <View
              style={{
                width: 132,
                backgroundColor: theme.primarySoft,
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 7,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 70,
              }}
            >
              <Text style={{ fontSize: 10, color: theme.sub }}>取件码</Text>
              <Text
                style={{ fontSize: 22, fontWeight: '900', color: theme.primary, letterSpacing: 0.2, maxWidth: '100%' }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {pkg.pickupCode ?? '—'}
              </Text>
              {extras ? (
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary, marginTop: 2 }} numberOfLines={1}>
                  {extras}
                </Text>
              ) : null}
            </View>

            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={{ flex: 1, fontSize: 14, fontWeight: '700', color: theme.text }}
                  numberOfLines={1}
                >
                  {pkg.courierCompany}
                </Text>
                <StatusBadge status={pkg.status} />
              </View>
              <Text
                style={{ fontSize: 13, fontWeight: '600', color: theme.text, marginTop: 3 }}
                numberOfLines={1}
              >
                📍 {stationName ?? '未指定驿站'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 }}>
                {phone ? (
                  <MaskedText value={phone} type="phone" style={{ fontSize: 11, color: theme.sub }} />
                ) : null}
                {pkg.arrivedAt ? (
                  <Text style={{ fontSize: 11, color: theme.sub }}>{formatDateTime(pkg.arrivedAt)}</Text>
                ) : null}
              </View>
            </View>
          </Pressable>

          {!selectMode ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 7 }}>
                <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel="复制取件码" style={{ flex: 1, minHeight: 42, borderRadius: 9, borderWidth: 1, borderColor: copied ? theme.success : theme.border, backgroundColor: theme.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={19} color={copied ? theme.success : theme.primary} />
                  <Text style={{ color: copied ? theme.success : theme.text, fontSize: 13, fontWeight: '700' }}>{copied ? '已复制' : '复制取件码'}</Text>
                </Pressable>
                {onPickedUp && pkg.status !== 'PICKED_UP' ? (
                  <Pressable onPress={() => setConfirmPicked(true)} accessibilityRole="button" accessibilityLabel="标记已取" style={{ flex: 1, minHeight: 42, borderRadius: 9, backgroundColor: theme.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Ionicons name="checkmark-done" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>已取</Text>
                  </Pressable>
                ) : pkg.status === 'PICKED_UP' ? (
                  <View style={{ flex: 1, minHeight: 42, borderRadius: 9, backgroundColor: '#EAF5EE', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={19} color={theme.success} />
                    <Text style={{ color: theme.success, fontSize: 14, fontWeight: '800' }}>已取件</Text>
                  </View>
                ) : null}
                {onEdit ? (
                  <Pressable onPress={() => onEdit(pkg.id)} accessibilityRole="button" accessibilityLabel="编辑快递" style={{ width: 42, height: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F3F6' }}>
                    <Ionicons name="create-outline" size={19} color={theme.sub} />
                  </Pressable>
                ) : null}
            </View>
          ) : null}
        </View>
      </Animated.View>

      <ConfirmDialog
        visible={confirmDelete}
        title="删除这条快递？"
        message={`${pkg.courierCompany} · 取件码 ${pkg.pickupCode ?? '—'}`}
        confirmText="删除"
        danger
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete?.(pkg.id);
        }}
        onCancel={() => {
          setConfirmDelete(false);
          closeSwipe();
        }}
      />
      <ConfirmDialog
        visible={confirmPicked}
        title="确定已经取件？"
        confirmText="已取件"
        onConfirm={() => {
          setConfirmPicked(false);
          onPickedUp?.(pkg.id);
        }}
        onCancel={() => setConfirmPicked(false)}
      />
    </View>
  );
}


