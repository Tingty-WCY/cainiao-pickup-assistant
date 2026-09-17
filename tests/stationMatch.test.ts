import { describe, it, expect } from 'vitest';
import { planStationMerge, resolveFixedStationId } from '../src/services/stationMatch';
import type { Station } from '../src/types';

function st(id: string, name: string): Station {
  return { id, name, type: 'OTHER', createdAt: '', updatedAt: '' };
}

describe('驿站归到预置站点', () => {
  it('按驿站名里的品牌命中', () => {
    expect(resolveFixedStationId('中央民族大学京东服务站')).toBe('station-jd');
    expect(resolveFixedStationId('中国邮政')).toBe('station-post');
    expect(resolveFixedStationId('菜鸟驿站')).toBe('station-cainiao');
    expect(resolveFixedStationId('学生公寓西侧近邻宝')).toBe('station-jinlinbao');
    expect(resolveFixedStationId('北京市海淀区民大顺丰店')).toBe('station-sf');
    expect(resolveFixedStationId('德邦快递')).toBe('station-deppon');
  });

  it('驿站名认不出时退到快递公司', () => {
    expect(resolveFixedStationId('北京市海淀区民大店', '顺丰')).toBe('station-sf');
    expect(resolveFixedStationId('某某快递服务中心', '德邦')).toBe('station-deppon');
    expect(resolveFixedStationId('学院路服务站', '京东')).toBe('station-jd');
  });

  it('驿站名认不出时，用短信签名兜底（品牌常只写在【】里）', () => {
    // 【近邻宝】凭「9911-9276」到学生公寓西侧10号柜 —— 正文里没有品牌名
    expect(resolveFixedStationId('学生公寓西侧10号柜', undefined, '近邻宝')).toBe(
      'station-jinlinbao',
    );
    // 驿站名比签名更具体，两者都认得出时以驿站名为准
    expect(resolveFixedStationId('中央民族大学京东服务站', undefined, '菜鸟驿站')).toBe('station-jd');
  });

  it('都认不出 / 没解析出驿站名 → 一律归菜鸟', () => {
    expect(resolveFixedStationId('中央民族大学丰台校区快递服务中心')).toBe('station-cainiao');
    expect(resolveFixedStationId('学生公寓西侧9号柜X27')).toBe('station-cainiao');
    expect(resolveFixedStationId('1号楼丰巢柜')).toBe('station-cainiao');
    expect(resolveFixedStationId(undefined, undefined)).toBe('station-cainiao');
    expect(resolveFixedStationId('')).toBe('station-cainiao');
  });

  it('驿站名优先于快递公司', () => {
    // 短信说「到京东服务站取件」但承运是顺丰 → 站点仍按京东算
    expect(resolveFixedStationId('中央民族大学京东服务站', '顺丰')).toBe('station-jd');
  });
});

describe('驿站合并规划（老数据规整）', () => {
  it('非预置驿站按名字映射到预置驿站', () => {
    const plan = planStationMerge([
      st('station-cainiao', '菜鸟'),
      st('a', '中央民族大学京东服务站'),
      st('b', '中央民族大学丰台校区快递服务中心'),
    ]);
    expect(plan).toEqual([
      { from: 'a', to: 'station-jd' },
      { from: 'b', to: 'station-cainiao' },
    ]);
  });

  it('只有预置驿站时无需合并', () => {
    expect(
      planStationMerge([st('station-cainiao', '菜鸟'), st('station-jd', '京东')]),
    ).toEqual([]);
  });

  it('预置驿站自身不会被合并掉', () => {
    const plan = planStationMerge([
      st('station-sf', '顺丰'),
      st('station-post', '邮政'),
    ]);
    expect(plan).toEqual([]);
  });
});
