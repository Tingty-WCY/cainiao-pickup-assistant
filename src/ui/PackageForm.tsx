import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useStations } from '@/state/useStations';
import { FormModal } from './FormModal';
import { FormField } from './FormField';
import { ActionSheet } from './ActionSheet';
import { theme } from './theme';
import { STATUS_LABELS, STATUS_OPTIONS } from './labels';
import { nowISO } from '@/utils';
import type { Package, PackageStatus } from '@/types';

export interface PackageFormValues {
  stationId?: string;
  courierCompany: string;
  trackingNumber?: string;
  pickupCode?: string;
  /** 快递尾号：出库时常与取件码一起出示 */
  tailNumber?: string;
  /** 柜号/格口：外卖柜、智能柜取件用 */
  boxNo?: string;
  status: PackageStatus;
  arrivedAt?: string;
  remark?: string;
}

interface Props {
  visible: boolean;
  title: string;
  submitLabel: string;
  initial?: Package;
  onClose: () => void;
  onSubmit: (values: PackageFormValues) => Promise<void> | void;
}

export function PackageForm({ visible, title, submitLabel, initial, onClose, onSubmit }: Props) {
  const { list: stations } = useStations();
  const [stationId, setStationId] = useState(initial?.stationId ?? '');
  const [courier, setCourier] = useState(initial?.courierCompany ?? '');
  const [tracking, setTracking] = useState(initial?.trackingNumber ?? '');
  const [code, setCode] = useState(initial?.pickupCode ?? '');
  const [tail, setTail] = useState(initial?.tailNumber ?? '');
  const [box, setBox] = useState(initial?.boxNo ?? '');
  const [status, setStatus] = useState<PackageStatus>(initial?.status ?? 'PENDING_PICKUP');
  const [remark, setRemark] = useState(initial?.remark ?? '');
  const [picker, setPicker] = useState<null | 'station' | 'status'>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const station = stations.find((s) => s.id === stationId);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        stationId: stationId || undefined,
        courierCompany: courier.trim() || '未知',
        trackingNumber: tracking.trim() || undefined,
        pickupCode: code.trim() || undefined,
        tailNumber: tail.trim() || undefined,
        boxNo: box.trim() || undefined,
        status,
        arrivedAt:
          status === 'PENDING_PICKUP' ? initial?.arrivedAt ?? nowISO() : initial?.arrivedAt,
        remark: remark.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal visible={visible} title={title} onClose={onClose}>
      <FormField
        label="快递公司（可留空）"
        value={courier}
        onChangeText={setCourier}
        placeholder="留空自动填「未知」"
      />
      <FormField label="快递单号（可选）" value={tracking} onChangeText={setTracking} placeholder="单号" />
      <FormField label="取件码（可选）" value={code} onChangeText={setCode} placeholder="如 528 / A238" />
      <FormField
        label="快递尾号（可选）"
        value={tail}
        onChangeText={setTail}
        placeholder="如 5624，出库要报尾号时填"
      />
      <FormField
        label="柜号/格口（可选）"
        value={box}
        onChangeText={setBox}
        placeholder="如 B-15，外卖柜/智能柜填"
      />
      <FormField label="备注（可选）" value={remark} onChangeText={setRemark} placeholder="备注" />

      <Pressable style={selectRow} onPress={() => setPicker('station')}>
        <Text style={selectLabel}>驿站（可选）</Text>
        <Text style={selectValue}>{station ? station.name : '请选择'}</Text>
      </Pressable>
      <Pressable style={selectRow} onPress={() => setPicker('status')}>
        <Text style={selectLabel}>状态</Text>
        <Text style={selectValue}>{STATUS_LABELS[status]}</Text>
      </Pressable>

      {error ? <Text style={{ color: theme.danger, fontSize: 13, marginBottom: 8 }}>{error}</Text> : null}
      <Pressable style={[saveBtn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>{submitLabel}</Text>
      </Pressable>

      <ActionSheet
        visible={picker === 'station'}
        title="选择驿站"
        options={[
          { label: '不指定驿站', onPress: () => setStationId('') },
          ...stations.map((s) => ({ label: s.name, onPress: () => setStationId(s.id) })),
        ]}
        onCancel={() => setPicker(null)}
      />
      <ActionSheet
        visible={picker === 'status'}
        title="选择状态"
        options={STATUS_OPTIONS.map((o) => ({ label: o.label, onPress: () => setStatus(o.value) }))}
        onCancel={() => setPicker(null)}
      />
    </FormModal>
  );
}

const selectRow: View['props']['style'] = {
  marginBottom: 14,
};
const selectLabel: Text['props']['style'] = { fontSize: 13, color: '#8A8A8A', marginBottom: 6 };
const selectValue: Text['props']['style'] = { fontSize: 15, color: '#1A1A1A' };
const saveBtn: View['props']['style'] = {
  backgroundColor: '#FF7A00',
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
  marginTop: 4,
};
