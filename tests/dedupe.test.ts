import { describe, it, expect } from 'vitest';
import { matchDuplicate } from '../src/dedupe';
import type { Package } from '../src/types';

function pkg(p: Partial<Package> & Pick<Package, 'id' | 'courierCompany' | 'status'>): Package {
  return {
    stationId: undefined,
    source: 'MANUAL',
    createdAt: '',
    updatedAt: '',
    ...p,
  } as Package;
}

const existing: Package[] = [
  pkg({
    id: 'p1',
    courierCompany: '中通',
    trackingNumber: 'ZT123',
    status: 'PENDING_PICKUP',
    pickupCode: '528',
    stationId: 's1',
  }),
  pkg({
    id: 'p2',
    courierCompany: '圆通',
    status: 'PENDING_PICKUP',
    pickupCode: '831',
    stationId: 's1',
  }),
];

describe('应用层去重', () => {
  it('优先级1：单号相同即命中', () => {
    const id = matchDuplicate(
      {
        source: 'TEXT',
        courierCompany: '中通',
        status: 'PENDING_PICKUP',
        trackingNumber: 'ZT123',
      },
      existing,
    );
    expect(id).toBe('p1');
  });

  it('同一单号即使驿站不同也算同一件（已移除账号维度）', () => {
    const id = matchDuplicate(
      {
        source: 'TEXT',
        courierCompany: '中通',
        status: 'PENDING_PICKUP',
        trackingNumber: 'ZT123',
        stationId: 's9',
      },
      existing,
    );
    expect(id).toBe('p1');
  });

  it('不同单号不命中', () => {
    const id = matchDuplicate(
      {
        source: 'TEXT',
        courierCompany: '中通',
        status: 'PENDING_PICKUP',
        trackingNumber: 'ZT999',
      },
      existing,
    );
    expect(id).toBeNull();
  });

  it('优先级2：无单号时 公司+取件码+驿站 命中', () => {
    const id = matchDuplicate(
      {
        source: 'TEXT',
        courierCompany: '圆通',
        status: 'PENDING_PICKUP',
        pickupCode: '831',
        stationId: 's1',
      },
      existing,
    );
    expect(id).toBe('p2');
  });

  it('缺驿站时不走优先级2', () => {
    const id = matchDuplicate(
      { source: 'TEXT', courierCompany: '圆通', status: 'PENDING_PICKUP', pickupCode: '831' },
      existing,
    );
    expect(id).toBeNull();
  });

  it('无任何匹配应返回 null', () => {
    const id = matchDuplicate(
      {
        source: 'TEXT',
        courierCompany: '韵达',
        status: 'PENDING_PICKUP',
        pickupCode: '999',
        stationId: 's9',
      },
      existing,
    );
    expect(id).toBeNull();
  });
});
