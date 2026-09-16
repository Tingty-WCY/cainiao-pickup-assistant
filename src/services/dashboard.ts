import type { DbClient } from '../db/types';
import type { DashboardSummary } from '../types';

export interface DashboardService {
  summary(): Promise<DashboardSummary>;
}

export function createDashboardService(db: DbClient): DashboardService {
  return {
    summary: () => db.getSummary(),
  };
}
