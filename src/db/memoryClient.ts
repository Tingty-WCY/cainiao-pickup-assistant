import type { DbClient } from './types';
import type {
  CreatePackageInput,
  CreateStationInput,
  DashboardSummary,
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
import { applyPackageQuery, computeSummary, findDuplicateId } from './queryCore';
import { FIXED_STATIONS } from './seed';

/**
 * 内存版 DbClient 实现。
 * 用于单元测试与无原生 SQLite 环境；所有逻辑与 SQLite 实现保持一致。
 */
export class MemoryDbClient implements DbClient {
  private stations: Station[] = [];
  private packages: Package[] = [];
  private histories: PickupCodeHistory[] = [];

  async init(): Promise<void> {
    // 与 SQLite 版保持一致：预置 6 个固定驿站（真实库由迁移里的 INSERT OR IGNORE 写入）
    const now = nowISO();
    for (const s of FIXED_STATIONS) {
      this.stations.push({
        id: s.id,
        name: s.name,
        type: s.type,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // ---------------------------------------------------------------- Station
  async listStations(): Promise<Station[]> {
    return [...this.stations];
  }

  async getStation(id: string): Promise<Station | null> {
    return this.stations.find((s) => s.id === id) ?? null;
  }

  async createStation(input: CreateStationInput): Promise<Station> {
    const now = nowISO();
    const st: Station = {
      id: genId(),
      name: input.name,
      type: input.type ?? 'OTHER',
      address: input.address,
      phone: input.phone,
      latitude: input.latitude,
      longitude: input.longitude,
      createdAt: now,
      updatedAt: now,
    };
    this.stations.push(st);
    return st;
  }

  async updateStation(id: string, input: UpdateStationInput): Promise<Station> {
    const st = await this.getStation(id);
    if (!st) throw new Error(`Station not found: ${id}`);
    const now = nowISO();
    if (input.name !== undefined) st.name = input.name;
    if (input.type !== undefined) st.type = input.type;
    if (input.address !== undefined) st.address = input.address;
    if (input.phone !== undefined) st.phone = input.phone;
    if (input.latitude !== undefined) st.latitude = input.latitude;
    if (input.longitude !== undefined) st.longitude = input.longitude;
    st.updatedAt = now;
    return st;
  }

  async deleteStation(id: string): Promise<void> {
    this.stations = this.stations.filter((s) => s.id !== id);
    // ON DELETE SET NULL
    this.packages.forEach((p) => {
      if (p.stationId === id) p.stationId = undefined;
    });
  }

  // --------------------------------------------------------------- Package
  async listPackages(query?: PackageQuery): Promise<Package[]> {
    return applyPackageQuery(this.packages, this.stations, query);
  }

  async getPackage(id: string): Promise<Package | null> {
    return this.packages.find((p) => p.id === id) ?? null;
  }

  async createPackage(input: CreatePackageInput): Promise<Package> {
    const dupId = await this.findDuplicateId(input);
    if (dupId) {
      // 命中重复：合并更新已有记录（不新建）
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
    const pkg: Package = {
      id: genId(),
      stationId: input.stationId,
      source: input.source,
      courierCompany: input.courierCompany,
      trackingNumber: input.trackingNumber,
      pickupCode: input.pickupCode,
      tailNumber: input.tailNumber,
      boxNo: input.boxNo,
      status: input.status,
      arrivedAt:
        input.arrivedAt ?? (input.status === 'PENDING_PICKUP' ? now : undefined),
      remark: input.remark,
      createdAt: now,
      updatedAt: now,
    };
    this.packages.push(pkg);
    return pkg;
  }

  async updatePackage(id: string, input: UpdatePackageInput): Promise<Package> {
    const pkg = await this.getPackage(id);
    if (!pkg) throw new Error(`Package not found: ${id}`);
    const now = nowISO();

    if (input.pickupCode !== undefined && input.pickupCode && input.pickupCode !== pkg.pickupCode) {
      this.histories.push({
        id: genId(),
        packageId: id,
        oldCode: pkg.pickupCode,
        newCode: input.pickupCode,
        changedAt: now,
        source: 'OTHER',
      });
      pkg.pickupCode = input.pickupCode;
    }
    if (input.stationId !== undefined) pkg.stationId = input.stationId;
    if (input.courierCompany !== undefined) pkg.courierCompany = input.courierCompany;
    if (input.trackingNumber !== undefined) pkg.trackingNumber = input.trackingNumber;
    if (input.tailNumber !== undefined) pkg.tailNumber = input.tailNumber;
    if (input.boxNo !== undefined) pkg.boxNo = input.boxNo;
    if (input.status !== undefined) pkg.status = input.status;
    if (input.arrivedAt !== undefined) pkg.arrivedAt = input.arrivedAt;
    if (input.pickedUpAt !== undefined) pkg.pickedUpAt = input.pickedUpAt;
    if (input.remark !== undefined) pkg.remark = input.remark;
    pkg.updatedAt = now;
    return pkg;
  }

  async deletePackage(id: string): Promise<void> {
    this.packages = this.packages.filter((p) => p.id !== id);
    this.histories = this.histories.filter((h) => h.packageId !== id);
  }

  async markAsPickedUp(id: string): Promise<Package> {
    return this.updatePackage(id, { status: 'PICKED_UP', pickedUpAt: nowISO() });
  }

  async updatePickupCode(id: string, newCode: string, source: DataSource): Promise<Package> {
    const pkg = await this.getPackage(id);
    if (!pkg) throw new Error(`Package not found: ${id}`);
    if (newCode === pkg.pickupCode) return pkg;
    const now = nowISO();
    this.histories.push({
      id: genId(),
      packageId: id,
      oldCode: pkg.pickupCode,
      newCode,
      changedAt: now,
      source,
    });
    pkg.pickupCode = newCode;
    pkg.updatedAt = now;
    return pkg;
  }

  async findDuplicate(input: CreatePackageInput): Promise<DuplicateCheckResult> {
    const id = this.findDuplicateId(input);
    return id ? { duplicate: true, packageId: id } : { duplicate: false };
  }

  private findDuplicateId(input: CreatePackageInput): string | null {
    return findDuplicateId(input, this.packages);
  }

  // ----------------------------------------------------------------- History
  async listHistory(packageId: string): Promise<PickupCodeHistory[]> {
    return this.histories.filter((h) => h.packageId === packageId);
  }

  // -------------------------------------------------------------- Dashboard
  async getSummary(): Promise<DashboardSummary> {
    return computeSummary(this.packages, this.stations);
  }
}
