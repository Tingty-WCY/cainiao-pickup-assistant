import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryDbClient } from '../src/db/memoryClient';
import { loadDemoData } from '../src/db/demoData';
import { FIXED_STATIONS } from '../src/db/seed';

describe('演示数据 loadDemoData', () => {
  let db: MemoryDbClient;

  beforeEach(async () => {
    db = new MemoryDbClient();
    await db.init();
  });

  it('初始化后库里就是 6 个预置驿站', async () => {
    const stations = await db.listStations();
    expect(stations.map((s) => s.name).sort()).toEqual(
      FIXED_STATIONS.map((s) => s.name).sort(),
    );
  });

  it('首次载入写入 7 条演示快递', async () => {
    const res = await loadDemoData(db);
    expect(res.loaded).toBe(true);
    expect(res.counts).toEqual({ packages: 7 });

    const pkgs = await db.listPackages();
    expect(pkgs.length).toBe(7);

    const statuses = pkgs.map((p) => p.status);
    expect(statuses).toContain('PENDING_PICKUP');
    expect(statuses).toContain('SHIPPING');
    expect(statuses).toContain('PICKED_UP');
  });

  it('重复调用幂等：第二次不重复插入', async () => {
    const first = await loadDemoData(db);
    expect(first.loaded).toBe(true);

    const second = await loadDemoData(db);
    expect(second.loaded).toBe(false);
    expect(second.reason).toBe('exists');

    expect((await db.listPackages()).length).toBe(7);
  });

  it('摘要聚合在演示数据下正确', async () => {
    await loadDemoData(db);
    const summary = await db.getSummary();
    // 待取 5（中通/顺丰/京东/极兔/邮政） + 运输中 1 + 已取 1 = 7
    expect(summary.totalPackages).toBe(7);
    expect(summary.pendingPickupPackages).toBe(5);
    expect(summary.shippingPackages).toBe(1);
    expect(summary.pickedUpPackages).toBe(1);
    // 待取分别落在 菜鸟/顺丰/京东/邮政 四个预置驿站上
    expect(summary.stations.length).toBe(4);
  });
});
