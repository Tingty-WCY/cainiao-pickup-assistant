import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useApp } from '@/state/AppContext';
import { useStations } from '@/state/useStations';
import { usePackages } from '@/state/usePackages';
import { loadDemoData } from '@/db/demoData';
import { FormModal } from '@/ui/FormModal';
import { LoadingState } from '@/ui/LoadingState';
import { theme } from '@/ui/theme';
import { nowISO } from '@/utils';
import type { Package, Station } from '@/types';

/** 导出/导入的数据包。老版本 JSON 里还有 accounts 字段，导入时直接忽略（向后兼容）。 */
interface Dump {
  stations: Station[];
  packages: Package[];
  exportedAt: string;
}

export default function SettingsScreen() {
  const { ready, showSensitive, setShowSensitive, db, requestRefresh } = useApp();
  const { list: stations, create: createStation } = useStations();
  const { list: packages, create: createPackage } = usePackages();
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  if (!ready) return <LoadingState />;

  const loadDemo = async () => {
    if (!db) return;
    try {
      setBusy(true);
      const res = await loadDemoData(db);
      requestRefresh();
      if (res.loaded && res.counts) {
        Alert.alert(
          '演示数据已载入',
          `已添加 ${res.counts.packages} 条演示快递（挂在预置驿站上）。可用于验证全部页面。`,
        );
      } else {
        Alert.alert('演示数据已存在', '演示数据此前已载入，无需重复添加。');
      }
    } catch (e) {
      Alert.alert('载入失败', e instanceof Error ? e.message : '未知错误');
    } finally {
      setBusy(false);
    }
  };

  const exportData = async () => {
    try {
      setBusy(true);
      const dump: Dump = {
        stations,
        packages,
        exportedAt: nowISO(),
      };
      const path = `${FileSystem.cacheDirectory}cainiao-export.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(dump, null, 2));
      await Sharing.shareAsync(path, {
        mimeType: 'application/json',
        dialogTitle: '导出快递数据',
      });
    } catch (e) {
      Alert.alert('导出失败', e instanceof Error ? e.message : '未知错误');
    } finally {
      setBusy(false);
    }
  };

  const importData = async () => {
    try {
      setBusy(true);
      const data = JSON.parse(importText) as Partial<Dump>;
      if (!Array.isArray(data.stations) || !Array.isArray(data.packages)) {
        throw new Error('文件格式不正确');
      }
      const stMap = new Map<string, string>();
      for (const s of data.stations) {
        const ns = await createStation({
          name: s.name,
          type: s.type,
          address: s.address,
          phone: s.phone,
        });
        stMap.set(s.id, ns.id);
      }
      for (const p of data.packages) {
        await createPackage({
          stationId: p.stationId ? stMap.get(p.stationId) : undefined,
          source: p.source,
          courierCompany: p.courierCompany,
          trackingNumber: p.trackingNumber,
          pickupCode: p.pickupCode,
          tailNumber: p.tailNumber,
          boxNo: p.boxNo,
          status: p.status,
          arrivedAt: p.arrivedAt,
          remark: p.remark,
        });
      }
      setImportOpen(false);
      setImportText('');
      Alert.alert('导入完成', '数据已恢复到本地');
    } catch (e) {
      Alert.alert('导入失败', e instanceof Error ? e.message : '未知错误');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Section title="显示设置">
          <Row
            title="默认显示敏感信息（手机号 / 单号完整展示）"
            control={
              <Switch
                value={showSensitive}
                onValueChange={setShowSensitive}
                thumbColor={showSensitive ? theme.primary : '#fff'}
                trackColor={{ false: theme.border, true: theme.primarySoft }}
              />
            }
          />
        </Section>

        <Section title="数据">
          <Pressable style={rowPress} onPress={loadDemo} disabled={busy}>
            <Text style={rowTitle}>载入演示数据（首次验证用）</Text>
          </Pressable>
          <Pressable style={rowPress} onPress={exportData} disabled={busy}>
            <Text style={rowTitle}>导出数据（JSON）</Text>
          </Pressable>
          <Pressable style={rowPress} onPress={() => setImportOpen(true)} disabled={busy}>
            <Text style={rowTitle}>导入数据（从导出 JSON 恢复）</Text>
          </Pressable>
        </Section>

        <Section title="隐私">
          <Text style={{ fontSize: 13, color: theme.sub, lineHeight: 20 }}>
            快递数据默认保存在本机 SQLite 数据库，不上传任何服务器。手机号与单号默认脱敏展示。本应用不保存任何电商平台的账号密码。
          </Text>
        </Section>

        <Section title="关于">
          <Text style={{ fontSize: 13, color: theme.sub }}>快递取件码统一管理助手 v0.1.0</Text>
          <Text style={{ fontSize: 13, color: theme.sub, marginTop: 4 }}>本地优先 · 多平台 · 多驿站</Text>
        </Section>
      </ScrollView>

      <FormModal visible={importOpen} title="导入数据" onClose={() => setImportOpen(false)}>
        <Text style={{ fontSize: 13, color: theme.sub, marginBottom: 8 }}>
          粘贴此前导出的 JSON 内容，导入将作为恢复（生成新记录，不影响现有数据）。
        </Text>
        <TextInput
          value={importText}
          onChangeText={setImportText}
          placeholder="在此粘贴 JSON"
          placeholderTextColor={theme.sub}
          multiline
          numberOfLines={6}
          style={{
            backgroundColor: theme.bg,
            borderRadius: 10,
            padding: 12,
            fontSize: 13,
            color: theme.text,
            minHeight: 140,
            textAlignVertical: 'top',
          }}
        />
        <Pressable style={saveBtn} onPress={importData} disabled={busy || !importText.trim()}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>开始导入</Text>
        </Pressable>
      </FormModal>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 13, color: theme.sub, fontWeight: '600', marginBottom: 8 }}>{title}</Text>
      <View style={{ backgroundColor: theme.card, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.border }}>
        {children}
      </View>
    </View>
  );
}

function Row({ title, control }: { title: string; control?: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 14, color: theme.text, flex: 1, flexWrap: 'wrap' }}>{title}</Text>
      {control}
    </View>
  );
}

const rowPress: View['props']['style'] = {
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderBottomWidth: 1,
  borderColor: '#E6E8EB',
};
const rowTitle: Text['props']['style'] = { fontSize: 14, color: '#1A1A1A' };
const saveBtn: View['props']['style'] = {
  backgroundColor: '#FF7A00',
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
  marginTop: 12,
};
