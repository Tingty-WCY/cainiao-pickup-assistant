// ============================================================================
// packages 表写入语句（SQL + 参数构造）
//
// 为什么单独放一个文件：expoClient 依赖 expo-sqlite 原生模块，vitest 跑不起来，
// 所以这类「SQL 与参数错位」的 bug 以前测不出来。把语句抽成纯模块后，
// tests/sqlPlaceholders.test.ts 就能直接把 SQL 里的占位符和参数数组对齐校验。
//
// 历史事故（2026-09-16）：新增 box_no 列时改了 schema / 迁移 / 参数数组，
// 唯独漏改 INSERT 的列清单 → boxNo 被顶进 status 的位置，
// 格口为空时 status 写入 NULL → NOT NULL constraint failed: packages.status。
// ============================================================================
import type { CreatePackageInput, UpdatePackageInput, Package } from '../types';
import { SYSTEM_ACCOUNT_ID } from './seed';

/** 插入：注意列清单、VALUES 占位符、参数数组三者必须等长且同序 */
export const PACKAGE_INSERT_SQL = `INSERT INTO packages
        (id, account_id, station_id, source, courier_company, tracking_number, pickup_code, tail_number, box_no, status, arrived_at, picked_up_at, remark, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`;

/** 更新：picked_up_at 是唯一一个不走「?」占位符的位置（插入时先留 NULL） */
export const PACKAGE_UPDATE_SQL = `UPDATE packages
       SET station_id = ?, courier_company = ?, tracking_number = ?, pickup_code = ?, tail_number = ?, box_no = ?, status = ?, arrived_at = ?, picked_up_at = ?, remark = ?, updated_at = ?
       WHERE id = ?`;

export function packageInsertParams(
  input: CreatePackageInput,
  id: string,
  now: string,
  arrivedAt: string | null,
): (string | null)[] {
  return [
    id,
    // 账号功能已移除，固定写系统账号（老库该列是 NOT NULL + 外键）
    SYSTEM_ACCOUNT_ID,
    input.stationId ?? null,
    input.source,
    input.courierCompany,
    input.trackingNumber ?? null,
    input.pickupCode ?? null,
    input.tailNumber ?? null,
    input.boxNo ?? null,
    // 兜底：status 是 NOT NULL 列，绝不允许写进 null（历史上正是这里被 boxNo 顶位写成 NULL）
    input.status ?? 'UNKNOWN',
    arrivedAt,
    input.remark ?? null,
    now,
    now,
  ];
}

export function packageUpdateParams(
  input: UpdatePackageInput,
  existing: Package,
  now: string,
): (string | null)[] {
  const stationId = input.stationId !== undefined ? input.stationId : existing.stationId;
  const courierCompany = input.courierCompany ?? existing.courierCompany;
  const trackingNumber =
    input.trackingNumber !== undefined ? input.trackingNumber : existing.trackingNumber;
  const pickupCode = input.pickupCode !== undefined ? input.pickupCode : existing.pickupCode;
  const tailNumber = input.tailNumber !== undefined ? input.tailNumber : existing.tailNumber;
  const boxNo = input.boxNo !== undefined ? input.boxNo : existing.boxNo;
  const status = input.status ?? existing.status;
  const arrivedAt = input.arrivedAt !== undefined ? input.arrivedAt : existing.arrivedAt;
  const pickedUpAt = input.pickedUpAt !== undefined ? input.pickedUpAt : existing.pickedUpAt;
  const remark = input.remark !== undefined ? input.remark : existing.remark;

  return [
    stationId ?? null,
    courierCompany,
    trackingNumber ?? null,
    pickupCode ?? null,
    tailNumber ?? null,
    boxNo ?? null,
    status,
    arrivedAt ?? null,
    pickedUpAt ?? null,
    remark ?? null,
    now,
    existing.id,
  ];
}
