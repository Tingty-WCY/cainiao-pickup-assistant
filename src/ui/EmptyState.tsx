import { Text, View } from 'react-native';
import { theme } from './theme';

export function EmptyState({ text }: { text: string }) {
  return (
    <View
      style={{
        paddingVertical: 48,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 40, marginBottom: 8 }}>📭</Text>
      <Text style={{ color: theme.sub, fontSize: 14 }}>{text}</Text>
    </View>
  );
}
