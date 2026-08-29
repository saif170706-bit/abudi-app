import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { LANGUAGES, useLanguagePreference } from '@/hooks/use-language-preference';

export function LanguageMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { language, setLanguage } = useLanguagePreference();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/10" onPress={onClose}>
        <View className="absolute right-4 top-24 min-w-[160px] gap-1 rounded-2xl border border-border bg-card p-2 shadow-lg">
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              onPress={() => {
                setLanguage(lang.code);
                onClose();
              }}
              className={`rounded-xl px-4 py-3 ${language === lang.code ? 'bg-primary/10' : ''}`}
            >
              <Text className={language === lang.code ? 'font-semibold text-primary' : 'text-card-foreground'}>
                {lang.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
