import type { CreatePackageInput, Package } from '../types';

/**
 * 应用层去重核心（纯函数，可独立单测）。
 *
 * 判定顺序：
 *  1. 单号相同 → 同一件快递
 *  2. 没有单号时：快递公司 + 取件码 + 驿站 三要素全同 → 判为同一件
 * 都不命中则返回 null（应新建记录）。
 *
 * 注意（2026-09-16）：账号功能已移除，去重不再按「账号 / 手机号」区分维度。
 * 早期规则是「单号 + 账号」，同一个包裹挂在两个账号下会被当成两件，
 * 对单手机用户来说纯属噪音。
 *
 * @returns 命中的已存在 Package.id，未命中返回 null
 */
export function matchDuplicate(candidate: CreatePackageInput, existing: Package[]): string | null {
  // 优先级 1：单号相同
  if (candidate.trackingNumber) {
    const hit = existing.find(
      (p) => !!p.trackingNumber && p.trackingNumber === candidate.trackingNumber,
    );
    if (hit) return hit.id;
  }

  // 优先级 2：无单号 → 公司 + 取件码 + 驿站
  if (
    !candidate.trackingNumber &&
    candidate.courierCompany &&
    candidate.pickupCode &&
    candidate.stationId
  ) {
    const hit = existing.find(
      (p) =>
        !p.trackingNumber &&
        p.courierCompany === candidate.courierCompany &&
        p.pickupCode === candidate.pickupCode &&
        p.stationId === candidate.stationId,
    );
    if (hit) return hit.id;
  }

  return null;
}
