import React, { useRef, useState } from 'react';
import { View, Text, Pressable, Platform, TextInput } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { useLanguagePreference } from '@/context/language-context';

const COLOR_SWATCHES = ['#111827', '#dc2626', '#2563eb', '#197670', '#b8860b'];

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 140,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const { tGlobal } = useLanguagePreference();
  const richText = useRef<RichEditor>(null);
  const [showColors, setShowColors] = useState(false);

  // react-native-webview (and therefore the rich editor) has no web implementation —
  // fall back to a plain text input when previewing in a browser. Full formatting
  // works on iOS/Android, the actual shipping targets.
  if (Platform.OS === 'web') {
    return (
      <View className="overflow-hidden rounded-2xl border border-border bg-card">
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          multiline
          style={{ minHeight, padding: 12, textAlignVertical: 'top' }}
        />
        <Text className="border-t border-border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {tGlobal('Formatering (fed/kursiv/farve) er kun tilgængelig i appen')}
        </Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      <View className="flex-row items-center border-b border-border">
        <RichToolbar
          editor={richText}
          actions={[actions.setBold, actions.setItalic, actions.removeFormat]}
          selectedIconTint="#197670"
          style={{ backgroundColor: 'transparent', flex: 1 }}
        />
        {/* foreColor has no built-in picker in this library — a custom swatch button instead. */}
        <Pressable onPress={() => setShowColors((v) => !v)} className="px-3">
          <Text style={{ fontSize: 18 }}>🎨</Text>
        </Pressable>
      </View>

      {showColors && (
        <View className="flex-row gap-2 border-b border-border px-3 py-2">
          {COLOR_SWATCHES.map((c) => (
            <Pressable
              key={c}
              onPress={() => {
                richText.current?.setForeColor(c);
                setShowColors(false);
              }}
              style={{ backgroundColor: c }}
              className="h-7 w-7 rounded-full border border-border"
            />
          ))}
        </View>
      )}

      <RichEditor
        ref={richText}
        initialContentHTML={value}
        onChange={onChange}
        placeholder={placeholder}
        initialHeight={minHeight}
        style={{ minHeight }}
      />
      <Text className="border-t border-border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {tGlobal('Marker tekst for at formatere')}
      </Text>
    </View>
  );
}
