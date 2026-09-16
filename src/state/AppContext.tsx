import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { createDbClient } from '@/db';
import type { DbClient } from '@/db/types';
import { DEFAULT_USER_ID } from '@/db/seed';

interface AppContextValue {
  /** 数据库客户端（init 完成后才非 null） */
  db: DbClient | null;
  /** 数据库是否初始化完成 */
  ready: boolean;
  /** MVP 默认用户 id（无用户管理页） */
  userId: string;
  /** 是否显示敏感信息（手机号/单号完整展示） */
  showSensitive: boolean;
  setShowSensitive: (v: boolean) => void;
  /** 每次写操作后 +1，用于触发各 hook 重新读取 */
  refreshKey: number;
  requestRefresh: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DbClient | null>(null);
  const [ready, setReady] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const client = createDbClient();
      await client.init(); // 执行迁移 + seed 默认用户
      if (cancelled) return;
      setDb(client);
      setReady(true);
    })().catch((err) => {
      console.error('数据库初始化失败', err);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const requestRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <AppContext.Provider
      value={{
        db,
        ready,
        userId: DEFAULT_USER_ID,
        showSensitive,
        setShowSensitive,
        refreshKey,
        requestRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp 必须在 <AppProvider> 内使用');
  return ctx;
}
