import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { theme } from './theme';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** 通用底部表单弹窗（替代 react-native 原生 Modal 样板）。 */
export function FormModal({ visible, title, onClose, children }: Props) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 16,
            paddingBottom: 28,
            maxHeight: '90%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>{title}</Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: theme.sub, fontSize: 15 }}>关闭</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
