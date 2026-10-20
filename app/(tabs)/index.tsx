import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
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
import puppyMascots from '../../assets/pickup-puppies.png';

export default function HomeScreen() {
  const { ready } = useApp();
  const router = useRouter();
  const { summary, loading: dLoading } = useDashboard();
  const { list: pending, markPickedUp, remove } = usePackages({ status: 'PENDING_PICKUP' });
  const { list: stations } = useStations();
  const [sheet, setSheet] = React.useState(false);

  const stationMap = new Map(stations.map((station) => [station.id, station.name]));
  const stationOrder = new Map(stations.map((station, index) => [station.id, index]));
  const groups = new Map<string, { name: string; items: Package[] }>();
  for (const pkg of pending) {
    const stationId = pkg.stationId ?? '';
    if (!groups.has(stationId)) {
      groups.set(stationId, {
        name: pkg.stationId ? stationMap.get(pkg.stationId) ?? '未知驿站' : '未指定驿站',
        items: [],
      });
    }
    groups.get(stationId)!.items.push(pkg);
  }

  // 驿站顺序固定，避免取走某组最新的快递后整组因时间排序而换位置。
  const orderedGroups = [...groups.entries()].sort(([aId, a], [bId, b]) => {
    const aRank = stationOrder.get(aId) ?? Number.MAX_SAFE_INTEGER;
    const bRank = stationOrder.get(bId) ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.name.localeCompare(b.name);
  });

  if (!ready || (dLoading && !summary)) return <LoadingState />;

  const stats = [
    { label: '待取', value: summary?.pendingPickupPackages ?? 0, color: theme.primary, bg: '#FFF0DF', icon: 'cube-outline' as const },
    { label: '今日到站', value: summary?.todayArrived ?? 0, color: theme.success, bg: '#EAF5EE', icon: 'sunny-outline' as const },
    { label: '全部', value: summary?.totalPackages ?? 0, color: '#6A72B8', bg: '#EEF0FF', icon: 'albums-outline' as const },
  ];

  const rows: React.ReactNode[] = [];
  orderedGroups.forEach(([stationId, group], index) => {
    rows.push(
      <View key={`station-${stationId}`} style={{ flexDirection: 'row', alignItems: 'center', marginTop: index === 0 ? 2 : 12, marginBottom: 7 }}>
        <View style={{ width: 29, height: 29, borderRadius: 10, backgroundColor: '#FFF0DF', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
          <Ionicons name="location" size={15} color={theme.primary} />
        </View>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: theme.text }}>{group.name}</Text>
        <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, backgroundColor: '#FFF0DF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>{group.items.length} 件</Text>
      </View>,
    );
    group.items.forEach((pkg) => rows.push(
      <PackageCard
        key={`package-${pkg.id}`}
        pkg={pkg}
        stationName={pkg.stationId ? stationMap.get(pkg.stationId) : undefined}
        onPickedUp={markPickedUp}
        onEdit={(id) => router.push(`/edit?id=${id}`)}
        onDelete={remove}
      />,
    ));
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, backgroundColor: theme.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0DF', borderRadius: 16, minHeight: 82, paddingLeft: 13, paddingVertical: 7, overflow: 'hidden' }}>
          <View style={{ flex: 1, zIndex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#493323' }}>取件助手</Text>
            <Text style={{ fontSize: 10, color: '#94745B', marginTop: 2 }}>今天 {todayStr()} · 一起轻松取件</Text>
            <Pressable
              onPress={() => router.push('/import?auto=1')}
              accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: theme.primary, paddingHorizontal: 10, minHeight: 28, borderRadius: 9, gap: 5, marginTop: 5, transform: [{ scale: pressed ? 0.96 : 1 }] })}
            >
              <Ionicons name="clipboard-outline" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>粘贴导入</Text>
            </Pressable>
          </View>
          <View style={{ width: 92, height: 76, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', right: 5, top: 5, width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFE2BF' }} />
            <Image source={puppyMascots} resizeMode="contain" style={{ width: 92, height: 76 }} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 7, marginTop: 9 }}>
          {stats.map((stat) => (
            <View key={stat.label} style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, borderRadius: 13, gap: 6, paddingHorizontal: 4 }}>
              <View style={{ width: 25, height: 25, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: stat.bg }}>
                <Ionicons name={stat.icon} size={14} color={stat.color} />
              </View>
              <View style={{ alignItems: 'flex-start' }}>
                <Text style={{ color: stat.color, fontSize: 16, lineHeight: 18, fontWeight: '900' }}>{stat.value}</Text>
                <Text style={{ color: theme.sub, fontSize: 9 }}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 2, paddingBottom: 112 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '900', color: theme.text }}>正在等你取</Text>
          <Text style={{ color: theme.sub, fontSize: 11 }}>{pending.length} 个包裹</Text>
        </View>
        {pending.length === 0 ? (
          <EmptyState text="暂无待取快递，点击右下角添加" />
        ) : rows}
      </ScrollView>

      <Pressable
        onPress={() => setSheet(true)}
        accessibilityRole="button"
        accessibilityLabel="添加快递"
        style={({ pressed }) => ({ position: 'absolute', right: 20, bottom: 25, backgroundColor: theme.primary, minWidth: 58, height: 54, paddingHorizontal: 16, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, elevation: 4, transform: [{ scale: pressed ? 0.95 : 1 }] })}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>添加</Text>
      </Pressable>

      <ActionSheet
        visible={sheet}
        title="添加快递"
        options={[
          { label: '📋 剪贴板一键导入', onPress: () => router.push('/import?auto=1') },
          { label: '✍ 手动输入', onPress: () => router.push('/add') },
          { label: '📝 粘贴物流信息', onPress: () => router.push('/import') },
        ]}
        onCancel={() => setSheet(false)}
      />
    </View>
  );
}
