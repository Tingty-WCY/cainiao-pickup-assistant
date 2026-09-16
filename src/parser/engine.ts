import type { PackageStatus, ParsedPackage, Platform } from '../types';
import {
  COURIER_KEYWORDS,
  STATION_REGEX,
  PICKUP_CODE_REGEX,
  PICKUP_CODE_VERB_REGEX,
  PICKUP_CODE_BARE_REGEX,
  SHELF_CODE_REGEX,
  STATION_ARRIVE_REGEX,
  TAIL_NUMBER_REGEX,
  BOX_NO_REGEX,
  CABINET_REGEX,
  PHONE_REGEX,
  PHONE_MASKED_REGEX,
  TRACKING_REGEX,
  inferStatus,
  inferPlatform,
  inferCourierFromTracking,
  cleanStationName,
} from './rules';

/** 短信发件方标签：【美团智能外卖柜】/【京东快递】… 这类不能当成驿站名 */
const SENDER_TAG_REGEX = /[【\[][^】\]]*[】\]]/g;

/**
 * 文本解析引擎（纯函数，无副作用，可单测）。
 * 支持：取件码 / 驿站名称 / 手机号(含脱敏) / 快递公司 / 单号 / 状态 识别，并给出置信度。
 */
export function parseText(rawText: string): ParsedPackage {
  const text = (rawText || '').trim();
  // 去掉【发件方】标签后的正文，仅用于驿站名匹配（取件码等仍用原文，避免误伤）
  const body = text.replace(SENDER_TAG_REGEX, '');
  const result: ParsedPackage = {
    confidence: 0,
    rawText: rawText || '',
  };

  // 0. 平台（用于粘贴解析后自动选账号）
  const platform: Platform | undefined = inferPlatform(text);
  if (platform) result.platform = platform;

  // 1. 取件码：主正则（取件码/提货码/验证码…）
  const codeMatch = text.match(PICKUP_CODE_REGEX);
  if (codeMatch) {
    result.pickupCode = codeMatch[1].trim();
  }
  // 1b. 「请凭513-2-4004」「凭「75962434」」「可凭SF7-3780」——学校驿站最常见的写法
  if (!result.pickupCode) {
    const bareMatch = text.match(PICKUP_CODE_BARE_REGEX);
    if (bareMatch) result.pickupCode = bareMatch[1].trim();
  }
  // 1c. 「凭 1234 取件」这类
  if (!result.pickupCode) {
    const verbMatch = text.match(PICKUP_CODE_VERB_REGEX);
    if (verbMatch) result.pickupCode = verbMatch[1];
  }

  // 2. 驿站名称：优先「到 X 取件/领取」结构，再用关键词粗匹配 + 清洗
  const arriveMatch = text.match(STATION_ARRIVE_REGEX);
  if (arriveMatch) {
    const cleaned = cleanStationName(arriveMatch[1]);
    if (cleaned) result.stationName = cleaned;
  }
  if (!result.stationName) {
    const stationMatch = body.match(STATION_REGEX);
    if (stationMatch) {
      const cleaned = cleanStationName(stationMatch[1]);
      if (cleaned) result.stationName = cleaned;
    }
  }

  // 3. 货架式取件码回退：菜鸟常见「8-2-3056」，只有在取件语境下才认
  if (!result.pickupCode && (result.stationName || /取件|领取|取货/.test(text))) {
    const shelfMatch = text.match(SHELF_CODE_REGEX);
    if (shelfMatch) result.pickupCode = shelfMatch[1];
  }

  // 4. 快递尾号（出库时常需与取件码一起出示）
  const tailMatch = text.match(TAIL_NUMBER_REGEX);
  if (tailMatch && tailMatch[1] !== result.pickupCode) {
    result.tailNumber = tailMatch[1];
  }

  // 4b. 柜号/格口号（外卖柜、智能柜）：先找柜体，再找格子，拼成「B-15」
  const boxMatch = text.match(BOX_NO_REGEX);
  const cabinetMatch = text.match(CABINET_REGEX);
  if (boxMatch) {
    const no = boxMatch[1].trim();
    // 与取件码相同说明抓错了（比如短信里只有一处数字），丢弃
    if (no !== result.pickupCode) {
      result.boxNo = cabinetMatch ? `${cabinetMatch[1]}-${no}` : no;
    }
  } else if (cabinetMatch && cabinetMatch[1] !== result.pickupCode) {
    result.boxNo = cabinetMatch[1];
  }

  // 5. 手机号：完整优先，其次脱敏格式（138****1234）
  const phoneMatch = text.match(PHONE_REGEX);
  if (phoneMatch) {
    result.phone = phoneMatch[1];
  } else {
    const maskedMatch = text.match(PHONE_MASKED_REGEX);
    if (maskedMatch) result.phoneMasked = `${maskedMatch[1]}****${maskedMatch[2]}`;
  }

  // 5. 快递单号
  const trackingMatch = text.match(TRACKING_REGEX);
  if (trackingMatch) {
    const t = trackingMatch[0];
    // 避免把取件码当成单号
    if (!result.pickupCode || t !== result.pickupCode) {
      result.trackingNumber = t;
    }
  }

  // 6. 快递公司：正文关键词优先，其次从单号前缀推断（很多短信不写公司名）
  const lower = text.toLowerCase();
  for (const { name, keywords } of COURIER_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) {
      result.courierCompany = name;
      break;
    }
  }
  if (!result.courierCompany) {
    const fromTracking = inferCourierFromTracking(result.trackingNumber);
    if (fromTracking) result.courierCompany = fromTracking;
  }
  // 「菜鸟驿站」是驿站不是公司：若有单号能推断出真实公司，就别把「菜鸟」当快递公司
  if (
    result.courierCompany === '菜鸟' &&
    result.stationName?.includes('菜鸟') &&
    result.trackingNumber
  ) {
    const fromTracking = inferCourierFromTracking(result.trackingNumber);
    if (fromTracking) result.courierCompany = fromTracking;
  }

  // 7. 状态：有取件码默认待取
  const status: PackageStatus | undefined = inferStatus(text);
  result.status = status ?? (result.pickupCode ? 'PENDING_PICKUP' : undefined);

  // 8. 置信度（0~1）：取件码与驿站最关键，公司/单号只是加分项
  let score = 0;
  if (result.pickupCode) score += 0.4;
  if (result.stationName) score += 0.25;
  if (result.status) score += 0.15;
  if (result.trackingNumber) score += 0.1;
  if (result.courierCompany) score += 0.1;
  result.confidence = Math.min(1, Math.round(score * 100) / 100);

  return result;
}
