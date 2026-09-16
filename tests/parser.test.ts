import { describe, it, expect } from 'vitest';
import { parseText } from '../src/parser/engine';

describe('文本解析引擎', () => {
  it('完整物流短信：中通 + 菜鸟驿站 + 取件码 + 待取', () => {
    const r = parseText('您的中通快递已到达XX大学东区菜鸟驿站，取件码528，请及时领取。');
    expect(r.courierCompany).toBe('中通');
    expect(r.stationName).toContain('菜鸟驿站');
    expect(r.pickupCode).toBe('528');
    expect(r.status).toBe('PENDING_PICKUP');
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('识别手机号与单号', () => {
    const r = parseText('顺丰SF1234567890123 已揽收，请联系13812341234');
    expect(r.courierCompany).toBe('顺丰');
    expect(r.trackingNumber).toBe('SF1234567890123');
    expect(r.phone).toBe('13812341234');
    expect(r.status).toBe('SHIPPING');
  });

  it('只有取件码也能识别为待取', () => {
    const r = parseText('取件码1234');
    expect(r.pickupCode).toBe('1234');
    expect(r.status).toBe('PENDING_PICKUP');
  });

  it('只有快递公司', () => {
    const r = parseText('圆通快递');
    expect(r.courierCompany).toBe('圆通');
  });

  it('运输中状态识别', () => {
    const r = parseText('您的京东物流正在运输中，请耐心等待');
    expect(r.courierCompany).toBe('京东');
    expect(r.status).toBe('SHIPPING');
  });

  it('覆盖各快递公司关键词', () => {
    const cases: [string, string][] = [
      ['中通', '中通'],
      ['圆通', '圆通'],
      ['申通', '申通'],
      ['韵达', '韵达'],
      ['顺丰', '顺丰'],
      ['京东', '京东'],
      ['极兔', '极兔'],
      ['EMS', '邮政'],
      ['菜鸟', '菜鸟'],
    ];
    for (const [input, expected] of cases) {
      expect(parseText(input).courierCompany).toBe(expected);
    }
  });

  it('低置信度：无法识别任何字段', () => {
    const r = parseText('今天天气不错');
    expect(r.confidence).toBeLessThan(0.7);
    expect(r.courierCompany).toBeUndefined();
    expect(r.pickupCode).toBeUndefined();
  });

  it('驿站类型无关，但能提取驿站名（兔喜）', () => {
    const r = parseText('您的包裹已到兔喜生活店，取件码731');
    expect(r.stationName).toContain('兔喜');
    expect(r.pickupCode).toBe('731');
  });

  // ---- 真实电商 / 驿站短信格式 ----
  it('菜鸟驿站短信：驿站名 + 取件码 + 待取', () => {
    const r = parseText(
      '【菜鸟驿站】您有1个包裹已到阳光花园菜鸟驿站，取件码8-2-1073，凭此码取件。地址：阳光花园南门。回TD退订',
    );
    expect(r.stationName).toContain('菜鸟驿站');
    expect(r.pickupCode).toBe('8-2-1073');
    expect(r.status).toBe('PENDING_PICKUP');
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('京东短信：平台识别 JD + 京东便民点 + 取件码', () => {
    const r = parseText('【京东】您的订单已送达京东便民自提点，取件码2503，请凭码取件');
    expect(r.platform).toBe('JD');
    expect(r.courierCompany).toBe('京东');
    expect(r.stationName).toContain('京东');
    expect(r.pickupCode).toBe('2503');
    expect(r.status).toBe('PENDING_PICKUP');
  });

  it('丰巢短信：丰巢柜 + 带连字符取件码 + 已投递', () => {
    const r = parseText('【丰巢】您的包裹已投递至1号楼丰巢柜，取件码1234-5678，请尽快取件');
    expect(r.stationName).toContain('丰巢');
    expect(r.pickupCode).toBe('1234-5678');
    expect(r.status).toBe('PENDING_PICKUP');
    expect(r.platform).toBeUndefined();
  });

  it('拼多多短信：平台识别 PDD + 兔喜 + 取件码', () => {
    const r = parseText(
      '【拼多多】您购买的包裹已到幸福里兔喜生活，取件码66-7-0099，请尽快取件',
    );
    expect(r.platform).toBe('PDD');
    expect(r.stationName).toContain('兔喜');
    expect(r.pickupCode).toBe('66-7-0099');
    expect(r.status).toBe('PENDING_PICKUP');
  });

  it('抖音短信：平台识别 DOUYIN + 字母数字取件码 + 已入库', () => {
    const r = parseText('【抖音商城】您的订单已入库，取件码D14-2297，请前往取件');
    expect(r.platform).toBe('DOUYIN');
    expect(r.pickupCode).toBe('D14-2297');
    expect(r.status).toBe('PENDING_PICKUP');
  });

  it('淘宝短信：平台识别 TAOBAO + 中通 + 菜鸟驿站', () => {
    const r = parseText('【淘宝】您的中通快递已到达菜鸟驿站，取件码528，请及时领取');
    expect(r.platform).toBe('TAOBAO');
    expect(r.courierCompany).toBe('中通');
    expect(r.stationName).toContain('菜鸟驿站');
    expect(r.pickupCode).toBe('528');
    expect(r.status).toBe('PENDING_PICKUP');
  });

  it('自提柜/便民点等扩展驿站词也能识别', () => {
    const r = parseText('您的快递已放在西门代收点，取件码A-12-34，请来取');
    expect(r.stationName).toContain('代收点');
    expect(r.pickupCode).toBe('A-12-34');
    expect(r.status).toBe('PENDING_PICKUP');
  });

  // ---- 6.2 反馈：短信种类多、识别不全 ----
  it('取件码别名：提货码 / 取货码 / 验证码 / 凭码 都能识别', () => {
    expect(parseText('您的包裹已到菜鸟驿站，提货码8848').pickupCode).toBe('8848');
    expect(parseText('请到丰巢柜，取货码A102').pickupCode).toBe('A102');
    expect(parseText('菜鸟驿站验证码6688，请勿泄露').pickupCode).toBe('6688');
    expect(parseText('凭码9527取件').pickupCode).toBe('9527');
  });

  it('没有「码」字时也能识别货架式取件码（8-2-3056）', () => {
    const r = parseText('您有1个包裹到阳光花园菜鸟驿站 8-2-3056 请及时取件');
    expect(r.stationName).toBe('阳光花园菜鸟驿站');
    expect(r.pickupCode).toBe('8-2-3056');
    expect(r.status).toBe('PENDING_PICKUP');
  });

  it('脱敏手机号（138****1234）也能提取', () => {
    const r = parseText('【淘宝】您的包裹已到菜鸟驿站，取件码1234，联系138****1234');
    expect(r.phone).toBeUndefined();
    expect(r.phoneMasked).toBe('138****1234');
  });

  it('短信没写公司名时，从单号前缀推断快递公司', () => {
    expect(parseText('您的快递 SF1234567890 已到达菜鸟驿站，取件码1234').courierCompany).toBe('顺丰');
    expect(parseText('您的快递 JD0987654321 已到达菜鸟驿站，取件码1234').courierCompany).toBe('京东');
  });

  it('驿站名清洗：剥掉「您的中通快递已到达」这类前缀', () => {
    expect(parseText('您的中通快递已到达XX大学东区菜鸟驿站，取件码528').stationName).toBe(
      'XX大学东区菜鸟驿站',
    );
    expect(parseText('您的包裹已到兔喜生活店，取件码731').stationName).toBe('兔喜生活店');
    expect(parseText('您的快递已放在西门代收点，取件码A-12-34').stationName).toBe('西门代收点');
  });

  it('认不出公司名时不影响取件码/驿站的识别', () => {
    const r = parseText('您有一个包裹已到达阳光小区驿站，取件码6-3-2088');
    expect(r.courierCompany).toBeUndefined();
    expect(r.pickupCode).toBe('6-3-2088');
    expect(r.stationName).toBe('阳光小区驿站');
    expect(r.confidence).toBeGreaterThanOrEqual(0.7);
  });

  // ---- 真实样本：中央民族大学各驿站（用户实拍短信） ----
  it('京东：字母数字-数字-数字 + 京东服务站 + 尾号', () => {
    const r = parseText(
      '【京东快递】取件码G5-16-008，您的快件尾号5624已送达中央民族大学京东服务站，地址：中央民族大学丰台校区1号宿舍楼西侧京东快递，取件和寄件可咨询 3.cn/-33lEYii',
    );
    expect(r.pickupCode).toBe('G5-16-008');
    expect(r.stationName).toBe('中央民族大学京东服务站');
    expect(r.tailNumber).toBe('5624');
    expect(r.courierCompany).toBe('京东');
    expect(r.status).toBe('PENDING_PICKUP');
  });

  it('极兔/菜鸟：请凭 513-2-4004 到…服务中心取件', () => {
    const r = parseText(
      '【极兔速递】请凭513-2-4004到中央民族大学丰台校区快递服务中心取件，询17801028223，地址：中央民族大学丰台校区菜鸟驿站南侧小白楼一层',
    );
    expect(r.pickupCode).toBe('513-2-4004');
    expect(r.stationName).toBe('中央民族大学丰台校区快递服务中心');
    expect(r.courierCompany).toBe('极兔');
    expect(r.status).toBe('PENDING_PICKUP');
  });

  it('近邻宝：凭「75962434」到 9号柜X27 取件', () => {
    const r = parseText('【近邻宝】凭「75962434」到学生公寓西侧9号柜X27取件。');
    expect(r.pickupCode).toBe('75962434');
    expect(r.stationName).toBe('学生公寓西侧9号柜X27');
    expect(r.status).toBe('PENDING_PICKUP');
  });

  it('邮政：请凭7-9448到中国邮政领取 + 尾号9499', () => {
    const r = parseText(
      '【邮政驿站】您的中国邮政快递*9499已送达，请凭7-9448到中国邮政领取,时间9-18询13161305668',
    );
    expect(r.pickupCode).toBe('7-9448');
    expect(r.stationName).toBe('中国邮政');
    expect(r.tailNumber).toBe('9499');
    expect(r.courierCompany).toBe('邮政');
  });

  it('顺丰：可凭SF7-3780到店…领取 + 尾号0901', () => {
    const r = parseText(
      '【驿小哥】您好，您的顺丰快递0901已到中央民族大学西门顺丰，可凭SF7-3780到店北京市海淀区民大店领取。',
    );
    expect(r.pickupCode).toBe('SF7-3780');
    expect(r.stationName).toBe('北京市海淀区民大店');
    expect(r.tailNumber).toBe('0901');
    expect(r.courierCompany).toBe('顺丰');
  });

  // ---- 智能柜 / 外卖柜：带格口号 ----
  it('美团外卖柜：格口号15 + 取件码6165 + B柜', () => {
    const r = parseText(
      '【美团智能外卖柜】您的订单物品已送至中央民族大学(丰台校区)民族丰台校区快递站西南侧B柜，格口号：15，取件码：6165，存柜超过12小时将被清理，请及时取件。',
    );
    expect(r.pickupCode).toBe('6165');
    expect(r.boxNo).toBe('B-15');
    expect(r.stationName).toBe('民族丰台校区快递站西南侧B柜');
    expect(r.courierCompany).toBe('美团');
    expect(r.platform).toBe('MEITUAN');
    expect(r.status).toBe('PENDING_PICKUP');
  });

  it('柜号不带冒号也能识别，且不会误把「智能外卖柜」当驿站名', () => {
    const r = parseText('【丰巢】您的快递已存入丰巢柜A区，柜号A12，取件码8899，请及时取件');
    expect(r.pickupCode).toBe('8899');
    expect(r.boxNo).toBe('A12');
    expect(r.stationName).not.toContain('丰巢】');
  });
});
