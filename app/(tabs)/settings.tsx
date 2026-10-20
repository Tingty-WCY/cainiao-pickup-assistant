import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useApp } from '@/state/AppContext';
import { useStations } from '@/state/useStations';
import { usePackages } from '@/state/usePackages';
import { loadDemoData } from '@/db/demoData';
import { FormModal } from '@/ui/FormModal';
import { LoadingState } from '@/ui/LoadingState';
import { theme } from '@/ui/theme';
import { nowISO } from '@/utils';
import type { CreatePackageInput, Package, Station } from '@/types';

/** 导出/导入的数据包。老版本 JSON 里还有 accounts 字段，导入时直接忽略（向后兼容）。 */
interface Dump {
  stations: Station[];
  packages: Package[];
  exportedAt: string;
}

function parseDump(raw: string): Dump {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('JSON 内容不是有效的数据对象');
  const candidate = value as Partial<Dump>;
  if (!Array.isArray(candidate.stations) || !Array.isArray(candidate.packages)) {
    throw new Error('未找到 stations 或 packages 数组，请选择应用导出的 JSON 文件');
  }
  if (!candidate.stations.every((s) => s && typeof s.id === 'string' && typeof s.name === 'string')) {
    throw new Error('驿站数据格式不完整');
  }
  if (!candidate.packages.every((p) => p && typeof p.id === 'string' && typeof p.courierCompany === 'string' && typeof p.status === 'string')) {
    throw new Error('快递数据格式不完整');
  }
  return candidate as Dump;
}

function duplicateKey(pkg: Pick<Package, 'id' | 'stationId' | 'courierCompany' | 'trackingNumber' | 'pickupCode'>): string {
  if (pkg.trackingNumber?.trim()) return `tracking:${pkg.trackingNumber.trim().toLowerCase()}`;
  if (!pkg.pickupCode?.trim()) return `id:${pkg.id}`;
  return `code:${pkg.stationId ?? ''}:${pkg.courierCompany.trim().toLowerCase()}:${pkg.pickupCode?.trim().toLowerCase() ?? ''}`;
}

export default function SettingsScreen() {
  const { ready, showSensitive, setShowSensitive, db, requestRefresh } = useApp();
  const { list: stations, create: createStation } = useStations();
  const { list: packages } = usePackages();
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

  const previewImport = (dump: Dump) => {
    const existingStations = new Set(stations.map((s) => s.name.trim().toLowerCase()));
    const newStations = dump.stations.filter((s) => !existingStations.has(s.name.trim().toLowerCase())).length;
    const keys = new Set(packages.map(duplicateKey));
    let duplicates = 0;
    for (const pkg of dump.packages) {
      const oldStationName = dump.stations.find((s) => s.id === pkg.stationId)?.name.trim().toLowerCase() ?? '';
      const mappedStation = stations.find((s) => s.name.trim().toLowerCase() === oldStationName);
      const key = duplicateKey({ ...pkg, stationId: mappedStation?.id ?? pkg.stationId });
      if (keys.has(key)) duplicates += 1;
      else keys.add(key);
    }
    const importCount = dump.packages.length - duplicates;
    Alert.alert(
      '确认导入历史快递',
      `文件包含 ${dump.packages.length} 条快递、${dump.stations.length} 个驿站。\n预计新增 ${importCount} 条快递，跳过 ${duplicates} 条重复记录，新增 ${newStations} 个驿站。\n原到站和取件时间将保留。`,
      [
        { text: '取消', style: 'cancel' },
        { text: '开始导入', onPress: () => void importData(dump) },
      ],
    );
  };

  const pickImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'public.json'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.name.toLowerCase().endsWith('.json')) throw new Error('请选择 .json 文件');
      const raw = await FileSystem.readAsStringAsync(asset.uri);
      previewImport(parseDump(raw));
    } catch (e) {
      Alert.alert('读取失败', e instanceof Error ? e.message : '无法读取 JSON 文件');
    }
  };

  const importData = async (dump: Dump) => {
    try {
      if (!db) throw new Error('本地数据库尚未准备好');
      setBusy(true);
      const stMap = new Map<string, string>();
      const knownStations = [...stations];
      for (const s of dump.stations) {
        const matched = knownStations.find((existing) => existing.id === s.id)
          ?? knownStations.find((existing) => existing.name.trim().toLowerCase() === s.name.trim().toLowerCase());
        if (matched) {
          stMap.set(s.id, matched.id);
        } else {
          const created = await createStation({ name: s.name, type: s.type, address: s.address, phone: s.phone });
          stMap.set(s.id, created.id);
          knownStations.push(created);
        }
      }
      const knownKeys = new Set(packages.map(duplicateKey));
      let imported = 0;
      let skipped = 0;
      for (const p of dump.packages) {
        const stationId = p.stationId ? stMap.get(p.stationId) : undefined;
        const key = duplicateKey({ ...p, stationId });
        if (knownKeys.has(key)) {
          skipped += 1;
          continue;
        }
        const input: CreatePackageInput = {
          stationId,
          source: p.source,
          courierCompany: p.courierCompany,
          trackingNumber: p.trackingNumber,
          pickupCode: p.pickupCode,
          tailNumber: p.tailNumber,
          boxNo: p.boxNo,
          status: p.status,
          arrivedAt: p.arrivedAt,
          remark: p.remark,
        };
        const created = await db.createPackage(input);
        if (p.pickedUpAt) {
          await db.updatePackage(created.id, { pickedUpAt: p.pickedUpAt });
        }
        knownKeys.add(key);
        imported += 1;
      }
      requestRefresh();
      setImportOpen(false);
      setImportText('');
      Alert.alert('导入完成', `新增 ${imported} 条快递，跳过 ${skipped} 条重复记录。`);
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
          <Pressable style={rowPress} onPress={() => void pickImportFile()} disabled={busy}>
            <Text style={rowTitle}>选择 JSON 文件导入历史快递</Text>
          </Pressable>
          <Pressable style={rowPress} onPress={() => setImportOpen(true)} disabled={busy}>
            <Text style={rowTitle}>粘贴 JSON（兼容旧方式）</Text>
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
          粘贴此前导出的 JSON 内容。系统会匹配同名驿站、跳过已存在快递，并保留到站和取件时间。
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
        <Pressable style={saveBtn} onPress={() => {
          try { previewImport(parseDump(importText)); } catch (e) { Alert.alert('导入失败', e instanceof Error ? e.message : 'JSON 格式错误'); }
        }} disabled={busy || !importText.trim()}>
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
