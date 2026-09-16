import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '@/state/AppContext';
import { LoadingState } from '@/ui/LoadingState';
import { theme } from '@/ui/theme';
import { listAppLinks, openPlatformApp } from '@/services/appLinks';
import type { Platform } from '@/types';

/**
 * 「应用」页 —— 第三方 App 跳转。
 *
 * 这一页原本是「账号管理」，2026-09-16 起账号功能整体移除
 * （用户反馈：手动加快递还要挑归属、识别不出就自动建「未分类」账号，纯属负担）。
 * 现在只剩跳转。
 */
export default function AppsScreen() {
  const { ready } = useApp();

  if (!ready) return <LoadingState />;

  // 唤起平台 App；没装则自动退网页版（详见 services/appLinks.ts 的说明）
  const handleOpen = async (platform: Platform, label: string) => {
    const result = await openPlatformApp(platform);
    if (result === 'failed') {
      Alert.alert('打不开', `没能唤起${label}，请确认应用或网络是否正常。`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={sectionTitle}>应用跳转</Text>
        <Text style={sectionHint}>点一下直接打开对应 App，没装会自动打开网页版</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {listAppLinks().map(({ platform, config }) => {
            const textColor = config.textColor ?? '#fff';
            return (
              <Pressable
                key={platform}
                onPress={() => handleOpen(platform, config.label)}
                style={({ pressed }) => ({
                  width: '48%',
                  height: 104,
                  marginBottom: 12,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  justifyContent: 'space-between',
                  backgroundColor: config.color,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: textColor, fontSize: 22, fontWeight: '800' }}>
                  {config.label}
                </Text>
                <Text style={{ color: textColor, fontSize: 13, fontWeight: '600', opacity: 0.85 }}>
                  打开 App ›
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const sectionTitle: Text['props']['style'] = {
  fontSize: 17,
  fontWeight: '800',
  color: '#1A1A1A',
  marginBottom: 2,
};
const sectionHint: Text['props']['style'] = {
  fontSize: 12,
  color: '#8A8A8A',
  marginBottom: 12,
};
