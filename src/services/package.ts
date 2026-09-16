import type { DbClient } from '../db/types';
import type {
  CreatePackageInput,
  DataSource,
  DuplicateCheckResult,
  Package,
  PackageQuery,
  PickupCodeHistory,
  UpdatePackageInput,
} from '../types';

export interface PackageService {
  list(query?: PackageQuery): Promise<Package[]>;
  get(id: string): Promise<Package | null>;
  create(input: CreatePackageInput): Promise<Package>;
  update(id: string, input: UpdatePackageInput): Promise<Package>;
  remove(id: string): Promise<void>;
  markPickedUp(id: string): Promise<Package>;
  changePickupCode(id: string, newCode: string, source: DataSource): Promise<Package>;
  checkDuplicate(input: CreatePackageInput): Promise<DuplicateCheckResult>;
  history(packageId: string): Promise<PickupCodeHistory[]>;
}

export function createPackageService(db: DbClient): PackageService {
  return {
    list: (query) => db.listPackages(query),
    get: (id) => db.getPackage(id),
    create: async (input) => {
      if (!input.courierCompany || !input.courierCompany.trim()) {
        throw new Error('快递公司不能为空');
      }
      if (!input.status) throw new Error('快递状态不能为空');
      return db.createPackage({
        ...input,
        courierCompany: input.courierCompany.trim(),
      });
    },
    update: (id, input) => db.updatePackage(id, input),
    remove: (id) => db.deletePackage(id),
    markPickedUp: (id) => db.markAsPickedUp(id),
    changePickupCode: (id, newCode, source) => db.updatePickupCode(id, newCode, source),
    checkDuplicate: (input) => db.findDuplicate(input),
    history: (packageId) => db.listHistory(packageId),
  };
}
