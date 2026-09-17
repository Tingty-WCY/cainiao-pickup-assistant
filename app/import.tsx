import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '@/state/AppContext';
import { useStations } from '@/state/useStations';
import { usePackages } from '@/state/usePackages';
import { createParserService } from '@/services/parser';
import { resolveFixedStationId } from '@/services/stationMatch';
import { ActionSheet } from '@/ui/ActionSheet';
import { LoadingState } from '@/ui/LoadingState';
import { theme } from '@/ui/theme';
import { STATUS_LABELS, STATUS_OPTIONS } from '@/ui/labels';
import { nowISO } from '@/utils';
import type { CreatePackageInput, DataSource, PackageStatus, ParsedPackage } from '@/types';

function confidenceColor(c: number): string {
  if (c >= 0.9) return theme.success;
  if (c >= 0.7) return theme.primary;
  return theme.danger;
}
function confidenceText(c: number): string {
  if (c >= 0.9) return '高';
  if (c >= 0.7) return '中';
  return '低';
}
export default function ImportScreen() {
  const { ready } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams();
  /** ?auto=1：进入即读剪贴板并自动识别（iPhone 主力路径） */
  const autoImport = params.auto === '1';
  const { list: stations } = useStations();
  const { create, checkDuplicate } = usePackages();

  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedPackage | null>(null);
  const [courier, setCourier] = useState('');
  const [code, setCode] = useState('');
  /** 快递尾号：不少驿站出库时要求与取件码一起出示 */
  const [tail, setTail] = useState('');
  /** 柜号/格口：外卖柜、智能柜取件要先找格子 */
  const [box, setBox] = useState('');
  const [status, setStatus] = useState<PackageStatus>('PENDING_PICKUP');
  const [stationId, setStationId] = useState('');
  const [picker, setPicker] = useState<null | 'station' | 'status'>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // 一键导入：进页面就读剪贴板 → 自动识别，用户只需核对取件码后保存
  const autoDone = useRef(false);
  useEffect(() => {
    if (!ready || !autoImport || autoDone.current) return;
    autoDone.current = true;
    void (async () => {
      try {
        const clip = await Clipboard.getStringAsync();
        if (!clip || !clip.trim()) {
          setError('剪贴板是空的：先去短信里复制整条取件短信，再回来点首页的「一键导入」');
          return;
        }
        setText(clip);
        await parseWith(clip);
      } catch {
        setError('读取剪贴板失败，请手动粘贴');
      }
    })();
  }, [ready, autoImport]);

  if (!ready) return <LoadingState />;

  const doParse = async () => {
    setError('');
    if (!text.trim()) {
      setError('请先粘贴物流信息');
      return;
    }
    await parseWith(text);
  };

  /** 解析指定文本并回填所有字段（doParse 与剪贴板一键导入共用） */
  const parseWith = async (raw: string) => {
    setError('');
    const r = await createParserService().parseText(raw);
    setParsed(r);
    setCourier(r.courierCompany ?? '');
    setCode(r.pickupCode ?? '');
    setTail(r.tailNumber ?? '');
    setBox(r.boxNo ?? '');
    if (r.status) setStatus(r.status);

    // 驿站：一律归到 6 个预置驿站之一（驿站名 → 短信签名 → 快递公司，认不出一律归「菜鸟」）。
    // 不再按短信里的驿站名自动建档 —— 那正是驿站表爆炸的原因。
    setStationId(resolveFixedStationId(r.stationName, r.courierCompany, r.senderTag));
  };

  const station = stations.find((s) => s.id === stationId);

  const confirm = async () => {
    setError('');
    if (!code.trim() && !parsed?.trackingNumber) {
      setError('没识别出取件码，请手动填写后再添加');
      return;
    }
    setBusy(true);
    try {
      // 驿站：正常已由 parseWith 归好；兜底再解析一次
      const finalStationId =
        stationId ||
        resolveFixedStationId(parsed?.stationName, parsed?.courierCompany, parsed?.senderTag);
      const input: CreatePackageInput = {
        stationId: finalStationId || undefined,
        source: 'TEXT' as DataSource,
        courierCompany: courier.trim() || '未知',
        pickupCode: code.trim() || undefined,
        tailNumber: tail.trim() || undefined,
        boxNo: box.trim() || undefined,
        trackingNumber: parsed?.trackingNumber,
        status,
        arrivedAt: status === 'PENDING_PICKUP' ? nowISO() : undefined,
        remark: text.trim().slice(0, 60),
      };
      const dup = await checkDuplicate(input);
      if (dup.duplicate) {
        setError('该快递已存在，可能重复添加');
        return;
      }
      await create(input);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          paddingTop: 24,
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>导入物流信息</Text>
          {autoImport ? (
            <Text style={{ fontSize: 11, color: theme.sub, marginTop: 2 }}>
              已自动读取剪贴板，核对取件码后保存
            </Text>
          ) : null}
        </View>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: theme.sub, fontSize: 15 }}>取消</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="粘贴淘宝 / 京东 / 拼多多 / 短信 物流信息"
          placeholderTextColor={theme.sub}
          multiline
          numberOfLines={4}
          style={{
            backgroundColor: theme.card,
            borderRadius: theme.radius,
            padding: 12,
            fontSize: 14,
            color: theme.text,
            minHeight: 110,
            textAlignVertical: 'top',
            borderWidth: 1,
            borderColor: theme.border,
          }}
        />
        <View style={{ flexDirection: 'row', marginTop: 12, gap: 10 }}>
          <Pressable
            style={[parseBtn, { flex: 1, marginTop: 0, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.primary }]}
            onPress={async () => {
              const clip = await Clipboard.getStringAsync();
              if (!clip || !clip.trim()) {
                setError('剪贴板是空的：先去短信里复制整条取件短信');
                return;
              }
              setText(clip);
              await parseWith(clip);
            }}
          >
            <Text style={{ color: theme.primary, fontWeight: '700' }}>📋 读剪贴板</Text>
          </Pressable>
          <Pressable style={[parseBtn, { flex: 1, marginTop: 0 }]} onPress={doParse}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>开始识别</Text>
          </Pressable>
        </View>

        {error ? <Text style={{ color: theme.danger, fontSize: 13, marginTop: 12 }}>{error}</Text> : null}

        {parsed ? (
          <View style={{ marginTop: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>识别结果</Text>
              <Text style={{ fontSize: 13, color: confidenceColor(parsed.confidence) }}>
                置信度 {confidenceText(parsed.confidence)}（{Math.round(parsed.confidence * 100)}%）
              </Text>
            </View>

            {/* 取件码优先展示：这是用户最需要的信息 */}
            {code ? (
              <View
                style={{
                  backgroundColor: theme.primarySoft,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 12, color: theme.sub }}>取件码</Text>
                <Text style={{ fontSize: 30, fontWeight: '800', color: theme.primary, letterSpacing: 2 }}>
                  {code}
                </Text>
              </View>
            ) : null}

            {parsed.confidence < 0.7 ? (
              <View
                style={{
                  backgroundColor: theme.primarySoft,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 13, color: theme.primary }}>
                  部分信息无法确认，取件码可直接修改，其余会自动兜底（公司填「未知」、账号归「未分类」、驿站自动建档）。
                </Text>
              </View>
            ) : null}

            <Field label="快递公司（可留空）">
              <TextInput
                style={editInput}
                value={courier}
                onChangeText={setCourier}
                placeholder="识别不出就留空，自动填「未知」"
                placeholderTextColor={theme.sub}
              />
            </Field>
            <Field label="取件码">
              <TextInput style={editInput} value={code} onChangeText={setCode} placeholder="取件码" />
            </Field>
            <Field label="快递尾号（可选）">
              <TextInput
                style={editInput}
                value={tail}
                onChangeText={setTail}
                placeholder="如 5624，出库要报尾号时填"
                placeholderTextColor={theme.sub}
              />
            </Field>
            <Field label="柜号/格口（可选）">
              <TextInput
                style={editInput}
                value={box}
                onChangeText={setBox}
                placeholder="如 B-15，外卖柜/智能柜填"
                placeholderTextColor={theme.sub}
              />
            </Field>

            <Pressable style={selectRow} onPress={() => setPicker('status')}>
              <Text style={selectLabel}>状态</Text>
              <Text style={selectValue}>{STATUS_LABELS[status]}</Text>
            </Pressable>
            <Pressable style={selectRow} onPress={() => setPicker('station')}>
              <Text style={selectLabel}>驿站</Text>
              <Text style={selectValue}>{station ? station.name : '未识别'}</Text>
            </Pressable>

            <Pressable style={[saveBtn, busy && { opacity: 0.6 }]} onPress={confirm} disabled={busy}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>确认添加</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <ActionSheet
        visible={picker === 'station'}
        title="选择驿站"
        options={[
          { label: '不指定驿站', onPress: () => setStationId('') },
          ...stations.map((s) => ({
            label: s.name,
            onPress: () => {
              setStationId(s.id);
            },
          })),
        ]}
        onCancel={() => setPicker(null)}
      />
      <ActionSheet
        visible={picker === 'status'}
        title="选择状态"
        options={STATUS_OPTIONS.map((o) => ({ label: o.label, onPress: () => setStatus(o.value) }))}
        onCancel={() => setPicker(null)}
      />
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 13, color: theme.sub, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

const parseBtn: View['props']['style'] = {
  backgroundColor: '#FF7A00',
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
  marginTop: 12,
};
const editInput: Text['props']['style'] = {
  backgroundColor: '#fff',
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 15,
  color: '#1A1A1A',
  borderWidth: 1,
  borderColor: '#E6E8EB',
};
const selectRow: View['props']['style'] = { marginBottom: 14 };
const selectLabel: Text['props']['style'] = { fontSize: 13, color: '#8A8A8A', marginBottom: 6 };
const selectValue: Text['props']['style'] = { fontSize: 15, color: '#1A1A1A' };
const saveBtn: View['props']['style'] = {
  backgroundColor: '#FF7A00',
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
  marginTop: 8,
};
