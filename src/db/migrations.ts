// ============================================================================
// 可重复执行的迁移 SQL（用于 expo-sqlite 的 db.exec）。
// 全部使用 IF NOT EXISTS，多次执行安全；后续变更通过新增迁移语句追加。
// ============================================================================

import {
  DEFAULT_USER_ID,
  DEFAULT_USER_NAME,
  FIXED_STATIONS,
  SYSTEM_ACCOUNT_ID,
  SYSTEM_ACCOUNT_NICKNAME,
} from './seed';

export const MIGRATIONS: string[] = [
  `PRAGMA foreign_keys = ON;`,
  `PRAGMA journal_mode = WAL;`,
  `PRAGMA synchronous = NORMAL;`,

  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    phone TEXT NOT NULL,
    nickname TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
  CREATE INDEX IF NOT EXISTS idx_accounts_phone ON accounts(phone);
  CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts(platform);`,

  `CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'OTHER',
    address TEXT,
    phone TEXT,
    latitude REAL,
    longitude REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name);
  CREATE INDEX IF NOT EXISTS idx_stations_type ON stations(type);`,

  `CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    station_id TEXT,
    source TEXT NOT NULL DEFAULT 'MANUAL',
    courier_company TEXT NOT NULL,
    tracking_number TEXT,
    pickup_code TEXT,
    tail_number TEXT,
    box_no TEXT,
    status TEXT NOT NULL DEFAULT 'UNKNOWN',
    arrived_at TEXT,
    picked_up_at TEXT,
    remark TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_packages_account_id ON packages(account_id);
  CREATE INDEX IF NOT EXISTS idx_packages_station_id ON packages(station_id);
  CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
  CREATE INDEX IF NOT EXISTS idx_packages_tracking_number ON packages(tracking_number);
  CREATE INDEX IF NOT EXISTS idx_packages_pickup_code ON packages(pickup_code);
  CREATE INDEX IF NOT EXISTS idx_packages_arrived_at ON packages(arrived_at);`,

  `CREATE TABLE IF NOT EXISTS pickup_code_history (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL,
    old_code TEXT,
    new_code TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'UNKNOWN',
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_pickup_history_package_id ON pickup_code_history(package_id);
  CREATE INDEX IF NOT EXISTS idx_pickup_history_changed_at ON pickup_code_history(changed_at);`,

  // 默认用户（MVP 无用户管理页）
  `INSERT OR IGNORE INTO users (id, name, created_at, updated_at)
   VALUES ('${DEFAULT_USER_ID}', '${DEFAULT_USER_NAME}', datetime('now'), datetime('now'));`,

  // 系统账号 —— 应用层已无「账号」概念，这条记录纯粹是为了满足
  // packages.account_id 的 NOT NULL + 外键约束（详见 seed.ts 的说明）。
  // 界面上不展示、也不提供任何账号的增删改入口。
  `INSERT OR IGNORE INTO accounts (id, user_id, platform, phone, nickname, enabled, created_at, updated_at)
   VALUES ('${SYSTEM_ACCOUNT_ID}', '${DEFAULT_USER_ID}', 'OTHER', '', '${SYSTEM_ACCOUNT_NICKNAME}', 1, datetime('now'), datetime('now'));`,

  // 预置驿站：写死的 6 个（京东/邮政/菜鸟/近邻宝/顺丰/德邦）。
  // 解析短信时不再按驿站名自动建档，认不出的一律归 DEFAULT_STATION_ID（菜鸟）。
  ...FIXED_STATIONS.map(
    (s) => `INSERT OR IGNORE INTO stations (id, name, type, created_at, updated_at)
   VALUES ('${s.id}', '${s.name}', '${s.type}', datetime('now'), datetime('now'));`,
  ),

  // 记录迁移版本（可重复执行）
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL,
    applied_at TEXT NOT NULL
  );`,
];

/**
 * 增量迁移：给已存在的旧库加列。
 * SQLite 的 ALTER TABLE ADD COLUMN 在列已存在时会报错，因此这类语句失败可忽略。
 */
export const OPTIONAL_MIGRATIONS: string[] = [
  `ALTER TABLE packages ADD COLUMN tail_number TEXT;`,
  `ALTER TABLE packages ADD COLUMN box_no TEXT;`,
];

/**
 * 在 expo-sqlite 的 db 上执行全部迁移。
 * 调用方示例：
 *   import * as SQLite from 'expo-sqlite';
 *   const db = SQLite.openDatabaseSync('pickup.db');
 *   db.exec(MIGRATIONS.join('\n'));
 */
export async function runMigrations(exec: (sql: string) => Promise<void> | void): Promise<void> {
  for (const sql of MIGRATIONS) {
    await exec(sql);
  }
  for (const sql of OPTIONAL_MIGRATIONS) {
    try {
      await exec(sql);
    } catch {
      // 列已存在，忽略
    }
  }
}
