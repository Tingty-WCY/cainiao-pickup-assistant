// ============================================================================
// ExpoDbClient —— 移动端正式运行的 DbClient 实现。
// 使用 expo-sqlite（设备本地 SQLite，零服务端、零上传）。
// 写操作全部参数化（? 占位），绝不拼接用户输入，杜绝注入。
// 读操作（筛选/排序/聚合/去重）复用 src/db/queryCore 的纯函数，
// 与 MemoryDbClient 行为完全一致。
// ============================================================================
import * as SQLite from 'expo-sqlite';
import type { DbClient } from './types';
import type {
  CreatePackageInput,
  CreateStationInput,
  DataSource,
  DuplicateCheckResult,
  Package,
  PackageQuery,
  PickupCodeHistory,
  Station,
  UpdatePackageInput,
  UpdateStationInput,
} from '../types';
import { genId, nowISO } from '../utils';
import { MIGRATIONS, OPTIONAL_MIGRATIONS } from './migrations';
import {
  PACKAGE_INSERT_SQL,
  PACKAGE_UPDATE_SQL,
  packageInsertParams,
  packageUpdateParams,
} from './statements';
import { applyPackageQuery, computeSummary, findDuplicateId } from './queryCore';
import { planStationMerge } from '../services/stationMatch';

const DB_NAME = 'cainiao.db';

// ---- 行类型（数据库 snake_case）----
interface StationRow {
  id: string;
  name: string;
  type: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}
interface PackageRow {
  id: string;
  account_id: string;
  station_id: string | null;
  source: string;
  courier_company: string;
  tracking_number: string | null;
  pickup_code: string | null;
  tail_number: string | null;
  box_no: string | null;
  status: string;
  arrived_at: string | null;
  picked_up_at: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}
interface HistoryRow {
  id: string;
  package_id: string;
  old_code: string | null;
  new_code: string;
  changed_at: string;
  source: string;
}

// ---- 行 ↔ 领域对象 映射 ----
function rowToStation(r: StationRow): Station {
  return {
    id: r.id,
    name: r.name,
    type: r.type as Station['type'],
    address: r.address ?? undefined,
    phone: r.phone ?? undefined,
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function rowToPackage(r: PackageRow): Package {
  return {
    id: r.id,
    stationId: r.station_id ?? undefined,
    source: r.source as Package['source'],
    courierCompany: r.courier_company,
    trackingNumber: r.tracking_number ?? undefined,
    pickupCode: r.pickup_code ?? undefined,
    tailNumber: r.tail_number ?? undefined,
    boxNo: r.box_no ?? undefined,
    status: r.status as Package['status'],
    arrivedAt: r.arrived_at ?? undefined,
    pickedUpAt: r.picked_up_at ?? undefined,
    remark: r.remark ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function rowToHistory(r: HistoryRow): PickupCodeHistory {
  return {
    id: r.id,
    packageId: r.package_id,
    oldCode: r.old_code ?? undefined,
    newCode: r.new_code,
    changedAt: r.changed_at,
    source: r.source as DataSource,
  };
}

export class ExpoDbClient implements DbClient {
  private db!: SQLite.SQLiteDatabase;

  async init(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(DB_NAME);
    // 可重复执行：全部 IF NOT EXISTS + INSERT OR IGNORE
    for (const sql of MIGRATIONS) {
      await this.db.execAsync(sql);
    }
    // 增量列（旧库升级）：列已存在时 ALTER 会报错，逐条忽略
    for (const sql of OPTIONAL_MIGRATIONS) {
      try {
        await this.db.execAsync(sql);
      } catch {
        // 列已存在，忽略
      }
    }
    // 双保险：按实际表结构自检补列，避免上面的 ALTER 因异常没跑成功
    await this.ensurePackageColumns();
    // 驿站规整：老库里按短信名自动建的一堆驿站，合并回 6 个预置驿站
    await this.normalizeStations();
  }

  /**
   * 自检 packages 表结构，缺列就补。
   * 老版本装的 App 里数据库已存在，CREATE TABLE IF NOT EXISTS 不会再加列，
   * 必须靠这里补齐，否则会报 "table packages has no column named xxx"。
   */
  private async ensurePackageColumns(): Promise<void> {
    const cols = await this.db.getAllAsync<{ name: string }>('PRAGMA table_info(packages)');
    const existing = new Set(cols.map((c) => c.name));
    const needed: { column: string; ddl: string }[] = [
      { column: 'tail_number', ddl: 'ALTER TABLE packages ADD COLUMN tail_number TEXT;' },
      { column: 'box_no', ddl: 'ALTER TABLE packages ADD COLUMN box_no TEXT;' },
    ];
    for (const { column, ddl } of needed) {
      if (existing.has(column)) continue;
      try {
        await this.db.execAsync(ddl);
      } catch {
        // 极端情况下忽略，下次启动会再试
      }
    }
  }

  /**
   * 驿站规整（幂等，每次启动跑一次）。
   *
   * 老版本每解析一条短信、驿站名匹配不上就自动建档，导致驿站表里堆了一堆
   * 其实是同一个地方的站点（「中央民族大学京东服务站」「…快递服务中心」…）。
   * 现在只保留 6 个预置驿站：这里把「非预置驿站」上的快递改挂到按名称解析出的
   * 预置驿站，然后删掉这些杂项站点。
   *
   * 失败不影响使用（驿站只是分类标签），下次启动会再试。
   */
  private async normalizeStations(): Promise<void> {
    try {
      const rows = await this.getAllStationRows();
      const plan = planStationMerge(rows.map(rowToStation));
      for (const { from, to } of plan) {
        await this.db.runAsync('UPDATE packages SET station_id = ? WHERE station_id = ?', [to, from]);
        await this.db.runAsync('DELETE FROM stations WHERE id = ?', [from]);
      }
    } catch {
      // 忽略：驿站规整失败不该挡住启动
    }
  }

  // ---------------------------------------------------------------- Station
  async listStations(): Promise<Station[]> {
    const rows = await this.db.getAllAsync<StationRow>('SELECT * FROM stations ORDER BY created_at DESC');
    return rows.map(rowToStation);
  }
  async getStation(id: string): Promise<Station | null> {
    const r = await this.db.getFirstAsync<StationRow>('SELECT * FROM stations WHERE id = ?', [id]);
    return r ? rowToStation(r) : null;
  }
  async createStation(input: CreateStationInput): Promise<Station> {
    const now = nowISO();
    const id = genId();
    await this.db.runAsync(
      `INSERT INTO stations (id, name, type, address, phone, latitude, longitude, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.type ?? 'OTHER',
        input.address ?? null,
        input.phone ?? null,
        input.latitude ?? null,
        input.longitude ?? null,
        now,
        now,
      ],
    );
    return (await this.getStation(id))!;
  }
  async updateStation(id: string, input: UpdateStationInput): Promise<Station> {
    const existing = await this.getStation(id);
    if (!existing) throw new Error(`Station not found: ${id}`);
    const now = nowISO();
    const name = input.name ?? existing.name;
    const type = input.type ?? existing.type;
    const address = input.address !== undefined ? input.address : existing.address;
    const phone = input.phone !== undefined ? input.phone : existing.phone;
    const latitude = input.latitude !== undefined ? input.latitude : existing.latitude;
    const longitude = input.longitude !== undefined ? input.longitude : existing.longitude;
    await this.db.runAsync(
      `UPDATE stations SET name = ?, type = ?, address = ?, phone = ?, latitude = ?, longitude = ?, updated_at = ? WHERE id = ?`,
      [name, type, address ?? null, phone ?? null, latitude ?? null, longitude ?? null, now, id],
    );
    return (await this.getStation(id))!;
  }
  async deleteStation(id: string): Promise<void> {
    // 外键 ON DELETE SET NULL 已处理 packages.station_id；此处显式删除驿站行
    await this.db.runAsync('DELETE FROM stations WHERE id = ?', [id]);
  }

  // --------------------------------------------------------------- Package
  private async getAllPackageRows(): Promise<PackageRow[]> {
    return this.db.getAllAsync<PackageRow>('SELECT * FROM packages');
  }
  private async getAllStationRows(): Promise<StationRow[]> {
    return this.db.getAllAsync<StationRow>('SELECT * FROM stations');
  }

  async listPackages(query?: PackageQuery): Promise<Package[]> {
    const [pRows, sRows] = await Promise.all([this.getAllPackageRows(), this.getAllStationRows()]);
    const packages = pRows.map(rowToPackage);
    const stations = sRows.map(rowToStation);
    return applyPackageQuery(packages, stations, query);
  }
  async getPackage(id: string): Promise<Package | null> {
    const r = await this.db.getFirstAsync<PackageRow>('SELECT * FROM packages WHERE id = ?', [id]);
    return r ? rowToPackage(r) : null;
  }
  async createPackage(input: CreatePackageInput): Promise<Package> {
    const dupId = await this.findDuplicateId(input);
    if (dupId) {
      return this.updatePackage(dupId, {
        stationId: input.stationId,
        courierCompany: input.courierCompany,
        trackingNumber: input.trackingNumber,
        pickupCode: input.pickupCode,
        tailNumber: input.tailNumber,
        boxNo: input.boxNo,
        status: input.status,
        arrivedAt: input.arrivedAt,
        remark: input.remark,
      });
    }
    const now = nowISO();
    const id = genId();
    const arrived =
      input.arrivedAt ?? (input.status === 'PENDING_PICKUP' ? now : null);
    await this.db.runAsync(
      PACKAGE_INSERT_SQL,
      packageInsertParams(input, id, now, arrived),
    );
    return (await this.getPackage(id))!;
  }
  async updatePackage(id: string, input: UpdatePackageInput): Promise<Package> {
    const existing = await this.getPackage(id);
    if (!existing) throw new Error(`Package not found: ${id}`);
    const now = nowISO();

    if (
      input.pickupCode !== undefined &&
      input.pickupCode &&
      input.pickupCode !== existing.pickupCode
    ) {
      await this.db.runAsync(
        `INSERT INTO pickup_code_history (id, package_id, old_code, new_code, changed_at, source)
         VALUES (?, ?, ?, ?, ?, 'OTHER')`,
        [genId(), id, existing.pickupCode ?? null, input.pickupCode, now],
      );
    }

    await this.db.runAsync(PACKAGE_UPDATE_SQL, packageUpdateParams(input, existing, now));
    return (await this.getPackage(id))!;
  }
  async deletePackage(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM packages WHERE id = ?', [id]);
  }
  async markAsPickedUp(id: string): Promise<Package> {
    return this.updatePackage(id, { status: 'PICKED_UP', pickedUpAt: nowISO() });
  }
  async updatePickupCode(id: string, newCode: string, source: DataSource): Promise<Package> {
    const existing = await this.getPackage(id);
    if (!existing) throw new Error(`Package not found: ${id}`);
    if (newCode === existing.pickupCode) return existing;
    const now = nowISO();
    await this.db.runAsync(
      `INSERT INTO pickup_code_history (id, package_id, old_code, new_code, changed_at, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [genId(), id, existing.pickupCode ?? null, newCode, now, source],
    );
    return this.updatePackage(id, { pickupCode: newCode });
  }
  async findDuplicate(input: CreatePackageInput): Promise<DuplicateCheckResult> {
    const id = await this.findDuplicateId(input);
    return id ? { duplicate: true, packageId: id } : { duplicate: false };
  }
  private async findDuplicateId(input: CreatePackageInput): Promise<string | null> {
    const pRows = await this.getAllPackageRows();
    return findDuplicateId(input, pRows.map(rowToPackage));
  }

  // ----------------------------------------------------------------- History
  async listHistory(packageId: string): Promise<PickupCodeHistory[]> {
    const rows = await this.db.getAllAsync<HistoryRow>(
      'SELECT * FROM pickup_code_history WHERE package_id = ? ORDER BY changed_at ASC',
      [packageId],
    );
    return rows.map(rowToHistory);
  }

  // -------------------------------------------------------------- Dashboard
  async getSummary(): Promise<import('../types').DashboardSummary> {
    const [pRows, sRows] = await Promise.all([this.getAllPackageRows(), this.getAllStationRows()]);
    const packages = pRows.map(rowToPackage);
    const stations = sRows.map(rowToStation);
    return computeSummary(packages, stations);
  }
}
