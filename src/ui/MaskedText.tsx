import { Text, type TextProps } from 'react-native';
import { useApp } from '@/state/AppContext';
import { maskPhone, maskTracking } from '@/utils';

interface Props extends TextProps {
  value: string;
  type: 'phone' | 'tracking';
}

/** 手机号/单号脱敏展示；受设置页「显示敏感信息」开关控制。 */
export function MaskedText({ value, type, style, ...rest }: Props) {
  const { showSensitive } = useApp();
  const display = showSensitive
    ? value
    : type === 'phone'
      ? maskPhone(value)
      : maskTracking(value);
  return (
    <Text style={style} {...rest}>
      {display}
    </Text>
  );
}
