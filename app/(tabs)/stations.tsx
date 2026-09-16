import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/state/AppContext';
import { useStations } from '@/state/useStations';
import { usePackages } from '@/state/usePackages';
import { FormModal } from '@/ui/FormModal';
import { FormField } from '@/ui/FormField';
import { ActionSheet } from '@/ui/ActionSheet';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { LoadingState } from '@/ui/LoadingState';
import { EmptyState } from '@/ui/EmptyState';
import { theme } from '@/ui/theme';
import { STATION_TYPE_LABELS, STATION_TYPE_OPTIONS } from '@/ui/labels';
import { isFixedStation } from '@/db/seed';
import type { Station, StationType } from '@/types';

interface Draft {
  id?: string;
  name: string;
  type: StationType;
  address?: string;
  phone?: string;
}

export default function StationsScreen() {
  const { ready } = useApp();
  const router = useRouter();
  const { list, create, update, remove } = useStations();
  const { list: packages } = usePackages();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [picker, setPicker] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!ready) return <LoadingState />;

  const openEdit = (s: Station) =>
    setEditing({ id: s.id, name: s.name, type: s.type, address: s.address ?? '', phone: s.phone ?? '' });

  const pendingCount = (stationId: string) =>
    packages.filter((p) => p.stationId === stationId && p.status === 'PENDING_PICKUP').length;

  const save = async () => {
    if (!editing) return;
    setError('');
    try {
      if (editing.id) {
        await update(editing.id, {
          name: editing.name,
          type: editing.type,
          address: editing.address,
          phone: editing.phone,
        });
      } else {
        await create({ name: editing.name, type: editing.type, address: editing.address, phone: editing.phone });
      }
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {list.length === 0 ? (
          <EmptyState text="还没有驿站（预置驿站会在启动时自动写入）" />
        ) : (
          list.map((s) => (
            <View
              key={s.id}
              style={{
                backgroundColor: theme.card,
                borderRadius: theme.radius,
                padding: 14,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>{s.name}</Text>
                  {isFixedStation(s.id) ? (
                    <Text
                      style={{
                        fontSize: 11,
                        color: theme.sub,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 4,
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                      }}
                    >
                      预置
                    </Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>
                  待取 {pendingCount(s.id)} 件
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: theme.sub, marginTop: 4 }}>
                {STATION_TYPE_LABELS[s.type]}
                {s.address ? ` · ${s.address}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 10, gap: 10 }}>
                <Pressable style={btn} onPress={() => router.push(`/packages?focusStationId=${s.id}`)}>
                  <Text style={btnText}>查看快递</Text>
                </Pressable>
                <Pressable style={btn} onPress={() => openEdit(s)}>
                  <Text style={btnText}>编辑</Text>
                </Pressable>
                {isFixedStation(s.id) ? null : (
                  <Pressable style={[btn, { borderColor: theme.danger }]} onPress={() => setConfirmId(s.id)}>
                    <Text style={[btnText, { color: theme.danger }]}>删除</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <FormModal visible={!!editing} title={editing?.id ? '编辑驿站' : '添加驿站'} onClose={() => setEditing(null)}>
        {editing ? (
          <View>
            <FormField label="名称" value={editing.name} onChangeText={(t) => setEditing({ ...editing, name: t })} placeholder="XX菜鸟驿站" />
            <Pressable style={{ marginBottom: 14 }} onPress={() => setPicker(true)}>
              <Text style={{ fontSize: 13, color: theme.sub, marginBottom: 6 }}>类型</Text>
              <Text style={{ fontSize: 15, color: theme.text }}>{STATION_TYPE_LABELS[editing.type]}</Text>
            </Pressable>
            <FormField label="地址（可选）" value={editing.address ?? ''} onChangeText={(t) => setEditing({ ...editing, address: t })} placeholder="地址" />
            <FormField label="电话（可选）" value={editing.phone ?? ''} onChangeText={(t) => setEditing({ ...editing, phone: t })} placeholder="电话" keyboardType="phone-pad" />
            {error ? <Text style={{ color: theme.danger, fontSize: 13, marginBottom: 8 }}>{error}</Text> : null}
            <Pressable style={saveBtn} onPress={save}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>保存</Text>
            </Pressable>
          </View>
        ) : null}
      </FormModal>

      <ActionSheet
        visible={picker}
        title="选择类型"
        options={STATION_TYPE_OPTIONS.map((o) => ({
          label: o.label,
          onPress: () => {
            if (editing) setEditing({ ...editing, type: o.value });
          },
        }))}
        onCancel={() => setPicker(false)}
      />

      <ConfirmDialog
        visible={!!confirmId}
        title="删除驿站"
        message="删除后相关快递的驿站字段将留空，但快递记录不会丢失。确定删除？"
        confirmText="删除"
        danger
        onConfirm={async () => {
          if (confirmId) await remove(confirmId);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </View>
  );
}

const btn: View['props']['style'] = {
  flex: 1,
  paddingVertical: 9,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E6E8EB',
  alignItems: 'center',
};
const btnText: Text['props']['style'] = { color: '#1A1A1A', fontWeight: '600' };
const saveBtn: View['props']['style'] = {
  backgroundColor: '#FF7A00',
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
  marginTop: 4,
};
