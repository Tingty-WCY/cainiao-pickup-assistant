import { Modal, Pressable, Text, View } from 'react-native';
import { theme } from './theme';

export interface ActionItem {
  label: string;
  onPress: () => void;
  icon?: string;
}

interface Props {
  visible: boolean;
  title?: string;
  options: ActionItem[];
  onCancel: () => void;
}

/** 轻量底部操作面板（替代 expo 的 ActionSheet，免额外依赖）。 */
export function ActionSheet({ visible, title, options, onCancel }: Props) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.bg, padding: 16, paddingBottom: 28 }}>
          {title ? (
            <Text style={{ fontSize: 13, color: theme.sub, marginBottom: 10, textAlign: 'center' }}>
              {title}
            </Text>
          ) : null}
          {options.map((o, i) => (
            <Pressable
              key={i}
              style={{
                backgroundColor: theme.card,
                borderRadius: 10,
                paddingVertical: 16,
                alignItems: 'center',
                marginBottom: 10,
              }}
              onPress={() => {
                onCancel();
                o.onPress();
              }}
            >
              <Text style={{ fontSize: 16, color: theme.text, fontWeight: '600' }}>
                {o.icon ? `${o.icon}  ` : ''}
                {o.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={{
              backgroundColor: theme.card,
              borderRadius: 10,
              paddingVertical: 16,
              alignItems: 'center',
              borderTopWidth: 1,
              borderColor: theme.border,
            }}
            onPress={onCancel}
          >
            <Text style={{ fontSize: 16, color: theme.sub }}>取消</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
