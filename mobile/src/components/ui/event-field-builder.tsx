import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Input } from './input';
import { ChipPicker } from './chip-picker';
import type { EventFormField } from '@/shared/types';

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Tekst' },
  { value: 'radio', label: 'Ét valg' },
  { value: 'checkbox', label: 'Flere valg' },
] as const;

let idCounter = 0;
function newFieldId() {
  idCounter += 1;
  return `field_${Date.now()}_${idCounter}`;
}

export function createEmptyField(): EventFormField {
  return { id: newFieldId(), label: '', type: 'text', required: false, options: [] };
}

export function EventFieldBuilder({
  fields,
  onChange,
}: {
  fields: EventFormField[];
  onChange: (fields: EventFormField[]) => void;
}) {
  const updateField = (id: string, patch: Partial<EventFormField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };
  const removeField = (id: string) => onChange(fields.filter((f) => f.id !== id));

  return (
    <View className="gap-4">
      {fields.map((field) => (
        <View key={field.id} className="gap-3 rounded-xl border border-border bg-background p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Felt</Text>
            <Pressable onPress={() => removeField(field.id)}>
              <Text className="text-sm text-destructive">Fjern</Text>
            </Pressable>
          </View>
          <Input placeholder="Label" value={field.label} onChangeText={(v) => updateField(field.id, { label: v })} />
          <ChipPicker
            options={FIELD_TYPE_OPTIONS as any}
            value={field.type}
            onChange={(v) => updateField(field.id, { type: v as EventFormField['type'] })}
          />
          {(field.type === 'radio' || field.type === 'checkbox') && (
            <Input
              placeholder="Muligheder, adskilt med komma"
              value={(field.options ?? []).join(', ')}
              onChangeText={(v) =>
                updateField(field.id, { options: v.split(',').map((s) => s.trim()).filter(Boolean) })
              }
            />
          )}
          <Pressable
            onPress={() => updateField(field.id, { required: !field.required })}
            className="flex-row items-center gap-2"
          >
            <View className={`h-4 w-4 rounded ${field.required ? 'bg-primary' : 'border border-border'}`} />
            <Text className="text-sm text-foreground">Påkrævet</Text>
          </Pressable>
        </View>
      ))}
      <Pressable onPress={() => onChange([...fields, createEmptyField()])}>
        <Text className="text-sm font-medium text-primary">+ Tilføj felt</Text>
      </Pressable>
    </View>
  );
}
