import type { DbClient } from '../db/types';
import type { CreateStationInput, Station, UpdateStationInput } from '../types';

export interface StationService {
  list(): Promise<Station[]>;
  get(id: string): Promise<Station | null>;
  create(input: CreateStationInput): Promise<Station>;
  update(id: string, input: UpdateStationInput): Promise<Station>;
  remove(id: string): Promise<void>;
}

export function createStationService(db: DbClient): StationService {
  return {
    list: () => db.listStations(),
    get: (id) => db.getStation(id),
    create: async (input) => {
      if (!input.name || !input.name.trim()) throw new Error('驿站名称不能为空');
      return db.createStation({ ...input, name: input.name.trim() });
    },
    update: (id, input) => db.updateStation(id, input),
    remove: (id) => db.deleteStation(id),
  };
}
