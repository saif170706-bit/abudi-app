import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Input } from './input';
import type { EventFormField } from '@/shared/types';

export type FormFieldValue = string | string[];

interface EventFormFieldRendererProps {
  field: EventFormField;
  value: FormFieldValue | undefined;
  onChange: (value: FormFieldValue) => void;
}

export function EventFormFieldRenderer({ field, value, onChange }: EventFormFieldRendererProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-foreground">
        {field.label}
        {field.required ? ' *' : ''}
      </Text>

      {field.type === 'text' && (
        <Input value={(value as string) || ''} onChangeText={(text) => onChange(text)} />
      )}

      {field.type === 'radio' &&
        (field.options ?? []).map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              className={`flex-row items-center gap-3 rounded-xl border px-4 py-3 ${
                selected ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <View className={`h-4 w-4 rounded-full border-2 ${selected ? 'border-primary bg-primary' : 'border-border'}`} />
              <Text className="text-foreground">{option}</Text>
            </Pressable>
          );
        })}

      {field.type === 'checkbox' &&
        (field.options ?? []).map((option) => {
          const current = Array.isArray(value) ? value : [];
          const selected = current.includes(option);
          const toggle = () => {
            if (selected) {
              onChange(current.filter((v) => v !== option));
              return;
            }
            if (field.maxSelections && current.length >= field.maxSelections) return;
            onChange([...current, option]);
          };
          return (
            <Pressable
              key={option}
              onPress={toggle}
              className={`flex-row items-center gap-3 rounded-xl border px-4 py-3 ${
                selected ? 'border-primary bg-primary/10' : 'border-border'
              }`}
            >
              <View className={`h-4 w-4 rounded ${selected ? 'bg-primary' : 'border border-border'}`} />
              <Text className="text-foreground">{option}</Text>
            </Pressable>
          );
        })}
    </View>
  );
}

/** Checks required fields (and maxSelections where relevant) are satisfied. */
export function validateEventFormFields(
  fields: EventFormField[],
  values: Record<string, FormFieldValue | undefined>
): string | null {
  for (const field of fields) {
    if (!field.required) continue;
    const value = values[field.id];
    if (field.type === 'checkbox') {
      if (!Array.isArray(value) || value.length === 0) return `${field.label} er påkrævet.`;
    } else if (!value || (typeof value === 'string' && !value.trim())) {
      return `${field.label} er påkrævet.`;
    }
  }
  return null;
}
