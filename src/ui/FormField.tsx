import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from './theme';

/** 通用表单输入项：标签 + 输入框。 */
export function FormField({ label, compact = false, ...rest }: { label: string; compact?: boolean } & TextInputProps) {
  return (
    <View style={{ marginBottom: compact ? 8 : 14 }}>
      <Text style={{ fontSize: compact ? 11 : 13, color: theme.sub, marginBottom: compact ? 3 : 6, fontWeight: '500' }}>
        {label}
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: compact ? 9 : 10,
          paddingHorizontal: compact ? 9 : 12,
          paddingVertical: compact ? 7 : 10,
          fontSize: compact ? 13 : 15,
          color: theme.text,
          backgroundColor: theme.card,
          minHeight: compact ? 40 : undefined,
        }}
        placeholderTextColor={theme.sub}
        {...rest}
      />
    </View>
  );
}
