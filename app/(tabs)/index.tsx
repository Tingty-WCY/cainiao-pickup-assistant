import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/state/AppContext';
import { useDashboard } from '@/state/useDashboard';
import { usePackages } from '@/state/usePackages';
import { useStations } from '@/state/useStations';
import { PackageCard } from '@/ui/PackageCard';
import { ActionSheet } from '@/ui/ActionSheet';
import { LoadingState } from '@/ui/LoadingState';
import { EmptyState } from '@/ui/EmptyState';
import { theme } from '@/ui/theme';
import { todayStr } from '@/utils';
import type { Package } from '@/types';

export default function HomeScreen() {
  const { ready } = useApp();
  const router = useRouter();
  const { summary, loading: dLoading } = useDashboard();
  const { list: pending, markPickedUp, remove } = usePackages({ status: 'PENDING_PICKUP' });
  const { list: stations } = useStations();
  const [sheet, setSheet] = React.useState(false);

  const stationMap = new Map(stations.map((s) => [s.id, s.name]));

  const groups = new Map<string, { name: string; items: Package[] }>();
  for (const p of pending) {
    const sid = p.stationId ?? '';
    if (!groups.has(sid)) {
      groups.set(sid, {
        name: p.stationId ? stationMap.get(p.stationId) ?? '未知驿站' : '未指定驿站',
        items: [],
      });
    }
    groups.get(sid)!.items.push(p);
  }

  if (!ready || dLoading) return <LoadingState />;

  const stats = [
    { label: '待取快递', value: summary?.pendingPickupPackages ?? 0, color: theme.primary },
    { label: '今日到站', value: summary?.todayArrived ?? 0, color: theme.success },
    { label: '全部快递', value: summary?.totalPackages ?? 0, color: theme.text },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          padding: 16,
          paddingTop: 24,
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={{ fontSize: 19, fontWeight: '800', color: theme.text }}>📦 取件助手</Text>
            <Text style={{ fontSize: 12, color: theme.sub, marginTop: 2 }}>今天 {todayStr()}</Text>
          </View>
          {/* 一键导入：剪贴板里复制好短信后，点这里直接解析 */}
          <Pressable
            onPress={() => router.push('/import?auto=1')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.primary,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              gap: 5,
            }}
          >
            <Ionicons name="clipboard-outline" size={15} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>一键导入</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
          {stats.map((s) => (
            <View
              key={s.label}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.bg,
                borderRadius: 10,
                paddingVertical: 7,
                gap: 5,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '800', color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: theme.sub }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 12 }}>
          待取快递
        </Text>
        {pending.length === 0 ? (
          <EmptyState text="暂无待取快递，点击右下角添加" />
        ) : (
          [...groups.entries()].map(([sid, g]) => (
            <View key={sid} style={{ marginBottom: 16 }}>
              <Text
                style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 8 }}
              >
                📍 {g.name} · {g.items.length} 件
              </Text>
              {g.items.map((p) => (
                <PackageCard
                  key={p.id}
                  pkg={p}
                  stationName={p.stationId ? stationMap.get(p.stationId) : undefined}
                  onPickedUp={markPickedUp}
                  onEdit={(id) => router.push(`/edit?id=${id}`)}
                  onDelete={(id) => remove(id)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

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

      <ActionSheet
        visible={sheet}
        title="添加快递"
        options={[
          { label: '📋 剪贴板一键导入（推荐）', onPress: () => router.push('/import?auto=1') },
          { label: '✍ 手动输入', onPress: () => router.push('/add') },
          { label: '📝 粘贴物流信息', onPress: () => router.push('/import') },
        ]}
        onCancel={() => setSheet(false)}
      />
    </View>
  );
}
