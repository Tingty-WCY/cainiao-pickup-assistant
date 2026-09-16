import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from './theme';

/** 通用表单输入项：标签 + 输入框。 */
export function FormField({ label, ...rest }: { label: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, color: theme.sub, marginBottom: 6, fontWeight: '500' }}>
        {label}
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 15,
          color: theme.text,
          backgroundColor: theme.card,
        }}
        placeholderTextColor={theme.sub}
        {...rest}
      />
    </View>
  );
}
