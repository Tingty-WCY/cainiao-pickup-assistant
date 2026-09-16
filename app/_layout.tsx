import { Stack } from 'expo-router';
import { AppProvider } from '@/state/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add" options={{ presentation: 'modal', title: '添加快递' }} />
        <Stack.Screen name="edit" options={{ presentation: 'modal', title: '编辑快递' }} />
        <Stack.Screen name="import" options={{ presentation: 'modal', title: '导入物流信息' }} />
      </Stack>
    </AppProvider>
  );
}
