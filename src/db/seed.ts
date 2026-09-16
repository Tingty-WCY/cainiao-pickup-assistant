import type { StationType } from '../types';

/**
 * MVP 没有「用户管理」页面，所有数据都挂在默认用户下。
 * 真实 SQLite 中该用户在首次启动时由迁移写入；内存实现在 init() 中保证其存在。
 */
export const DEFAULT_USER_ID = 'default-user';
export const DEFAULT_USER_NAME = '默认用户';

/**
 * 系统账号 —— 应用层完全不可见。
 *
 * 背景（2026-09-16）：账号功能已整体移除。原因是「手动加快递」时总要挑一个归属，
 * 识别不出来就自动生成「未分类」账号，纯属负担。
 *
 * 但数据库里那条记录必须留着，原因：
 *   老机上的 packages 表定义为
 *     account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE
 *   SQLite 没法直接摘掉一列的 NOT NULL / 外键（只能整表重建，风险高），
 *   所以让所有快递的 account_id 都指向这一条记录，满足约束即可。
 *   界面上不展示，也没有任何账号的增删改入口。
 */
export const SYSTEM_ACCOUNT_ID = 'system-account';
export const SYSTEM_ACCOUNT_NICKNAME = '系统';

/**
 * 预置驿站 —— 写死的 6 个。
 *
 * 背景（2026-09-16）：以前每解析一条短信，驿站名匹配不上就自动建档，导致驿站表爆炸
 * （「中央民族大学京东服务站」「中央民族大学丰台校区快递服务中心」「学生公寓西侧9号柜X27」
 * 其实都是同几个地方）。用户实际只去这几个点，所以改成固定 6 个，
 * **其余一律归入 DEFAULT_STATION_ID（菜鸟）**。
 *
 * 维护方式：改这张表 + 在 `src/services/stationMatch.ts` 的关键词表里登记即可。
 */
export const FIXED_STATIONS: { id: string; name: string; type: StationType }[] = [
  { id: 'station-jd', name: '京东', type: 'JD' },
  { id: 'station-post', name: '邮政', type: 'OTHER' },
  { id: 'station-cainiao', name: '菜鸟', type: 'CAINIAO' },
  { id: 'station-jinlinbao', name: '近邻宝', type: 'LOCKER' },
  { id: 'station-sf', name: '顺丰', type: 'OTHER' },
  { id: 'station-deppon', name: '德邦', type: 'OTHER' },
];

/** 兜底驿站：认不出来的一律归这里 */
export const DEFAULT_STATION_ID = 'station-cainiao';

/** 预置驿站 id 集合（预置的不允许删除） */
export const FIXED_STATION_IDS = FIXED_STATIONS.map((s) => s.id);

/** 是否是预置驿站 */
export function isFixedStation(id: string): boolean {
  return FIXED_STATION_IDS.includes(id);
}
