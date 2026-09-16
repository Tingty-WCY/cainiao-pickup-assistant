import { useEffect, useState } from 'react';
import { useApp } from './AppContext';
import { createDashboardService } from '@/services/dashboard';
import type { DashboardSummary } from '@/types';

export function useDashboard() {
  const { db, refreshKey } = useApp();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    let active = true;
    setLoading(true);
    createDashboardService(db)
      .summary()
      .then((r) => {
        if (active) {
          setSummary(r);
          setLoading(false);
        }
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [db, refreshKey]);

  return { summary, loading };
}
