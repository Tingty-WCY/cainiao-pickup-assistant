import type { DbClient } from './types';
import type { CreatePackageInput } from '../types';
import { nowISO } from '../utils';

/**
 * 演示数据（仅用于本机首次运行验证，全部为虚构数据）。
 * 通过「设置 → 载入演示数据」一键写入，便于在没有真实快递时也能走通全部页面。
 *
 * 幂等：只要库里已有带「【演示】」标记的快递就不再写入，重复点击安全。
 *
 * 注意（2026-09-16）：驿站已改为写死的 6 个（见 seed.ts 的 FIXED_STATIONS），
 * 这里不再创建驿站，直接把演示快递挂到预置驿站上。
 */

const DEMO_MARK = '【演示】';

export interface DemoLoadResult {
  loaded: boolean;
  reason?: string;
  counts?: { packages: number };
}

export async function loadDemoData(db: DbClient): Promise<DemoLoadResult> {
  const existing = await db.listPackages();
  if (existing.some((p) => (p.remark ?? '').includes(DEMO_MARK))) {
    return { loaded: false, reason: 'exists' };
  }

  const cainiao = await db.getStation('station-cainiao');
  const jd = await db.getStation('station-jd');
  const sf = await db.getStation('station-sf');
  const post = await db.getStation('station-post');

  const t = nowISO();
  const rows: CreatePackageInput[] = [
    {
      stationId: cainiao?.id,
      source: 'TEXT',
      courierCompany: '中通',
      pickupCode: '8-2-1073',
      status: 'PENDING_PICKUP',
      arrivedAt: t,
      remark: `${DEMO_MARK}包裹已入库，请凭码取件`,
    },
    {
      stationId: sf?.id,
      source: 'MANUAL',
      courierCompany: '顺丰',
      pickupCode: 'SF7-3780',
      tailNumber: '0901',
      status: 'PENDING_PICKUP',
      arrivedAt: t,
      remark: `${DEMO_MARK}顺丰已到站`,
    },
    {
      stationId: jd?.id,
      source: 'TEXT',
      courierCompany: '京东',
      pickupCode: 'G5-16-008',
      tailNumber: '5624',
      status: 'PENDING_PICKUP',
      arrivedAt: t,
      remark: `${DEMO_MARK}京东服务站待取`,
    },
    {
      stationId: cainiao?.id,
      source: 'TEXT',
      courierCompany: '极兔',
      pickupCode: '66-7-0099',
      status: 'PENDING_PICKUP',
      arrivedAt: t,
      remark: `${DEMO_MARK}菜鸟驿站待取`,
    },
    {
      stationId: post?.id,
      source: 'TEXT',
      courierCompany: '邮政',
      pickupCode: '7-9448',
      tailNumber: '9499',
      status: 'PENDING_PICKUP',
      arrivedAt: t,
      remark: `${DEMO_MARK}邮政待取`,
    },
    {
      source: 'MANUAL',
      courierCompany: '圆通',
      status: 'SHIPPING',
      remark: `${DEMO_MARK}运输中`,
    },
    {
      stationId: cainiao?.id,
      source: 'MANUAL',
      courierCompany: '韵达',
      pickupCode: '3-4021',
      status: 'PICKED_UP',
      arrivedAt: t,
      remark: `${DEMO_MARK}已取件`,
    },
  ];

  for (const row of rows) {
    const created = await db.createPackage(row);
    if (row.status === 'PICKED_UP') await db.markAsPickedUp(created.id);
  }

  return { loaded: true, counts: { packages: rows.length } };
}
