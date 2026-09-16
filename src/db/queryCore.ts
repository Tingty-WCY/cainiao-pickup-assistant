// ============================================================================
// 纯函数查询核心：被 MemoryDbClient 与 ExpoDbClient 共用，
// 保证「内存实现」与「SQLite 实现」的筛选/排序/聚合行为完全一致。
// 不依赖任何具体存储，只操作传入的数组。
// ============================================================================
import type {
  CreatePackageInput,
  DashboardSummary,
  Package,
  PackageQuery,
  Station,
  StationSummary,
} from '../types';
import { matchDuplicate } from '../dedupe';

const STATUS_ORDER: Record<string, number> = {
  PENDING_PICKUP: 0,
  SHIPPING: 1,
  EXCEPTION: 2,
  PICKED_UP: 3,
  UNKNOWN: 4,
};

/** 应用 PackageQuery 过滤 + 排序（与首页/快递页一致）。 */
export function applyPackageQuery(
  packages: Package[],
  stations: Station[],
  query?: PackageQuery,
): Package[] {
  let res = [...packages];
  const stationMap = new Map(stations.map((s) => [s.id, s.name]));

  if (query?.status) res = res.filter((p) => p.status === query.status);
  if (query?.stationId) res = res.filter((p) => p.stationId === query.stationId);
  if (query?.courierCompany) {
    res = res.filter((p) => p.courierCompany === query.courierCompany);
  }
  if (query?.startDate) {
    res = res.filter((p) => !!p.arrivedAt && p.arrivedAt >= query.startDate!);
  }
  if (query?.endDate) {
    res = res.filter((p) => !!p.arrivedAt && p.arrivedAt <= query.endDate!);
  }
  if (query?.keyword && query.keyword.trim()) {
    const kw = query.keyword.trim().toLowerCase();
    res = res.filter((p) => {
      const stationName = p.stationId ? stationMap.get(p.stationId) ?? '' : '';
      const hay = [
        p.pickupCode,
        p.trackingNumber,
        p.tailNumber,
        p.boxNo,
        p.courierCompany,
        stationName,
        p.remark,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(kw);
    });
  }

  res.sort((a, b) => {
    // 驿站聚焦：目标驿站的快递一律排最前（只是置顶，不筛掉其他快递）
    if (query?.focusStationId) {
      const fa = a.stationId === query.focusStationId ? 0 : 1;
      const fb = b.stationId === query.focusStationId ? 0 : 1;
      if (fa !== fb) return fa - fb;
    }
    const sa = STATUS_ORDER[a.status] ?? 99;
    const sb = STATUS_ORDER[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    const ta = a.arrivedAt ?? a.createdAt;
    const tb = b.arrivedAt ?? b.createdAt;
    return tb.localeCompare(ta);
  });

  if (query?.page && query?.pageSize) {
    const start = (query.page - 1) * query.pageSize;
    res = res.slice(start, start + query.pageSize);
  }
  return res;
}

/** 首页聚合：待取数、今日到站、按驿站分组、最近待取。 */
export function computeSummary(packages: Package[], stations: Station[]): DashboardSummary {
  const pending = packages.filter((p) => p.status === 'PENDING_PICKUP');
  const shipping = packages.filter((p) => p.status === 'SHIPPING');
  const pickedUp = packages.filter((p) => p.status === 'PICKED_UP');
  const waiting = packages.filter(
    (p) => p.status === 'PENDING_PICKUP' || p.status === 'SHIPPING',
  );
  const today = new Date().toISOString().slice(0, 10);
  const todayArrived = packages.filter(
    (p) => !!p.arrivedAt && p.arrivedAt.slice(0, 10) === today,
  );

  const stationMap = new Map(stations.map((s) => [s.id, s]));
  const stationAgg = new Map<string, number>();
  for (const p of pending) {
    if (!p.stationId) continue;
    stationAgg.set(p.stationId, (stationAgg.get(p.stationId) ?? 0) + 1);
  }
  const stationSummaries: StationSummary[] = [...stationAgg.entries()]
    .map(([stationId, pendingCount]) => {
      const st = stationMap.get(stationId);
      return {
        stationId,
        stationName: st?.name ?? '未知驿站',
        stationType: st?.type ?? 'OTHER',
        pendingCount,
      };
    })
    .sort((a, b) => b.pendingCount - a.pendingCount);

  const recentPackages = [...pending]
    .sort((a, b) =>
      (b.arrivedAt ?? b.createdAt).localeCompare(a.arrivedAt ?? a.createdAt),
    )
    .slice(0, 10);

  return {
    totalPackages: packages.length,
    waitingPackages: waiting.length,
    shippingPackages: shipping.length,
    pendingPickupPackages: pending.length,
    pickedUpPackages: pickedUp.length,
    todayArrived: todayArrived.length,
    stations: stationSummaries,
    recentPackages,
  };
}

/** 在给定候选列表中查找重复（复用应用层去重规则）。 */
export function findDuplicateId(input: CreatePackageInput, packages: Package[]): string | null {
  return matchDuplicate(input, packages);
}
