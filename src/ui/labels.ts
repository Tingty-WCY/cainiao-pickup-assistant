import type { Platform, StationType, PackageStatus } from '@/types';

export const PLATFORM_LABELS: Record<Platform, string> = {
  TAOBAO: '淘宝',
  JD: '京东',
  PDD: '拼多多',
  DOUYIN: '抖音',
  XIAOHONGSHU: '小红书',
  MEITUAN: '美团',
  XIAN_JU: '闲鱼',
  OTHER: '其他',
};

export const STATION_TYPE_LABELS: Record<StationType, string> = {
  CAINIAO: '菜鸟驿站',
  FENGCHAO: '丰巢',
  TUXI: '兔喜',
  LOCKER: '智能柜',
  JD: '京东驿站',
  ZTO: '中通驿站',
  YTO: '圆通',
  STO: '申通',
  YUNDA: '韵达',
  OTHER: '其他',
};

export const STATUS_LABELS: Record<PackageStatus, string> = {
  PENDING_PICKUP: '待取',
  SHIPPING: '运输中',
  PICKED_UP: '已取',
  EXCEPTION: '异常',
  UNKNOWN: '未知',
};

export const PLATFORM_OPTIONS = (Object.keys(PLATFORM_LABELS) as Platform[]).map((v) => ({
  value: v,
  label: PLATFORM_LABELS[v],
}));

export const STATION_TYPE_OPTIONS = (Object.keys(STATION_TYPE_LABELS) as StationType[]).map((v) => ({
  value: v,
  label: STATION_TYPE_LABELS[v],
}));

export const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as PackageStatus[]).map((v) => ({
  value: v,
  label: STATUS_LABELS[v],
}));
