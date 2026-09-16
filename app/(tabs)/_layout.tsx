import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/ui/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** 未选中用描边图标，选中用实心图标 */
function tabIcon(outline: IconName, filled: IconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTitleStyle: { color: theme.text, fontWeight: '700' },
        headerShadowVisible: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.sub,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 58,
          paddingTop: 5,
          paddingBottom: 5,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '首页', tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="packages"
        options={{ title: '快递', tabBarIcon: tabIcon('cube-outline', 'cube') }}
      />
      <Tabs.Screen
        name="accounts"
        options={{ title: '应用', tabBarIcon: tabIcon('apps-outline', 'apps') }}
      />
      <Tabs.Screen
        name="stations"
        options={{ title: '驿站', tabBarIcon: tabIcon('location-outline', 'location') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '设置', tabBarIcon: tabIcon('settings-outline', 'settings') }}
      />
    </Tabs>
  );
}
