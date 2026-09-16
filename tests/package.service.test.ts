import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryDbClient } from '../src/db/memoryClient';
import { createStationService } from '../src/services/station';
import { createPackageService } from '../src/services/package';
import { createDashboardService } from '../src/services/dashboard';

describe('PackageService（含去重/历史/首页聚合）', () => {
  let db: MemoryDbClient;
  let stations: ReturnType<typeof createStationService>;
  let packages: ReturnType<typeof createPackageService>;
  let dashboard: ReturnType<typeof createDashboardService>;
  let stationId: string;

  beforeEach(async () => {
    db = new MemoryDbClient();
    await db.init();
    stations = createStationService(db);
    packages = createPackageService(db);
    dashboard = createDashboardService(db);
    const st = await stations.create({ name: 'XX大学菜鸟驿站', type: 'CAINIAO' });
    stationId = st.id;
  });

  it('创建并查询待取快递', async () => {
    const p = await packages.create({
      stationId,
      source: 'MANUAL',
      courierCompany: '中通',
      pickupCode: '528',
      status: 'PENDING_PICKUP',
    });
    expect(p.id).toBeTruthy();
    const list = await packages.list({ status: 'PENDING_PICKUP' });
    expect(list).toHaveLength(1);
  });

  it('标记已取后从待取列表移除，但记录保留', async () => {
    const p = await packages.create({
      stationId,
      source: 'MANUAL',
      courierCompany: '中通',
      pickupCode: '528',
      status: 'PENDING_PICKUP',
    });
    await packages.markPickedUp(p.id);
    const pending = await packages.list({ status: 'PENDING_PICKUP' });
    expect(pending).toHaveLength(0);
    expect(await packages.get(p.id)).not.toBeNull();
    expect((await packages.get(p.id))?.status).toBe('PICKED_UP');
  });

  it('修改取件码写入历史', async () => {
    const p = await packages.create({
      stationId,
      source: 'MANUAL',
      courierCompany: '中通',
      pickupCode: '528',
      status: 'PENDING_PICKUP',
    });
    const updated = await packages.changePickupCode(p.id, '839', 'TEXT');
    expect(updated.pickupCode).toBe('839');
    const hist = await packages.history(p.id);
    expect(hist).toHaveLength(1);
    expect(hist[0].oldCode).toBe('528');
    expect(hist[0].newCode).toBe('839');
  });

  it('同单号重复创建只合并不新增', async () => {
    await packages.create({
      stationId,
      source: 'MANUAL',
      courierCompany: '中通',
      trackingNumber: 'ZT123',
      pickupCode: '528',
      status: 'PENDING_PICKUP',
    });
    // 另一来源（短信解析）携带同一单号，取件码更新
    const merged = await packages.create({
      stationId,
      source: 'TEXT',
      courierCompany: '中通',
      trackingNumber: 'ZT123',
      pickupCode: '831',
      status: 'PENDING_PICKUP',
    });
    const all = await packages.list();
    expect(all).toHaveLength(1);
    expect(merged.pickupCode).toBe('831');
    const hist = await packages.history(merged.id);
    expect(hist.some((h) => h.newCode === '831')).toBe(true);
  });

  it('首页聚合：待取数量与按驿站分组', async () => {
    await packages.create({
      stationId,
      source: 'MANUAL',
      courierCompany: '中通',
      pickupCode: '528',
      status: 'PENDING_PICKUP',
    });
    await packages.create({
      stationId,
      source: 'MANUAL',
      courierCompany: '圆通',
      pickupCode: '831',
      status: 'PENDING_PICKUP',
    });
    const sum = await dashboard.summary();
    expect(sum.pendingPickupPackages).toBe(2);
    expect(sum.stations).toHaveLength(1);
    expect(sum.stations[0].pendingCount).toBe(2);
    expect(sum.stations[0].stationName).toBe('XX大学菜鸟驿站');
  });

  it('关键词搜索：取件码 / 驿站 / 尾号', async () => {
    await packages.create({
      stationId,
      source: 'MANUAL',
      courierCompany: '中通',
      pickupCode: '528',
      tailNumber: '5624',
      status: 'PENDING_PICKUP',
    });
    expect(await packages.list({ keyword: '528' })).toHaveLength(1);
    expect(await packages.list({ keyword: '菜鸟' })).toHaveLength(1);
    expect(await packages.list({ keyword: '5624' })).toHaveLength(1);
  });

  it('聚焦某驿站：该驿站的快递置顶，但不筛掉其他', async () => {
    const other = await stations.create({ name: '其他驿站', type: 'OTHER' });
    await packages.create({
      stationId,
      source: 'MANUAL',
      courierCompany: '中通',
      pickupCode: '528',
      status: 'PENDING_PICKUP',
    });
    await packages.create({
      stationId: other.id,
      source: 'MANUAL',
      courierCompany: '圆通',
      pickupCode: '831',
      status: 'PENDING_PICKUP',
    });

    const focused = await packages.list({ focusStationId: other.id });
    expect(focused).toHaveLength(2); // 全都保留
    expect(focused[0].stationId).toBe(other.id); // 目标驿站排最前
  });
});
