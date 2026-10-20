import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePackages } from '@/state/usePackages';
import { useStations } from '@/state/useStations';
import { LoadingState } from '@/ui/LoadingState';
import { theme } from '@/ui/theme';
import { todayStr } from '@/utils';
import type { Package } from '@/types';

type Mode = 'week' | 'month';

function dateAt(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
function dateKey(date: Date): string { return todayStr(date); }
function shiftDate(value: string, amount: number): string {
  const date = dateAt(value);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}
function periodDays(selected: string, mode: Mode): string[] {
  const date = dateAt(selected);
  if (mode === 'week') {
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => shiftDate(dateKey(monday), index));
  }
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Array.from({ length: count }, (_, index) => shiftDate(dateKey(first), index));
}
function eventDate(pkg: Package, type: 'arrival' | 'pickup'): string | undefined {
  const value = type === 'pickup' ? pkg.pickedUpAt : pkg.arrivedAt ?? pkg.createdAt;
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : dateKey(parsed);
}
function formatDay(value: string): string {
  const date = dateAt(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
function periodTitle(value: string, mode: Mode): string {
  const date = dateAt(value);
  if (mode === 'month') return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  const dates = periodDays(value, 'week');
  return `${formatDay(dates[0])} — ${formatDay(dates[6])}`;
}
function eventTime(value?: string): string {
  if (!value) return '时间未知';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '时间未知'
    : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
function countByDate(packages: Package[], date: string, type: 'arrival' | 'pickup'): Package[] {
  return packages.filter((pkg) => eventDate(pkg, type) === date);
}

export default function StatsScreen() {
  const router = useRouter();
  const { list: packages, loading } = usePackages();
  const { list: stations } = useStations();
  const [mode, setMode] = React.useState<Mode>('week');
  const [selected, setSelected] = React.useState(todayStr());
  const days = React.useMemo(() => periodDays(selected, mode), [selected, mode]);
  const stationNames = React.useMemo(
    () => new Map(stations.map((station) => [station.id, station.name])),
    [stations],
  );
  const arrivals = React.useMemo(() => packages.filter((pkg) => {
    const day = eventDate(pkg, 'arrival');
    return !!day && days[0] <= day && day <= days[days.length - 1];
  }), [packages, days]);
  const pickups = React.useMemo(() => packages.filter((pkg) => {
    const day = eventDate(pkg, 'pickup');
    return !!day && days[0] <= day && day <= days[days.length - 1];
  }), [packages, days]);
  const selectedArrivals = countByDate(packages, selected, 'arrival');
  const selectedPickups = countByDate(packages, selected, 'pickup');
  const maxCount = Math.max(
    1,
    ...days.map((day) =>
      countByDate(packages, day, 'arrival').length + countByDate(packages, day, 'pickup').length,
    ),
  );

  const movePeriod = (step: number) => {
    const date = dateAt(selected);
    if (mode === 'week') date.setDate(date.getDate() + step * 7);
    else {
      const day = date.getDate();
      date.setDate(1);
      date.setMonth(date.getMonth() + step);
      date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
    }
    setSelected(dateKey(date));
  };

  const stationCounts = new Map<string, number>();
  for (const pkg of arrivals) {
    const name = pkg.stationId ? stationNames.get(pkg.stationId) ?? '未知驿站' : '未指定驿站';
    stationCounts.set(name, (stationCounts.get(name) ?? 0) + 1);
  }
  const rankedStations = [...stationCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topStationCount = Math.max(1, ...rankedStations.map(([, count]) => count));
  const weekday = (value: string) => ['日', '一', '二', '三', '四', '五', '六'][dateAt(value).getDay()];

  if (loading) return <LoadingState />;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="返回首页"
            hitSlop={10}
            style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', marginRight: 12, transform: [{ scale: pressed ? 0.94 : 1 }] })}
          >
            <Ionicons name="arrow-back" size={21} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>取件统计</Text>
            <Text style={{ fontSize: 12, color: theme.sub, marginTop: 2 }}>看看最近的收件和取件节奏</Text>
          </View>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#EAF5EE', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="sparkles" size={21} color={theme.success} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: '#E9EBEF', padding: 4, borderRadius: 14, marginBottom: 12 }}>
          {(['week', 'month'] as const).map((item) => {
            const active = mode === item;
            return (
              <Pressable
                key={item}
                onPress={() => setMode(item)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: active ? theme.primary : 'transparent', transform: [{ scale: pressed ? 0.97 : 1 }] })}
              >
                <Ionicons name={item === 'week' ? 'calendar-outline' : 'albums-outline'} size={17} color={active ? '#fff' : theme.sub} />
                <Text style={{ color: active ? '#fff' : theme.sub, fontWeight: '800' }}>{item === 'week' ? '本周' : '本月'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <PeriodArrow direction="left" onPress={() => movePeriod(-1)} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>{periodTitle(selected, mode)}</Text>
            <Text style={{ color: theme.sub, fontSize: 11, marginTop: 2 }}>点选日期可看当天明细</Text>
          </View>
          <PeriodArrow direction="right" onPress={() => movePeriod(1)} />
        </View>

        <View style={{ backgroundColor: '#FFF0DF', borderRadius: 20, padding: 16, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', right: -16, top: -24, width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFE0B8' }} />
          <View style={{ position: 'absolute', right: 54, bottom: -45, width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFE8CE' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="stats-chart" size={16} color={theme.primary} />
            </View>
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '900' }}>{mode === 'week' ? '本周区间统计' : '本月区间统计'}</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="cube-outline" size={18} color="#D77A20" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <RangeMetric icon="download-outline" label="入库包裹" value={arrivals.length} tint="#FFF9F1" color={theme.primary} />
            <RangeMetric icon="checkmark-done-outline" label="完成取件" value={pickups.length} tint="#F2FBF5" color={theme.success} />
          </View>
          <Text style={{ color: '#8F7055', fontSize: 11, marginTop: 10 }}>按到站/记录日期与标记取件日期分别统计</Text>
        </View>

        <SectionHeading icon="bar-chart-outline" title="每日趋势" subtitle="入库与取件" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 2 }}>
          {days.map((day) => {
            const arrivalCount = countByDate(packages, day, 'arrival').length;
            const pickupCount = countByDate(packages, day, 'pickup').length;
            const total = arrivalCount + pickupCount;
            const isSelected = selected === day;
            return (
              <Pressable
                key={day}
                onPress={() => setSelected(day)}
                accessibilityRole="button"
                accessibilityLabel={`${formatDay(day)}，入库 ${arrivalCount} 件，取件 ${pickupCount} 件`}
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => ({ width: mode === 'week' ? 44 : 35, minHeight: 137, alignItems: 'center', justifyContent: 'flex-end', padding: 4, borderRadius: 14, backgroundColor: isSelected ? '#FFE7CC' : theme.card, borderWidth: isSelected ? 1 : 0, borderColor: theme.primary, transform: [{ scale: pressed ? 0.94 : 1 }] })}
              >
                <Text style={{ color: isSelected ? theme.primary : theme.text, fontSize: 11, fontWeight: '900' }}>{total || '·'}</Text>
                <View style={{ height: 78, width: mode === 'week' ? 22 : 17, justifyContent: 'flex-end', marginTop: 4 }}>
                  {total > 0 ? (
                    <View style={{ height: Math.max(7, (total / maxCount) * 78), borderRadius: 7, overflow: 'hidden', justifyContent: 'flex-end' }}>
                      <View style={{ height: `${(arrivalCount / total) * 100}%`, backgroundColor: theme.primary }} />
                      <View style={{ height: `${(pickupCount / total) * 100}%`, backgroundColor: theme.success }} />
                    </View>
                  ) : <View style={{ height: 2, backgroundColor: '#E4E6EA' }} />}
                </View>
                <Text style={{ color: isSelected ? theme.primary : theme.sub, fontSize: 10, fontWeight: isSelected ? '900' : '600', marginTop: 6 }}>
                  {mode === 'week' ? `周${weekday(day)}` : dateAt(day).getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 9, marginBottom: 4 }}>
          <Legend color={theme.primary} label="入库" />
          <Legend color={theme.success} label="取件" />
          <Pressable
            onPress={() => setSelected(todayStr())}
            style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFF0DF', transform: [{ scale: pressed ? 0.96 : 1 }] })}
          >
            <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>回到今天</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 3 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>{formatDay(selected)} · 当日明细</Text>
            <Text style={{ color: theme.sub, fontSize: 12, marginTop: 3 }}>入库和取件分开展示</Text>
          </View>
          <View style={{ backgroundColor: '#fff', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12 }}>
            <Text style={{ color: theme.text, fontSize: 12, fontWeight: '800' }}>{selectedArrivals.length + selectedPickups.length} 项记录</Text>
          </View>
        </View>
        <EventSection
          title="入库"
          icon="download-outline"
          count={selectedArrivals.length}
          color={theme.primary}
          packages={selectedArrivals}
          stationNames={stationNames}
          timeFor={(pkg) => pkg.arrivedAt ? `到站 ${eventTime(pkg.arrivedAt)}` : `记录 ${eventTime(pkg.createdAt)}`}
          onPackagePress={(id) => router.push(`/edit?id=${id}`)}
        />
        <EventSection
          title="取件"
          icon="checkmark-done-outline"
          count={selectedPickups.length}
          color={theme.success}
          packages={selectedPickups}
          stationNames={stationNames}
          timeFor={(pkg) => `取件 ${eventTime(pkg.pickedUpAt)}`}
          onPackagePress={(id) => router.push(`/edit?id=${id}`)}
        />

        <SectionHeading icon="location-outline" title="区间驿站分布" subtitle="按入库件数" />
        <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 14 }}>
          {rankedStations.length ? rankedStations.map(([name, count], index) => (
            <View key={name} style={{ marginTop: index === 0 ? 0 : 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
                <View style={{ width: 25, height: 25, borderRadius: 9, backgroundColor: index === 0 ? '#FFF0DF' : '#F1F3F6', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                  <Text style={{ color: index === 0 ? theme.primary : theme.sub, fontSize: 11, fontWeight: '900' }}>{index + 1}</Text>
                </View>
                <Text style={{ flex: 1, color: theme.text, fontSize: 13, fontWeight: '700' }}>{name}</Text>
                <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '900' }}>{count} 件</Text>
              </View>
              <View style={{ height: 7, backgroundColor: '#F0F1F3', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${(count / topStationCount) * 100}%`, height: '100%', backgroundColor: index === 0 ? theme.primary : '#FFB35C', borderRadius: 4 }} />
              </View>
            </View>
          )) : <EmptyNote text="本区间暂无入库记录" />}
        </View>
      </ScrollView>
    </View>
  );
}

function PeriodArrow({ direction, onPress }: { direction: 'left' | 'right'; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={direction === 'left' ? '上一周期' : '下一周期'}
      style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] })}
    >
      <Ionicons name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} size={20} color={theme.text} />
    </Pressable>
  );
}

function RangeMetric({ icon, label, value, tint, color }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: number; tint: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: tint, borderRadius: 15, padding: 13, minHeight: 91 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.sub, fontSize: 12, fontWeight: '700' }}>{label}</Text>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={{ color, fontSize: 29, fontWeight: '900', marginTop: 5 }}>{value}<Text style={{ fontSize: 12, fontWeight: '700' }}> 件</Text></Text>
    </View>
  );
}

function SectionHeading({ icon, title, subtitle }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; subtitle: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 23, marginBottom: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', marginRight: 9 }}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>{title}</Text>
        <Text style={{ color: theme.sub, fontSize: 11, marginTop: 1 }}>{subtitle}</Text>
      </View>
    </View>
  );
}

function EventSection({ title, icon, count, color, packages, stationNames, timeFor, onPackagePress }: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  count: number;
  color: string;
  packages: Package[];
  stationNames: Map<string, string>;
  timeFor: (pkg: Package) => string;
  onPackagePress: (id: string) => void;
}) {
  return (
    <View style={{ marginTop: 13 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 }}>
        <Ionicons name={icon} size={17} color={color} />
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '900' }}>{title}</Text>
        <View style={{ backgroundColor: color === theme.success ? '#EAF5EE' : '#FFF0DF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
          <Text style={{ color, fontSize: 11, fontWeight: '900' }}>{count} 件</Text>
        </View>
      </View>
      {packages.length ? packages.map((pkg) => (
        <Pressable
          key={`${title}-${pkg.id}`}
          onPress={() => onPackagePress(pkg.id)}
          style={({ pressed }) => ({ backgroundColor: theme.card, borderRadius: 15, padding: 13, marginTop: 7, borderWidth: 1, borderColor: pressed ? color : theme.border, transform: [{ scale: pressed ? 0.99 : 1 }] })}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>{pkg.courierCompany || '快递'}</Text>
            <Text style={{ color: theme.sub, fontSize: 11 }}>{timeFor(pkg)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
            <Text style={{ color, fontWeight: '900', fontSize: 22 }}>{pkg.pickupCode || '暂无取件码'}</Text>
            <Ionicons name="chevron-forward" size={17} color={theme.sub} />
          </View>
          <Text style={{ color: theme.sub, fontSize: 12, marginTop: 2 }}>
            📍 {pkg.stationId ? stationNames.get(pkg.stationId) ?? '未知驿站' : '未指定驿站'}
            {pkg.boxNo ? ` · ${pkg.boxNo}` : ''}{pkg.tailNumber ? ` · 尾号${pkg.tailNumber}` : ''}
          </Text>
        </Pressable>
      )) : <EmptyNote text={`当天没有${title}记录`} />}
    </View>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <View style={{ paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', backgroundColor: '#FFFFFFA8', borderRadius: 13, marginTop: 6 }}>
      <Ionicons name="leaf-outline" size={18} color="#A6ADB7" />
      <Text style={{ color: theme.sub, fontSize: 12, marginTop: 4 }}>{text}</Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
      <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: color }} />
      <Text style={{ color: theme.sub, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
