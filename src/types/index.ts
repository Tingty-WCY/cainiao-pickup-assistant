// ============================================================================
// 全局领域类型（严格模式，禁止使用 any）
//
// 注意：本项目**不再有「账号」概念**（2026-09-16 移除）。
// 曾经的 accounts 表 / accountId 字段会让「手动加快递」时自动生成「未分类」账号，
// 属于纯粹的负担，已整体删掉。数据库里仅保留一条不可见的系统账号，
// 用于满足老库 packages.account_id 的 NOT NULL + 外键约束（详见 db/migrations.ts）。
// ============================================================================

export type Platform =
  | 'TAOBAO'
  | 'JD'
  | 'PDD'
  | 'DOUYIN'
  | 'XIAOHONGSHU'
  | 'MEITUAN'
  | 'XIAN_JU'
  | 'OTHER';

export type DataSource =
  | 'MANUAL'
  | 'TEXT'
  | 'OCR'
  | 'CLIPBOARD'
  | 'TAOBAO'
  | 'JD'
  | 'PDD'
  | 'DOUYIN'
  | 'OTHER';

/** 按需求 4 态，保留 UNKNOWN 作兜底（MVP 不启用 ARRIVED） */
export type PackageStatus =
  | 'PENDING_PICKUP'
  | 'SHIPPING'
  | 'PICKED_UP'
  | 'EXCEPTION'
  | 'UNKNOWN';

export type StationType =
  | 'CAINIAO'
  | 'FENGCHAO'
  | 'TUXI'
  | 'JD'
  | 'LOCKER'
  | 'ZTO'
  | 'YTO'
  | 'STO'
  | 'YUNDA'
  | 'OTHER';

// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Station {
  id: string;
  name: string;
  type: StationType;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  id: string;
  stationId?: string;
  source: DataSource;
  courierCompany: string;
  trackingNumber?: string;
  pickupCode?: string;
  /** 快递尾号（单号后 3~4 位）：不少驿站出库时要求「取件码 + 尾号」一起出示 */
  tailNumber?: string;
  /** 柜号/格口号：外卖柜、智能柜取件时先找柜再输码（如「格口号：15」） */
  boxNo?: string;
  status: PackageStatus;
  arrivedAt?: string;
  pickedUpAt?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PickupCodeHistory {
  id: string;
  packageId: string;
  oldCode?: string;
  newCode: string;
  changedAt: string;
  source: DataSource;
}

// ---------------------------------------------------------------------------
// 输入类型
// ---------------------------------------------------------------------------

export interface CreateStationInput {
  name: string;
  type?: StationType;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateStationInput {
  name?: string;
  type?: StationType;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreatePackageInput {
  stationId?: string;
  source: DataSource;
  courierCompany: string;
  trackingNumber?: string;
  pickupCode?: string;
  /** 快递尾号（出库时可能需要与取件码一起出示） */
  tailNumber?: string;
  /** 柜号/格口号（外卖柜/智能柜） */
  boxNo?: string;
  status: PackageStatus;
  arrivedAt?: string;
  remark?: string;
}

export interface UpdatePackageInput {
  stationId?: string;
  courierCompany?: string;
  trackingNumber?: string;
  pickupCode?: string;
  tailNumber?: string;
  boxNo?: string;
  status?: PackageStatus;
  arrivedAt?: string;
  pickedUpAt?: string;
  remark?: string;
}

export interface PackageQuery {
  keyword?: string;
  status?: PackageStatus;
  /** 只显示该驿站（严格筛选） */
  stationId?: string;
  /** 把该驿站的快递排到最前（置顶，不筛掉其他） */
  focusStationId?: string;
  platform?: Platform;
  courierCompany?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ParsedPackage {
  courierCompany?: string;
  trackingNumber?: string;
  pickupCode?: string;
  /** 快递尾号，如「尾号5624」「快递*9499」「快递0901」里的 5624 / 9499 / 0901 */
  tailNumber?: string;
  /** 柜号/格口号，如「格口号：15」「B柜」里的 15 / B */
  boxNo?: string;
  stationName?: string;
  stationAddress?: string;
  phone?: string;
  /** 脱敏手机号原文，如 138****1234（短信里常见） */
  phoneMasked?: string;
  status?: PackageStatus;
  /** 识别出的来源平台（淘宝/京东/拼多多/抖音），用于展示 */
  platform?: Platform;
  confidence: number;
  rawText: string;
}

export interface StationSummary {
  stationId: string;
  stationName: string;
  stationType: StationType;
  pendingCount: number;
}

export interface DashboardSummary {
  totalPackages: number;
  waitingPackages: number;
  shippingPackages: number;
  pendingPickupPackages: number;
  pickedUpPackages: number;
  todayArrived: number;
  stations: StationSummary[];
  recentPackages: Package[];
}

export interface DuplicateCheckResult {
  duplicate: boolean;
  packageId?: string;
}

export interface SyncResult {
  added: number;
  updated: number;
  skipped: number;
}
