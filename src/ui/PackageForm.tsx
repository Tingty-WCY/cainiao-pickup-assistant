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
  compact?: boolean;
  initial?: Package;
  onClose: () => void;
  onSubmit: (values: PackageFormValues) => Promise<void> | void;
}

export function PackageForm({ visible, title, submitLabel, initial, onClose, onSubmit, compact = false }: Props) {
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

  const saveButton = (
    <Pressable style={[saveBtn, busy && { opacity: 0.6 }, compact && compactSaveBtn]} onPress={submit} disabled={busy}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: compact ? 15 : 14 }}>{busy ? '保存中…' : submitLabel}</Text>
    </Pressable>
  );

  return (
    <FormModal
      visible={visible}
      title={title}
      onClose={onClose}
      compact={compact}
      footer={compact ? (
        <View style={{ paddingTop: 7, backgroundColor: theme.card }}>
          {error ? <Text style={{ color: theme.danger, fontSize: 12, marginBottom: 6 }}>{error}</Text> : null}
          {saveButton}
        </View>
      ) : undefined}
    >
      {compact ? (
        <View style={{ gap: 1 }}>
          <View style={compactRow}>
            <View style={compactCell}><FormField compact label="快递公司" value={courier} onChangeText={setCourier} placeholder="未知" /></View>
            <View style={compactCell}><FormField compact label="取件码" value={code} onChangeText={setCode} placeholder="如 528 / A238" /></View>
          </View>
          <View style={compactRow}>
            <View style={compactCell}><FormField compact label="快递单号" value={tracking} onChangeText={setTracking} placeholder="可选" /></View>
            <View style={compactCell}><FormField compact label="快递尾号" value={tail} onChangeText={setTail} placeholder="如 5624" /></View>
          </View>
          <View style={compactRow}>
            <View style={compactCell}><FormField compact label="柜号 / 格口" value={box} onChangeText={setBox} placeholder="如 B-15" /></View>
            <View style={compactCell}><FormField compact label="备注" value={remark} onChangeText={setRemark} placeholder="可选" /></View>
          </View>
          <View style={compactRow}>
            <Pressable style={compactSelect} onPress={() => setPicker('station')}>
              <Text style={compactSelectLabel}>驿站</Text>
              <Text style={compactSelectValue} numberOfLines={1}>{station ? station.name : '不指定'}</Text>
            </Pressable>
            <Pressable style={compactSelect} onPress={() => setPicker('status')}>
              <Text style={compactSelectLabel}>状态</Text>
              <Text style={compactSelectValue}>{STATUS_LABELS[status]}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <FormField label="快递公司（可留空）" value={courier} onChangeText={setCourier} placeholder="留空自动填「未知」" />
          <FormField label="快递单号（可选）" value={tracking} onChangeText={setTracking} placeholder="单号" />
          <FormField label="取件码（可选）" value={code} onChangeText={setCode} placeholder="如 528 / A238" />
          <FormField label="快递尾号（可选）" value={tail} onChangeText={setTail} placeholder="如 5624，出库要报尾号时填" />
          <FormField label="柜号/格口（可选）" value={box} onChangeText={setBox} placeholder="如 B-15，外卖柜/智能柜填" />
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
          {saveButton}
        </>
      )}

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
const compactRow: View['props']['style'] = { flexDirection: 'row', gap: 10 };
const compactCell: View['props']['style'] = { flex: 1, minWidth: 0 };
const compactSelect: View['props']['style'] = {
  flex: 1,
  minWidth: 0,
  minHeight: 52,
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 9,
  paddingHorizontal: 10,
  paddingVertical: 6,
  marginBottom: 8,
  justifyContent: 'center',
};
const compactSelectLabel: Text['props']['style'] = { fontSize: 10, color: theme.sub, marginBottom: 2 };
const compactSelectValue: Text['props']['style'] = { fontSize: 13, color: theme.text, fontWeight: '700' };
const compactSaveBtn: View['props']['style'] = { minHeight: 46, marginTop: 0, paddingVertical: 11 };
