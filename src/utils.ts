export function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 中国大陆手机号校验 */
export function isValidCNPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 手机号脱敏：13812341234 → 138****1234
 * 不符合格式时原样返回（避免破坏非标准输入）。
 */
export function maskPhone(phone: string): string {
  if (!isValidCNPhone(phone)) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(7);
}

/**
 * 快递单号脱敏：保留前 4 后 4，中间星号。
 * 长度不足 8 时只显示前后各 2 位。
 */
export function maskTracking(tracking: string): string {
  if (tracking.length <= 8) {
    if (tracking.length <= 4) return tracking;
    return tracking.slice(0, 2) + '****' + tracking.slice(-2);
  }
  return tracking.slice(0, 4) + '********' + tracking.slice(-4);
}

/** ISO 时间 → 本地可读短格式（如 09-14 10:32）。 */
export function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
