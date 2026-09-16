// ============================================================================
// 数据源 Adapter 架构（对应方案 Section 8 / 42-44）
// 第一阶段实现：ManualAdapter + TextParserAdapter
// 预留：淘宝 / 京东 / 拼多多 / 抖音 / 短信 —— 仅声明接口，严守红线：
//   不破解、不绕过验证码、不窃取 Cookie、不收集电商密码、不上传用户数据。
// ============================================================================
import type { Package, Platform } from '@/types';
import { parseText } from '@/parser/engine';

export interface PackageData {
  courierCompany: string;
  trackingNumber?: string;
  pickupCode?: string;
  stationId?: string;
  status: Package['status'];
  arrivedAt?: string;
  remark?: string;
}

export interface SyncResult {
  added: number;
  updated: number;
  skipped: number;
}

export interface DataSourceAdapter {
  readonly id: string;
  readonly name: string;
  readonly supportedPlatform: Platform;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  fetchPackages?(): Promise<PackageData[]>;
  parse?(input: string): Promise<PackageData | null>;
  sync?(): Promise<SyncResult>;
}

/** 手动添加：不解析，仅作为统一入口占位。 */
export class ManualAdapter implements DataSourceAdapter {
  readonly id = 'manual';
  readonly name = '手动添加';
  readonly supportedPlatform: Platform = 'OTHER';
  async parse(): Promise<PackageData | null> {
    return null;
  }
}

/** 文本解析：复用已实现的 Parser 引擎。 */
export class TextParserAdapter implements DataSourceAdapter {
  readonly id = 'text';
  readonly name = '文本解析';
  readonly supportedPlatform: Platform = 'OTHER';
  async parse(input: string): Promise<PackageData | null> {
    const p = await parseText(input);
    if (!p.courierCompany) return null;
    return {
      courierCompany: p.courierCompany,
      trackingNumber: p.trackingNumber,
      pickupCode: p.pickupCode,
      status: p.status ?? 'UNKNOWN',
      remark: p.stationName ? `驿站: ${p.stationName}` : undefined,
    };
  }
}

// ---- 预留第三方平台 Adapter（未实现同步逻辑）----
export class TaobaoAdapter implements DataSourceAdapter {
  readonly id = 'taobao';
  readonly name = '淘宝';
  readonly supportedPlatform: Platform = 'TAOBAO';
}
export class JDAdapter implements DataSourceAdapter {
  readonly id = 'jd';
  readonly name = '京东';
  readonly supportedPlatform: Platform = 'JD';
}
export class PDDAdapter implements DataSourceAdapter {
  readonly id = 'pdd';
  readonly name = '拼多多';
  readonly supportedPlatform: Platform = 'PDD';
}
export class DouyinAdapter implements DataSourceAdapter {
  readonly id = 'douyin';
  readonly name = '抖音';
  readonly supportedPlatform: Platform = 'DOUYIN';
}
export class SMSAdapter implements DataSourceAdapter {
  readonly id = 'sms';
  readonly name = '短信';
  readonly supportedPlatform: Platform = 'OTHER';
}
