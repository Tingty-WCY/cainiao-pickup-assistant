import { Modal, Pressable, Text, View } from 'react-native';
import { theme } from './theme';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  danger,
}: Props) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 320,
            backgroundColor: theme.card,
            borderRadius: theme.radius,
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>{title}</Text>
          {message ? (
            <Text style={{ marginTop: 8, fontSize: 14, color: theme.sub, lineHeight: 20 }}>
              {message}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', marginTop: 20, gap: 12 }}>
            <Pressable
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
              }}
              onPress={onCancel}
            >
              <Text style={{ color: theme.text, fontWeight: '600' }}>{cancelText}</Text>
            </Pressable>
            <Pressable
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: danger ? theme.danger : theme.primary,
                alignItems: 'center',
              }}
              onPress={onConfirm}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
