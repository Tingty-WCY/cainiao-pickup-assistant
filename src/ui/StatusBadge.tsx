import { Text, View } from 'react-native';
import type { PackageStatus } from '@/types';

const MAP: Record<PackageStatus, { label: string; color: string; bg: string }> = {
  PENDING_PICKUP: { label: '待取', color: '#FF7A00', bg: '#FFF1E0' },
  SHIPPING: { label: '运输中', color: '#1E88E5', bg: '#E3F2FD' },
  PICKED_UP: { label: '已取', color: '#757575', bg: '#EEEEEE' },
  EXCEPTION: { label: '异常', color: '#E53935', bg: '#FFEBEE' },
  UNKNOWN: { label: '未知', color: '#757575', bg: '#EEEEEE' },
};

export function StatusBadge({ status }: { status: PackageStatus }) {
  const s = MAP[status] ?? MAP.UNKNOWN;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: s.bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Text style={{ color: s.color, fontSize: 12, fontWeight: '600' }}>{s.label}</Text>
    </View>
  );
}
