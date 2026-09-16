// ============================================================================
// SQL 语句 ↔ 参数对齐回归测试
//
// 背景：2026-09-16 用户真机「添加快递」崩在
//   NOT NULL constraint failed: packages.status
// 原因是新增 box_no 列时改了 schema / 迁移 / 参数数组，唯独漏改 INSERT 的列清单，
// 于是 boxNo 被顶进 status 的位置，格口为空时 status 写入 NULL。
//
// expoClient 依赖 expo-sqlite 原生模块，vitest 跑不起来，所以这类错位 bug 以前测不到。
// 这里直接对纯模块 src/db/statements.ts 做静态校验，把「列名 → 绑定的值」按位置解析出来，
// 断言关键列拿到的确实是它该拿的值。
// ============================================================================
import { describe, it, expect } from 'vitest';
import {
  PACKAGE_INSERT_SQL,
  PACKAGE_UPDATE_SQL,
  packageInsertParams,
  packageUpdateParams,
} from '../src/db/statements';
import type { CreatePackageInput, Package } from '../src/types';
import { SYSTEM_ACCOUNT_ID } from '../src/db/seed';

/** 取出第一个括号内的列清单（INSERT 的列名 / VALUES 的值） */
function firstParenList(sql: string, after?: string): string {
  const src = after ? sql.slice(sql.indexOf(after) + after.length) : sql;
  const start = src.indexOf('(');
  const end = src.indexOf(')', start);
  return src.slice(start + 1, end);
}

/** 按位置把「列名 → 值」配起来；字面量（如 NULL）直接取字面量 */
function bindColumns(columns: string[], valueTokens: string[], params: unknown[]) {
  const map: Record<string, unknown> = {};
  let pi = 0;
  valueTokens.forEach((tok, i) => {
    const col = columns[i];
    if (col === undefined) return;
    if (tok === '?') {
      map[col] = params[pi++];
    } else {
      map[col] = tok === 'NULL' ? null : tok.replace(/'/g, '');
    }
  });
  return { map, consumed: pi };
}

const splitTokens = (s: string) => s.split(',').map((t) => t.trim()).filter(Boolean);

describe('packages 写入语句：列 ↔ 参数对齐', () => {
  const input: CreatePackageInput = {
    stationId: 'st-1',
    source: 'TEXT',
    courierCompany: '美团',
    trackingNumber: 'MT123',
    pickupCode: '6165',
    tailNumber: '5624',
    // 关键用例：格口为空 —— 正是这个场景触发过 status 变 NULL 的崩溃
    boxNo: undefined,
    status: 'PENDING_PICKUP',
    arrivedAt: '2026-09-16T08:00:00.000Z',
    remark: '【美团智能外卖柜】',
  };
  const rows = ['id-1', '2026-09-16T08:01:00.000Z'] as const;
  const params = packageInsertParams(input, rows[0], rows[1], input.arrivedAt!);

  it('INSERT 的列数、VALUES 值数、参数个数三者一致', () => {
    const columns = splitTokens(firstParenList(PACKAGE_INSERT_SQL));
    const valueTokens = splitTokens(
      firstParenList(PACKAGE_INSERT_SQL, 'VALUES'),
    );
    expect(valueTokens).toHaveLength(columns.length);
    expect(params).toHaveLength(columns.filter((_, i) => valueTokens[i] === '?').length);
  });

  it('每一列拿到的都是它自己的值（历史错位点：box_no / status）', () => {
    const columns = splitTokens(firstParenList(PACKAGE_INSERT_SQL));
    const valueTokens = splitTokens(firstParenList(PACKAGE_INSERT_SQL, 'VALUES'));
    const { map, consumed } = bindColumns(columns, valueTokens, params);

    expect(consumed).toBe(params.length);
    // 账号功能已移除：account_id 固定写系统账号（老库该列 NOT NULL + 外键）
    expect(map.account_id).toBe(SYSTEM_ACCOUNT_ID);
    expect(map.box_no).toBeNull(); // 空格口要写 NULL，而不是把 status 挤走
    expect(map.status).toBe('PENDING_PICKUP'); // 绝不能是 undefined/null
    expect(map.tail_number).toBe('5624');
    expect(map.pickup_code).toBe('6165');
    expect(map.courier_company).toBe('美团');
    expect(map.id).toBe('id-1');
    expect(map.created_at).toBe(rows[1]);
    expect(map.updated_at).toBe(rows[1]);
    expect(map.picked_up_at).toBeNull(); // 插入时留 NULL
  });

  it('status 永远不为空（NOT NULL 约束的底线）', () => {
    const { map } = bindColumns(
      splitTokens(firstParenList(PACKAGE_INSERT_SQL)),
      splitTokens(firstParenList(PACKAGE_INSERT_SQL, 'VALUES')),
      params,
    );
    expect(map.status).toBeTruthy();
  });

  it('UPDATE 的列数、占位符数、参数个数一致，且 status/box_no 不错位', () => {
    const existing: Package = {
      id: 'id-1',
      stationId: 'st-1',
      source: 'TEXT',
      courierCompany: '中通',
      pickupCode: '528',
      tailNumber: '1111',
      boxNo: 'B-15',
      status: 'PENDING_PICKUP',
      createdAt: rows[1],
      updatedAt: rows[1],
    };
    const upParams = packageUpdateParams({ boxNo: undefined, status: 'PICKED_UP' }, existing, rows[1]);

    const setSeg = PACKAGE_UPDATE_SQL.slice(
      PACKAGE_UPDATE_SQL.indexOf('SET') + 3,
      PACKAGE_UPDATE_SQL.indexOf('WHERE'),
    );
    const columns = setSeg
      .split(',')
      .map((pair) => pair.split('=')[0].trim())
      .filter(Boolean);
    const placeholders = (PACKAGE_UPDATE_SQL.match(/\?/g) ?? []).length;

    // SET 的 11 列 + WHERE id 的 1 个占位符 = 12
    expect(columns).toHaveLength(11);
    expect(upParams).toHaveLength(placeholders);
    expect(columns[5]).toBe('box_no');
    expect(columns[6]).toBe('status');
    // 不传 boxNo 时应回退到原值 B-15，而不是把 status 覆盖掉
    expect(upParams[5]).toBe('B-15');
    expect(upParams[6]).toBe('PICKED_UP');
    expect(upParams[11]).toBe('id-1');
  });
});
