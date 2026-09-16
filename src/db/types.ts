import type {
  CreatePackageInput,
  CreateStationInput,
  DashboardSummary,
  DuplicateCheckResult,
  Package,
  PackageQuery,
  PickupCodeHistory,
  Station,
  UpdatePackageInput,
  UpdateStationInput,
  DataSource,
} from '../types';

/**
 * 数据访问抽象层。
 *
 * 设计目的（对应方案中的 DbClient 抽象）：
 * - 测试阶段使用内存实现（MemoryDbClient），无需原生 SQLite，纯 Node 即可跑测试；
 * - 移动端正式运行时替换为 Expo/SQLite 实现（expo-sqlite + drizzle-orm/expo-sqlite），
 *   Service 层与 UI 层不感知底层差异。
 *
 * 所有写操作参数化、不拼接 SQL，避免注入。
 */
export interface DbClient {
  init(): Promise<void>;

  // ---- Station ----
  listStations(): Promise<Station[]>;
  getStation(id: string): Promise<Station | null>;
  createStation(input: CreateStationInput): Promise<Station>;
  updateStation(id: string, input: UpdateStationInput): Promise<Station>;
  deleteStation(id: string): Promise<void>;

  // ---- Package ----
  listPackages(query?: PackageQuery): Promise<Package[]>;
  getPackage(id: string): Promise<Package | null>;
  createPackage(input: CreatePackageInput): Promise<Package>;
  updatePackage(id: string, input: UpdatePackageInput): Promise<Package>;
  deletePackage(id: string): Promise<void>;
  markAsPickedUp(id: string): Promise<Package>;
  updatePickupCode(id: string, newCode: string, source: DataSource): Promise<Package>;
  findDuplicate(input: CreatePackageInput): Promise<DuplicateCheckResult>;

  // ---- PickupCodeHistory ----
  listHistory(packageId: string): Promise<PickupCodeHistory[]>;

  // ---- Dashboard ----
  getSummary(): Promise<DashboardSummary>;
}
