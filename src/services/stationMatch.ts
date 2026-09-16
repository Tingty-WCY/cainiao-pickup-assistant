import type { Station } from '../types';
import { DEFAULT_STATION_ID, FIXED_STATION_IDS } from '../db/seed';

/**
 * 用解析出的驿站名匹配已有驿站：完全一致 > 互相包含。
 * 返回 undefined 表示库里没有。
 *
 * 注意（2026-09-16）：驿站已改为写死的 6 个预置站点，解析短信请用
 * `resolveFixedStationId()`。此函数仅保留给「按名字查找」这类场景。
 */
export function findStationByName(stations: Station[], name?: string): Station | undefined {
  const n = (name || '').trim();
  if (!n) return undefined;
  return (
    stations.find((s) => s.name === n) ??
    stations.find((s) => s.name.includes(n) || n.includes(s.name))
  );
}

/**
 * 品牌关键词 → 预置驿站 id，**按顺序匹配、先命中者优先**，所以要在泛词之前。
 *
 * 这里只放「品牌名」，不放「驿站 / 快递 / 服务中心 / 柜」这类泛词 ——
 * 那些命中不了任何品牌，自然落到 DEFAULT_STATION_ID（菜鸟）。
 */
const BRAND_KEYWORDS: { id: string; keywords: string[] }[] = [
  { id: 'station-jd', keywords: ['京东', 'jdl'] },
  { id: 'station-post', keywords: ['邮政', 'ems'] },
  { id: 'station-sf', keywords: ['顺丰', 'sfexpress'] },
  { id: 'station-deppon', keywords: ['德邦', 'deppon'] },
  { id: 'station-jinlinbao', keywords: ['近邻宝'] },
  { id: 'station-cainiao', keywords: ['菜鸟'] },
];

function matchBrand(text?: string): string | undefined {
  const t = (text || '').trim().toLowerCase();
  if (!t) return undefined;
  for (const { id, keywords } of BRAND_KEYWORDS) {
    if (keywords.some((k) => t.includes(k))) return id;
  }
  return undefined;
}

/**
 * 把「驿站名 + 快递公司」归到 6 个预置驿站之一。
 *
 * 优先看驿站名（更精确，如「中央民族大学京东服务站」→ 京东）；
 * 驿站名认不出时再看快递公司（如驿站名是「北京市海淀区民大店」、公司是顺丰 → 顺丰）；
 * 都认不出 → DEFAULT_STATION_ID（菜鸟）。
 *
 * 这样就不会再每来一条短信就新建一个驿站了。
 */
export function resolveFixedStationId(stationName?: string, courierCompany?: string): string {
  return matchBrand(stationName) ?? matchBrand(courierCompany) ?? DEFAULT_STATION_ID;
}

/**
 * 规划驿站合并：算出哪些「非预置驿站」该并到哪个预置驿站。
 *
 * 纯函数，供 ExpoDbClient 在启动时执行（把 packages.station_id 改过去，再删掉杂项站点）。
 * 单独抽出来是为了能直接单测 —— 这段逻辑会改动用户已有数据，不能只靠手点验证。
 *
 * @returns 形如 `[{ from: '旧驿站id', to: '预置驿站id' }]`；无需合并时为空数组
 */
export function planStationMerge(stations: Station[]): { from: string; to: string }[] {
  const fixedIds = new Set(FIXED_STATION_IDS);
  return stations
    .filter((s) => !fixedIds.has(s.id))
    .map((s) => ({ from: s.id, to: resolveFixedStationId(s.name) }))
    .filter((m) => fixedIds.has(m.to));
}
