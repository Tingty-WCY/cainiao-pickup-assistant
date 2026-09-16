import type { PackageStatus, Platform, StationType } from '../types';

// 快递公司关键词（display 名，便于直接存储与展示）
export const COURIER_KEYWORDS: { name: string; keywords: string[] }[] = [
  { name: '中通', keywords: ['中通', 'zto'] },
  { name: '圆通', keywords: ['圆通', 'yto'] },
  { name: '申通', keywords: ['申通', 'sto'] },
  { name: '韵达', keywords: ['韵达', 'yunda'] },
  { name: '顺丰', keywords: ['顺丰', 'sf速运'] },
  { name: '京东', keywords: ['京东', '京喜', 'jd物流'] },
  { name: '极兔', keywords: ['极兔', 'j&t'] },
  { name: '邮政', keywords: ['邮政', 'ems', '中国邮政', '邮局'] },
  { name: '菜鸟', keywords: ['菜鸟', '丹鸟', '菜鸟直送'] },
  { name: '德邦', keywords: ['德邦'] },
  { name: '百世', keywords: ['百世'] },
  { name: '跨越', keywords: ['跨越速运'] },
  { name: '美团', keywords: ['美团', 'meituan', '外卖柜'] },
  { name: '闪送', keywords: ['闪送'] },
  { name: '达达', keywords: ['达达', '达达快送'] },
];

// 单号前缀 → 快递公司（很多短信不写公司名，只能从单号推断）
const TRACKING_COURIER_RULES: { pattern: RegExp; name: string }[] = [
  { pattern: /^sf/i, name: '顺丰' },
  { pattern: /^jd/i, name: '京东' },
  { pattern: /^jt/i, name: '极兔' },
  { pattern: /^sto/i, name: '申通' },
  { pattern: /^yt/i, name: '圆通' },
  { pattern: /^zto/i, name: '中通' },
  { pattern: /^yd/i, name: '韵达' },
  { pattern: /^db/i, name: '德邦' },
  { pattern: /^ems/i, name: '邮政' },
];

// 驿站关键词（按顺序，长的在前，避免被短词抢匹配）
export const STATION_KEYWORD_PATTERN =
  '智能外卖柜|外卖柜|智能柜|取餐柜|包裹柜|快递柜|自提柜|自提点|便民点|代收点|取件点|寄存点|代售点|菜鸟驿站|京东驿站|快递驿站|快递中心|服务中心|快递站|服务站|服务点|收发室|兔喜|丰巢|号柜|驿站|柜|菜鸟';

/**
 * 「到 X 取件 / 到店 X 领取」结构：学校驿站短信最常见的写法，
 * 比关键词匹配更准，优先使用。
 */
export const STATION_ARRIVE_REGEX =
  /(?:到店|到|至|前往)\s*([^\s，,。;；!！?？、（）()「」【】]{2,20}?)\s*(?:取件|领取|取走|自提|拿取|拿件)/;

export const STATION_REGEX = new RegExp(
  `([\\u4e00-\\u9fa5A-Za-z0-9]*?(?:${STATION_KEYWORD_PATTERN})[\\u4e00-\\u9fa5A-Za-z0-9]*)`,
  'i',
);

// 取件码：覆盖「取件码/取件号/提货码/取货码/取件密码/提取码/验证码/凭码」等别名
export const PICKUP_CODE_REGEX =
  /(?:取件码|取件号|取货码|提货码|取件密码|取件验证码|提取码|验证码|凭取件码|凭码|开箱码|密码|码)\s*(?:是|为|:|：)?\s*([0-9A-Za-z][0-9A-Za-z\-]{1,15})/i;

// 「凭 1234 取件 / 用 1234 领取」这类没有「码」字的写法
export const PICKUP_CODE_VERB_REGEX = /(?:凭|用|输入)\s*([0-9]{4,8})\s*(?:取件|领取|取走|开箱)/;

/**
 * 「凭 xxx」直接跟码（学校驿站最常见）：
 * 请凭513-2-4004到… / 凭「75962434」到… / 请凭7-9448到… / 可凭SF7-3780到…
 * 允许被「」『』【】"" 包裹。
 */
export const PICKUP_CODE_BARE_REGEX =
  /(?:请凭|可凭|凭取件码|凭码|凭)\s*[「『【\["'（(]?\s*([A-Za-z0-9][A-Za-z0-9\-]{2,15})/;

// 菜鸟货架式取件码：8-2-3056 / 513-2-4004（货架-层-编号，位数放宽）
// 注意：Hermes 不支持正则后行断言，故用前后字符组做边界
export const SHELF_CODE_REGEX = /(?:^|[^\d\-])(\d{1,3}-\d{1,3}-\d{3,6})(?:[^\d\-]|$)/;

/** 快递尾号：出库时常需与取件码一起出示。尾号5624 / 快递*9499 / 快递0901 */
export const TAIL_NUMBER_REGEX = /(?:尾号|后四位|快件号|快递号|快递|快件|单号)\s*[*#]?\s*(\d{4})/;

/** 格口号：外卖柜/智能柜取件要先找格子。格口号：15 / 柜号15 / 箱号A12 */
export const BOX_NO_REGEX =
  /(?:格口号|格口|柜口号|柜号|箱号|格子号|柜位|取件口|取餐口|存放格)\s*(?:是|为|:|：)?\s*([0-9A-Za-z]{1,6})/;

/** 柜体编号：B柜 / 3号柜 —— 配合格口号一起用（「B柜 格口15」） */
export const CABINET_REGEX = /([0-9A-Za-z]{1,3})柜(?:子)?/;

export const PHONE_REGEX = /(1[3-9]\d{9})/;
// 脱敏手机号：138****1234 / 138***1234，用于与已有账号比对
export const PHONE_MASKED_REGEX = /(1[3-9]\d)\*{2,6}(\d{3,4})/;
// 运单号：快递前缀+数字，或 12~20 位纯数字
export const TRACKING_REGEX = /(?:(?:sf|yto|zto|jd|sto|yunda|jt|ems|yd)[\d]{8,15})|\d{12,20}/i;

const STATUS_KEYWORDS: { status: PackageStatus; keywords: string[] }[] = [
  { status: 'PICKED_UP', keywords: ['已取件', '已签收', '取件成功', '已领取', '已取出', '已取'] },
  { status: 'EXCEPTION', keywords: ['异常', '破损', '退回', '问题件', '拒收', '疑难', '滞留'] },
  {
    status: 'PENDING_PICKUP',
    keywords: [
      '已送达', '已到达', '到达', '请取件', '请及时领取', '待取', '可取', '取件通知', '已到', '到站',
      '已投递', '已入库', '入柜', '入箱', '已入柜', '请尽快取件', '凭码取件', '前往取件', '来取件',
      '到点取件', '请来取', '可取件', '待领取', '请领取', '已存放', '存放于', '包裹已到', '已到店',
    ],
  },
  { status: 'SHIPPING', keywords: ['运输中', '运送中', '派送中', '已揽收', '在途', '已发货', '出库', '已寄出', '揽收', '已出库'] },
];

// 平台识别关键词（优先匹配【发件方】标签，再退化为正文关键词）
const PLATFORM_KEYWORDS: { platform: Platform; keywords: string[] }[] = [
  { platform: 'TAOBAO', keywords: ['淘宝', '天猫', '淘特', 'taobao', 'tmall'] },
  { platform: 'JD', keywords: ['京东', 'jingdong', 'jd.com'] },
  { platform: 'PDD', keywords: ['拼多多', 'pinduoduo', 'pdd'] },
  { platform: 'DOUYIN', keywords: ['抖音', 'douyin'] },
  { platform: 'MEITUAN', keywords: ['美团', 'meituan', '外卖柜'] },
];

// 驿站名前缀噪声：短信里驿站名前常挂着一串话，需要剥掉
const STATION_PREFIX_NOISE =
  /^(?:您的|你的|您|你|本|该|订单|包裹|快件|宝贝|已到达|已送达|已投递|已入库|已到|到达|送达|投递|入库|请到|请前往|前往|请|凭|至|在|放置|存放|的|了|等)/;

// 句中噪声：驿站名前面夹着的动词，取最后一个之后的部分
const STATION_MID_NOISE =
  /已到达|已送达|已投递|已入库|已到|到达|送达|投递|入库|放在|存放于|送至|送到|已存放|请到|请前往|前往|到|至/g;

export function inferPlatform(text: string): Platform | undefined {
  // 1) 优先匹配短信发件方标签：【淘宝】/【京东】/【拼多多】/【抖音商城】/【美团智能外卖柜】 等
  const senderMatch = text.match(/[【\[]\s*(淘宝|天猫|淘特|京东|拼多多|抖音|美团)[^】\]]*[】\]]/);
  if (senderMatch) {
    const s = senderMatch[1];
    if (s.includes('淘宝') || s.includes('天猫') || s.includes('淘特')) return 'TAOBAO';
    if (s.includes('京东')) return 'JD';
    if (s.includes('拼多多')) return 'PDD';
    if (s.includes('抖音')) return 'DOUYIN';
    if (s.includes('美团')) return 'MEITUAN';
  }
  // 2) 退化为正文关键词（仅作弱提示）
  const lower = text.toLowerCase();
  for (const { platform, keywords } of PLATFORM_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) return platform;
  }
  return undefined;
}

export function inferStatus(text: string): PackageStatus | undefined {
  for (const { status, keywords } of STATUS_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) return status;
  }
  return undefined;
}

/** 从运单号前缀推断快递公司（识别不出返回 undefined，不强猜） */
export function inferCourierFromTracking(tracking?: string): string | undefined {
  if (!tracking) return undefined;
  const t = tracking.trim();
  for (const { pattern, name } of TRACKING_COURIER_RULES) {
    if (pattern.test(t) && name) return name;
  }
  return undefined;
}

/**
 * 清洗驿站名：短信里常抓到「您的订单已送达阳光花园菜鸟驿站」这种整句，
 * 需要剥掉前缀噪声、按标点截断、限制长度。
 */
export function cleanStationName(raw: string): string {
  let s = (raw || '').trim();
  if (!s) return '';

  // 1) 遇到标点/空白就截断
  const punctIdx = s.search(/[\s，,。;；!！?？、:：]/);
  if (punctIdx > 0) s = s.slice(0, punctIdx);

  // 2) 反复剥离开头的噪声词（最多 12 次，防死循环）
  const stripPrefix = (input: string): string => {
    let out = input;
    for (let i = 0; i < 12; i += 1) {
      const m = out.match(STATION_PREFIX_NOISE);
      if (!m) break;
      const next = out.slice(m[0].length);
      if (!next) break;
      out = next;
    }
    return out;
  };
  s = stripPrefix(s);

  // 3) 仍然偏长：说明中间还夹着动词，取最后一个句中噪声之后的部分
  if (s.length > 9) {
    STATION_MID_NOISE.lastIndex = 0;
    let last = -1;
    let m: RegExpExecArray | null;
    while ((m = STATION_MID_NOISE.exec(s)) !== null) {
      last = m.index + m[0].length;
    }
    if (last > 0 && last < s.length) s = stripPrefix(s.slice(last));
  }

  // 4) 兜底：还是很长就只保留驿站关键词及其前面 8 个字符
  if (s.length > 20) {
    const kwIdx = s.search(new RegExp(STATION_KEYWORD_PATTERN, 'i'));
    if (kwIdx > 8) s = stripPrefix(s.slice(kwIdx - 8));
  }

  return s.trim();
}

export function inferStationType(name: string): StationType {
  if (name.includes('菜鸟')) return 'CAINIAO';
  if (name.includes('兔喜')) return 'TUXI';
  if (name.includes('丰巢')) return 'FENGCHAO';
  // 智能柜类：美团外卖柜 / 近邻宝 / 各类取餐柜
  if (
    name.includes('美团') ||
    name.includes('外卖柜') ||
    name.includes('智能柜') ||
    name.includes('取餐柜') ||
    name.includes('近邻宝')
  ) {
    return 'LOCKER';
  }
  if (name.includes('京东')) return 'JD';
  if (name.includes('中通')) return 'ZTO';
  if (name.includes('圆通')) return 'YTO';
  if (name.includes('申通')) return 'STO';
  if (name.includes('韵达')) return 'YUNDA';
  return 'OTHER';
}
