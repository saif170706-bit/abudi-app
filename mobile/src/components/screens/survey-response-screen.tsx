import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguagePreference } from '@/context/language-context';
import type { Survey } from '@/shared/types';

const SCALE_VALUES = [1, 2, 3, 4, 5];

export function SurveyResponseScreen({ surveyId }: { surveyId: string }) {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { tGlobal } = useLanguagePreference();

  const surveyRef = useMemoFirebase(() => doc(firestore, 'surveys', surveyId), [firestore, surveyId]);
  const { data: survey, isLoading } = useDoc<Survey>(surveyRef);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const questions = survey?.questions || [];
  const question = questions[step];
  const canProceed = !question?.required || (answers[question?.id] !== undefined && answers[question?.id] !== '');

  const handleAnswer = (value: string | number) => {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const handleSubmit = async () => {
    if (!user || !survey) return;
    setIsSubmitting(true);
    try {
      // Anonymous by design (matches the web app): only the uid is used as the
      // doc id to enforce one response per user — no name/email stored in the body.
      await setDoc(doc(firestore, 'surveys', survey.id, 'responses', user.uid), {
        surveyId: survey.id,
        submittedAt: serverTimestamp(),
        answers,
      });
      setIsSuccess(true);
    } catch (error) {
      console.error('Failed to submit survey response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step < questions.length - 1) setStep((s) => s + 1);
    else handleSubmit();
  };

  const scaleLabel = useMemo(
    () => ({ 1: tGlobal('Meget uenig'), 5: tGlobal('Meget enig') }),
    [tGlobal]
  );

  if (isLoading || !survey) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="flex-1 text-lg font-semibold text-foreground" numberOfLines={1}>{survey.title}</Text>
        <Pressable onPress={() => router.back()} className="p-2">
          <Ionicons name="close" size={22} color="#9ca3af" />
        </Pressable>
      </View>

      {!isSuccess && (
        <View className="px-6 pt-4">
          <View className="h-1.5 overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full bg-amber-600"
              style={{ width: `${((step + 1) / questions.length) * 100}%` }}
            />
          </View>
          <Text className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {tGlobal('Spørgsmål')} {step + 1} {tGlobal('af')} {questions.length}
          </Text>
        </View>
      )}

      <ScrollView contentContainerClassName="gap-10 px-6 py-8">
        {isSuccess ? (
          <View className="items-center gap-8 py-10">
            <View className="h-24 w-24 items-center justify-center rounded-[32px] bg-green-50">
              <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
            </View>
            <View className="items-center gap-3">
              <Text className="text-2xl font-extrabold text-foreground">{tGlobal('Tak for din feedback!')}</Text>
              <Text className="max-w-xs text-center text-base leading-relaxed text-muted-foreground">
                {tGlobal('Dine svar hjælper os med at gøre Ibn Amer Instituttet til et endnu bedre sted.')}
              </Text>
            </View>
            <Button className="w-full bg-foreground" textClassName="text-background" onPress={() => router.back()}>
              {tGlobal('Færdig')}
            </Button>
          </View>
        ) : (
          <View className="gap-8">
            <Text className="text-2xl font-extrabold leading-tight text-foreground">{question?.text}</Text>

            {question?.type === 'scale' && (
              <View className="gap-6">
                <View className="flex-row items-center justify-between px-2">
                  {SCALE_VALUES.map((val) => {
                    const selected = answers[question.id] === val;
                    return (
                      <Pressable
                        key={val}
                        onPress={() => handleAnswer(val)}
                        className={`h-14 w-14 items-center justify-center rounded-full border-2 ${selected ? 'border-amber-600 bg-amber-600' : 'border-border bg-muted'}`}
                      >
                        <Text className={`text-lg font-bold ${selected ? 'text-white' : 'text-muted-foreground'}`}>{val}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{scaleLabel[1]}</Text>
                  <Text className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{scaleLabel[5]}</Text>
                </View>
              </View>
            )}

            {question?.type === 'text' && (
              <Input
                multiline
                numberOfLines={6}
                value={(answers[question.id] as string) || ''}
                onChangeText={handleAnswer}
                placeholder={tGlobal('Skriv dit svar her...')}
                className="min-h-[160px]"
              />
            )}

            {question?.type === 'radio' &&
              (question.options ?? []).map((opt) => {
                const selected = answers[question.id] === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => handleAnswer(opt)}
                    className={`flex-row items-center gap-3 rounded-2xl border p-5 ${selected ? 'border-amber-600 bg-amber-50' : 'border-border bg-muted'}`}
                  >
                    <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-amber-600 bg-amber-600' : 'border-border'}`}>
                      {selected && <View className="h-2 w-2 rounded-full bg-white" />}
                    </View>
                    <Text className="flex-1 text-base font-bold text-foreground">{opt}</Text>
                  </Pressable>
                );
              })}
          </View>
        )}
      </ScrollView>

      {!isSuccess && (
        <View className="flex-row items-center justify-between gap-4 border-t border-border bg-background p-6">
          <Button
            variant="ghost"
            onPress={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            {tGlobal('Forrige')}
          </Button>
          <Button
            className="flex-1 bg-amber-600"
            loading={isSubmitting}
            disabled={!canProceed}
            onPress={handleNext}
          >
            {step === questions.length - 1 ? tGlobal('Indsend besvarelse') : tGlobal('Næste')}
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}
