import { useEffect, useMemo, useState } from 'react';
import { useApp } from './AppContext';
import { createStationService } from '@/services/station';
import type { CreateStationInput, Station, UpdateStationInput } from '@/types';

export function useStations() {
  const { db, refreshKey, requestRefresh } = useApp();
  const [list, setList] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  const svc = useMemo(() => (db ? createStationService(db) : null), [db]);

  useEffect(() => {
    if (!db) return;
    let active = true;
    setLoading(true);
    createStationService(db)
      .list()
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
  }, [db, refreshKey]);

  return {
    list,
    loading,
    create: async (input: CreateStationInput) => {
      const s = await svc!.create(input);
      requestRefresh();
      return s;
    },
    update: async (id: string, input: UpdateStationInput) => {
      const s = await svc!.update(id, input);
      requestRefresh();
      return s;
    },
    remove: async (id: string) => {
      await svc!.remove(id);
      requestRefresh();
    },
  };
}
