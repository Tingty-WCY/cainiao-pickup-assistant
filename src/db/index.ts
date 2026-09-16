// ============================================================================
// DbClient 工厂。
// 移动端正式运行统一使用 ExpoDbClient（expo-sqlite）。
// 单元测试走 MemoryDbClient（见各 *test.ts），不依赖本文件，故核心 typecheck 不受影响。
// ============================================================================
import { ExpoDbClient } from './expoClient';
import type { DbClient } from './types';

let singleton: DbClient | null = null;

/** 获取（或创建）唯一 DbClient 实例。调用方需先 await client.init()。 */
export function createDbClient(): DbClient {
  if (!singleton) {
    singleton = new ExpoDbClient();
  }
  return singleton;
}

export type { DbClient };
