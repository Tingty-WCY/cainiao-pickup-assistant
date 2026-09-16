import { useEffect, useMemo, useState } from 'react';
import { useApp } from './AppContext';
import { createPackageService } from '@/services/package';
import type {
  CreatePackageInput,
  DataSource,
  Package,
  PackageQuery,
  UpdatePackageInput,
} from '@/types';

export function usePackages(query?: PackageQuery) {
  const { db, refreshKey, requestRefresh } = useApp();
  const [list, setList] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  const svc = useMemo(() => (db ? createPackageService(db) : null), [db]);

  useEffect(() => {
    if (!db) return;
    let active = true;
    setLoading(true);
    createPackageService(db)
      .list(query)
      .then((r) => {
        if (active) {
          setList(r);
          setLoading(false);
        }
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [db, refreshKey, JSON.stringify(query ?? {})]);

  return {
    list,
    loading,
    markPickedUp: async (id: string) => {
      await svc!.markPickedUp(id);
      requestRefresh();
    },
    changePickupCode: async (id: string, code: string, source: DataSource) => {
      await svc!.changePickupCode(id, code, source);
      requestRefresh();
    },
    remove: async (id: string) => {
      await svc!.remove(id);
      requestRefresh();
    },
    create: async (input: CreatePackageInput) => {
      const p = await svc!.create(input);
      requestRefresh();
      return p;
    },
    update: async (id: string, input: UpdatePackageInput) => {
      const p = await svc!.update(id, input);
      requestRefresh();
      return p;
    },
    checkDuplicate: (input: CreatePackageInput) => svc!.checkDuplicate(input),
  };
}
