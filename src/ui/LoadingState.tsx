import { ActivityIndicator, View } from 'react-native';
import { theme } from './theme';

export function LoadingState() {
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}
