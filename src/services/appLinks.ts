// ============================================================================
// 第三方 App 跳转（URL Scheme）
//
// 设计要点（踩坑结论，改动前请先读）：
// 1. **不做 canOpenURL 安装检测**。iOS 的 canOpenURL 要求 Info.plist 里声明
//    LSApplicationQueriesSchemes，Android 11+ 要求 manifest 里的 <queries>；
//    Expo Go 两者都改不了，检测会永远返回 false，反而误判成「未安装」。
//    而 openURL 本身不受这两份白名单限制 —— 所以直接 try openURL 才可靠。
// 2. **必须带网页降级**。没装 App / 系统拒绝 scheme 时 openURL 会 reject，
//    此时退回网页版，保证按钮不会变成死链。
// 3. **schemes 是数组，按顺序试**。同一平台常有多种 scheme 写法（尤以拼多多
//    为甚），单写一个容易在某台机器上失效。
// 4. **能落到哪一页，取决于那一页有没有公开的路由名**。淘宝首页有（tbhome），
//    所以能明确指定；而个人资产页（我的快递 / 待取件 / 驿站）没有任何公开路由，
//    无法直达。只写裸 scheme（taobao://）时由 App 自己决定落点，通常不是首页。
// ============================================================================

import { Linking } from 'react-native';
import type { Platform } from '@/types';

export interface AppLinkConfig {
  /** 平台中文名 */
  label: string;
  /** 依次尝试的 URL Scheme（前一个唤起失败就换下一个） */
  schemes: string[];
  /** 全部 scheme 都失败时的网页降级地址 */
  webUrl: string;
  /** 品牌色，用于跳转大按钮 */
  color: string;
  /** 按钮文字色，默认白色（闲鱼是黄底，需要深色字） */
  textColor?: string;
}

/** 已配置跳转的平台；不在此表中的平台不展示跳转按钮 */
export const APP_LINKS: Partial<Record<Platform, AppLinkConfig>> = {
  TAOBAO: {
    label: '淘宝',
    // `taobao://m.taobao.com` 是淘系官方文档里的标准唤端写法（协议形如 [scheme]://[host][path]）。
    // ⚠️ 别加多余 path：曾用 `taobao://m.taobao.com/tbhome/entry`，结果淘宝把它当成一个 H5
    // 地址在自己 WebView 里打开了 —— 看到的是网页版（那正是「宣传页」的来源），不是 App 首页。
    // 裸 `taobao://` 只作兜底：它会让淘宝恢复到「上次停留的页面」，不保证是首页。
    schemes: ['taobao://m.taobao.com', 'taobao://'],
    webUrl: 'https://m.taobao.com/',
    color: '#FF5000',
  },
  PDD: {
    label: '拼多多',
    schemes: ['pinduoduo://', 'pinduoduo://com.xunmeng.pinduoduo/', 'pdd://'],
    webUrl: 'https://mobile.yangkeduo.com/',
    color: '#E02E24',
  },
  JD: {
    label: '京东',
    schemes: ['openApp.jdMobile://', 'jdmobile://'],
    webUrl: 'https://m.jd.com/',
    color: '#E1251B',
  },
  DOUYIN: {
    label: '抖音',
    schemes: ['snssdk1128://'],
    webUrl: 'https://www.douyin.com/',
    color: '#161823',
  },
  XIAOHONGSHU: {
    label: '小红书',
    // ⚠️ iOS 是 xhsdiscover，Android 是 xhsdiscovery（差一个 y），别写错。
    // 带 `/home` 路径最稳（实测清单里「首页」用的就是它）；裸协议与官方基础协议作兜底。
    // 之前配的 `xhs://` 是错的 —— 小红书没注册这个 protocol，必然失败。
    schemes: ['xhsdiscover://home', 'xhsdiscovery://', 'xiaohongshu://', 'xhsdiscover://'],
    webUrl: 'https://www.xiaohongshu.com/',
    color: '#FF2442',
  },
  XIAN_JU: {
    label: '闲鱼',
    schemes: ['fleamarket://', 'goofish://'],
    webUrl: 'https://www.goofish.com/',
    // 闲鱼是黄底黑字，白字会看不清
    color: '#FFE60F',
    textColor: '#161823',
  },
};

/** 跳转页展示顺序 */
export const APP_LINK_ORDER: Platform[] = [
  'TAOBAO',
  'PDD',
  'JD',
  'DOUYIN',
  'XIAOHONGSHU',
  'XIAN_JU',
];

/** 按展示顺序返回已配置跳转的平台列表 */
export function listAppLinks(): { platform: Platform; config: AppLinkConfig }[] {
  return APP_LINK_ORDER.flatMap((platform) => {
    const config = APP_LINKS[platform];
    return config ? [{ platform, config }] : [];
  });
}

export type OpenAppResult = 'app' | 'web' | 'failed';

/** 该平台是否配置了跳转 */
export function hasAppLink(platform: Platform): boolean {
  return APP_LINKS[platform] !== undefined;
}

/** 试一个 URL 能否被系统打开（resolve 即视为成功） */
async function tryOpen(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 尝试唤起平台 App；未安装则降级到网页版。
 * 返回 'app' | 'web' 表示成功，'failed' 表示两条路都走不通。
 */
export async function openPlatformApp(platform: Platform): Promise<OpenAppResult> {
  const config = APP_LINKS[platform];
  if (!config) return 'failed';

  for (const scheme of config.schemes) {
    if (await tryOpen(scheme)) return 'app';
  }
  return (await tryOpen(config.webUrl)) ? 'web' : 'failed';
}
