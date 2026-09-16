// ============================================================================
// Drizzle ORM Schema —— 用于移动端正式运行（expo-sqlite / drizzle-orm/expo-sqlite）
// 测试阶段不依赖此文件（测试用 MemoryDbClient），但结构保持一致，便于后续直接对接。
// ============================================================================
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * 历史遗留表 —— 2026-09-16 起应用层不再使用「账号」。
 *
 * 为什么还留着：packages.account_id 是 NOT NULL + 外键，SQLite 无法直接摘掉
 * 一列的 NOT NULL（只能整表重建）。所以库里必须存在对应记录，
 * 现在固定写入 SYSTEM_ACCOUNT_ID（见 seed.ts），界面上没有任何入口。
 */
export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    phone: text('phone').notNull(),
    nickname: text('nickname').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxUserId: index('idx_accounts_user_id').on(t.userId),
    idxPhone: index('idx_accounts_phone').on(t.phone),
    idxPlatform: index('idx_accounts_platform').on(t.platform),
  }),
);

export const stations = sqliteTable(
  'stations',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').notNull().default('OTHER'),
    address: text('address'),
    phone: text('phone'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxName: index('idx_stations_name').on(t.name),
    idxType: index('idx_stations_type').on(t.type),
  }),
);

export const packages = sqliteTable(
  'packages',
  {
    id: text('id').primaryKey(),
    /**
     * @deprecated 应用层已不使用（账号功能已移除）。
     * 保留列定义以匹配真实表结构；写入时固定为 SYSTEM_ACCOUNT_ID，
     * 只是为了满足旧库上这一列的 NOT NULL + 外键约束。
     */
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    stationId: text('station_id').references(() => stations.id, {
      onDelete: 'set null',
    }),
    source: text('source').notNull().default('MANUAL'),
    courierCompany: text('courier_company').notNull(),
    trackingNumber: text('tracking_number'),
    pickupCode: text('pickup_code'),
    tailNumber: text('tail_number'),
    boxNo: text('box_no'),
    status: text('status').notNull().default('UNKNOWN'),
    arrivedAt: text('arrived_at'),
    pickedUpAt: text('picked_up_at'),
    remark: text('remark'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxAccountId: index('idx_packages_account_id').on(t.accountId),
    idxStationId: index('idx_packages_station_id').on(t.stationId),
    idxStatus: index('idx_packages_status').on(t.status),
    idxTracking: index('idx_packages_tracking_number').on(t.trackingNumber),
    idxPickup: index('idx_packages_pickup_code').on(t.pickupCode),
    idxArrived: index('idx_packages_arrived_at').on(t.arrivedAt),
  }),
);

export const pickupCodeHistory = sqliteTable(
  'pickup_code_history',
  {
    id: text('id').primaryKey(),
    packageId: text('package_id')
      .notNull()
      .references(() => packages.id, { onDelete: 'cascade' }),
    oldCode: text('old_code'),
    newCode: text('new_code').notNull(),
    changedAt: text('changed_at').notNull(),
    source: text('source').notNull().default('UNKNOWN'),
  },
  (t) => ({
    idxPackageId: index('idx_pickup_history_package_id').on(t.packageId),
    idxChanged: index('idx_pickup_history_changed_at').on(t.changedAt),
  }),
);
