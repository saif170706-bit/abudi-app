import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Input } from './input';
import { ChipPicker } from './chip-picker';
import type { SurveyQuestion } from '@/shared/types';

const QUESTION_TYPE_OPTIONS = [
  { value: 'text', label: 'Tekst' },
  { value: 'scale', label: 'Skala (1-5)' },
  { value: 'radio', label: 'Ét valg' },
  { value: 'checkbox', label: 'Flere valg' },
] as const;

let idCounter = 0;
function newQuestionId() {
  idCounter += 1;
  return `question_${Date.now()}_${idCounter}`;
}

export function createEmptyQuestion(): SurveyQuestion {
  return { id: newQuestionId(), text: '', type: 'text', required: false, options: [] };
}

export function SurveyQuestionBuilder({
  questions,
  onChange,
}: {
  questions: SurveyQuestion[];
  onChange: (questions: SurveyQuestion[]) => void;
}) {
  const updateQuestion = (id: string, patch: Partial<SurveyQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };
  const removeQuestion = (id: string) => onChange(questions.filter((q) => q.id !== id));

  return (
    <View className="gap-4">
      {questions.map((question, index) => (
        <View key={question.id} className="gap-3 rounded-xl border border-border bg-background p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Spørgsmål {index + 1}
            </Text>
            <Pressable onPress={() => removeQuestion(question.id)}>
              <Text className="text-sm text-destructive">Fjern</Text>
            </Pressable>
          </View>
          <Input
            placeholder="Spørgsmålstekst"
            value={question.text}
            onChangeText={(v) => updateQuestion(question.id, { text: v })}
          />
          <ChipPicker
            options={QUESTION_TYPE_OPTIONS as any}
            value={question.type}
            onChange={(v) => updateQuestion(question.id, { type: v as SurveyQuestion['type'] })}
          />
          {(question.type === 'radio' || question.type === 'checkbox') && (
            <Input
              placeholder="Muligheder, adskilt med komma"
              value={(question.options ?? []).join(', ')}
              onChangeText={(v) =>
                updateQuestion(question.id, { options: v.split(',').map((s) => s.trim()).filter(Boolean) })
              }
            />
          )}
          <Pressable
            onPress={() => updateQuestion(question.id, { required: !question.required })}
            className="flex-row items-center gap-2"
          >
            <View className={`h-4 w-4 rounded ${question.required ? 'bg-primary' : 'border border-border'}`} />
            <Text className="text-sm text-foreground">Påkrævet</Text>
          </Pressable>
        </View>
      ))}
      <Pressable onPress={() => onChange([...questions, createEmptyQuestion()])}>
        <Text className="text-sm font-medium text-primary">+ Tilføj spørgsmål</Text>
      </Pressable>
    </View>
  );
}
