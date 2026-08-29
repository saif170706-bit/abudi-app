import React from 'react';
import { View } from 'react-native';
import { Button } from './button';

interface ChipPickerProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function ChipPicker<T extends string>({ options, value, onChange }: ChipPickerProps<T>) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'primary' : 'outline'}
          onPress={() => onChange(opt.value)}
          className="px-4 py-2"
        >
          {opt.label}
        </Button>
      ))}
    </View>
  );
}
