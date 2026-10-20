import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/state/AppContext';
import { usePackages } from '@/state/usePackages';
import { useStations } from '@/state/useStations';
import { PackageCard } from '@/ui/PackageCard';
import { ActionSheet } from '@/ui/ActionSheet';
import { LoadingState } from '@/ui/LoadingState';
import { EmptyState } from '@/ui/EmptyState';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { theme } from '@/ui/theme';
import { STATUS_LABELS } from '@/ui/labels';
import type { PackageStatus } from '@/types';

const FILTERS: { key: PackageStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '全部' },
  { key: 'PENDING_PICKUP', label: STATUS_LABELS.PENDING_PICKUP },
  { key: 'SHIPPING', label: STATUS_LABELS.SHIPPING },
  { key: 'PICKED_UP', label: STATUS_LABELS.PICKED_UP },
  { key: 'EXCEPTION', label: STATUS_LABELS.EXCEPTION },
];

export default function PackagesScreen() {
  const { ready } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialStation = typeof params.stationId === 'string' ? params.stationId : undefined;
  const paramFocus = typeof params.focusStationId === 'string' ? params.focusStationId : undefined;
  const initialStatusParam = typeof params.status === 'string' ? params.status : 'ALL';
  const initialStatus =
    initialStatusParam === 'ALL' || initialStatusParam === 'PENDING_PICKUP' || initialStatusParam === 'SHIPPING' || initialStatusParam === 'PICKED_UP' || initialStatusParam === 'EXCEPTION'
      ? (initialStatusParam as PackageStatus | 'ALL')
      : 'ALL';
  const [keyword, setKeyword] = React.useState('');
  const [status, setStatus] = React.useState<PackageStatus | 'ALL'>(initialStatus);
  const [stationId, setStationId] = React.useState<string | undefined>(initialStation);
  /** 从驿站页跳进来时聚焦的驿站：它的快递置顶显示（不筛掉其他快递） */
  const [focusId, setFocusId] = React.useState<string | undefined>(paramFocus);

  // ⚠️ tab 页不会重新挂载，useState 的初值只在首次生效 —— 从驿站页再点「查看快递」时
  // 参数变了 state 却不跟着变，这正是「点了查看快递没反应」的根因。必须用 effect 同步。
  React.useEffect(() => {
    setFocusId(paramFocus);
  }, [paramFocus]);
  const [sheet, setSheet] = React.useState(false);
  const [stationPicker, setStationPicker] = React.useState(false);
  /** 批量管理模式 */
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = React.useState(false);

  const { list, loading, markPickedUp, remove } = usePackages({
    keyword: keyword || undefined,
    status: status === 'ALL' ? undefined : status,
    stationId,
    focusStationId: focusId,
  });
  const { list: stations } = useStations();

  const stationMap = new Map(stations.map((s) => [s.id, s.name]));

  const allSelected = list.length > 0 && selected.length === list.length;
  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const exitSelect = () => {
    setSelectMode(false);
    setSelected([]);
  };
  const doBulkDelete = async () => {
    for (const id of selected) {
      await remove(id);
    }
    exitSelect();
  };

  if (!ready) return <LoadingState />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          padding: 14,
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="搜索取件码 / 单号 / 驿站 / 公司"
            placeholderTextColor={theme.sub}
            style={{
              flex: 1,
              backgroundColor: theme.bg,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 9,
              fontSize: 14,
              color: theme.text,
            }}
          />
          <Pressable
            onPress={() => (selectMode ? exitSelect() : setSelectMode(true))}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: selectMode ? theme.primarySoft : theme.bg,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: selectMode ? theme.primary : theme.sub }}>
              {selectMode ? '完成' : '批量'}
            </Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {FILTERS.map((f) => {
            const active = status === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setStatus(f.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 999,
                  marginRight: 8,
                  backgroundColor: active ? theme.primary : theme.bg,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                }}
              >
                <Text style={{ fontSize: 13, color: active ? '#fff' : theme.sub, fontWeight: '600' }}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setStationPicker(true)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              marginRight: 8,
              backgroundColor: stationId ? theme.primarySoft : theme.bg,
              borderWidth: 1,
              borderColor: stationId ? theme.primary : theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: stationId ? theme.primary : theme.sub,
                fontWeight: '600',
              }}
            >
              {stationId ? stationMap.get(stationId) ?? '驿站' : '全部驿站'}
            </Text>
          </Pressable>
        </ScrollView>

        <Pressable
          onPress={() => router.push('/stats')}
          accessibilityRole="button"
          accessibilityLabel="查看取件统计"
          style={({ pressed }) => ({
            alignSelf: 'flex-end',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            marginTop: 8,
            paddingHorizontal: 10,
            minHeight: 30,
            borderRadius: 9,
            backgroundColor: '#F0EFFF',
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Text style={{ color: '#6A72B8', fontWeight: '700', fontSize: 12 }}>查看取件统计</Text>
          <Text style={{ color: '#6A72B8', fontSize: 13 }}>›</Text>
        </Pressable>

        {focusId && stationMap.get(focusId) ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: theme.primarySoft,
            }}
          >
            <Text style={{ fontSize: 13, color: theme.primary, fontWeight: '600' }}>
              📍 {stationMap.get(focusId)} 的快递已置顶
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable onPress={() => setStationId(stationId ? undefined : focusId)}>
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '700' }}>
                  {stationId ? '显示全部' : '只看这个'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setFocusId(undefined);
                  setStationId(undefined);
                }}
              >
                <Text style={{ fontSize: 13, color: theme.sub }}>✕</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
        {loading ? (
          <LoadingState />
        ) : list.length === 0 ? (
          <EmptyState text="没有匹配的快递" />
        ) : (
          list.map((p) => (
            <PackageCard
              key={p.id}
              pkg={p}
              stationName={p.stationId ? stationMap.get(p.stationId) : undefined}
              onPickedUp={markPickedUp}
              onEdit={(id) => router.push(`/edit?id=${id}`)}
              onDelete={(id) => remove(id)}
              selectMode={selectMode}
              selected={selected.includes(p.id)}
              onToggleSelect={toggleSelect}
            />
          ))
        )}
      </ScrollView>

      {/* 批量操作栏：仅管理模式显示 */}
      {selectMode ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: theme.card,
            borderTopWidth: 1,
            borderColor: theme.border,
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => (allSelected ? setSelected([]) : setSelected(list.map((p) => p.id)))}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.primary }}>
              {allSelected ? '取消全选' : '全选'}
            </Text>
          </Pressable>
          <Text style={{ flex: 1, fontSize: 13, color: theme.sub }}>
            已选 {selected.length} / {list.length} 件
          </Text>
          <Pressable
            onPress={() => setConfirmBulk(true)}
            disabled={selected.length === 0}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: selected.length === 0 ? theme.border : theme.danger,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>删除</Text>
          </Pressable>
        </View>
      ) : null}

      {!selectMode ? (
        <Pressable
          onPress={() => setSheet(true)}
          style={{
            position: 'absolute',
            right: 20,
            bottom: 28,
            backgroundColor: theme.primary,
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 4,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>+</Text>
        </Pressable>
      ) : null}
      <ActionSheet
        visible={sheet}
        title="添加快递"
        options={[
          { label: '✍ 手动输入', onPress: () => router.push('/add') },
          { label: '📋 粘贴物流信息', onPress: () => router.push('/import') },
        ]}
        onCancel={() => setSheet(false)}
      />
      <ActionSheet
        visible={stationPicker}
        title="按驿站筛选"
        options={[
          { label: '全部驿站', onPress: () => setStationId(undefined) },
          ...stations.map((s) => ({ label: s.name, onPress: () => setStationId(s.id) })),
        ]}
        onCancel={() => setStationPicker(false)}
      />
      <ConfirmDialog
        visible={confirmBulk}
        title={`删除选中的 ${selected.length} 条快递？`}
        message="删除后无法恢复。"
        confirmText="删除"
        danger
        onConfirm={() => {
          setConfirmBulk(false);
          void doBulkDelete();
        }}
        onCancel={() => setConfirmBulk(false)}
      />
    </View>
  );
}
