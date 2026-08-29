import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, Redirect } from 'expo-router';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RichText } from '@/components/ui/rich-text';
import { EventFormFieldRenderer, validateEventFormFields, type FormFieldValue } from '@/components/ui/event-form-field-renderer';
import type { Event, Registration } from '@/shared/types';

export function EventRegistrationScreen({ eventId }: { eventId: string }) {
  const { firestore } = useFirebase();
  const { user, loading: isAuthLoading } = useAuth();
  const [values, setValues] = useState<Record<string, FormFieldValue>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventRef = useMemoFirebase(() => doc(firestore, 'events', eventId), [firestore, eventId]);
  const { data: event, isLoading } = useDoc<Event>(eventRef);

  const registrationRef = useMemoFirebase(
    () => (user ? doc(firestore, 'events', eventId, 'registrations', user.uid) : null),
    [firestore, eventId, user?.uid]
  );
  const { data: registration } = useDoc<Registration>(registrationRef);

  const isDeadlinePassed = useMemo(() => {
    const deadline = event?.registrationDeadline?.toDate?.();
    return deadline ? deadline < new Date() : false;
  }, [event]);

  const isFull = event ? (event.registrationCount ?? 0) >= event.capacity : false;
  const isRegistered = !!registration;

  const handleSubmit = async () => {
    if (!event || !user) return;
    const error = validateEventFormFields(event.formFields ?? [], values);
    if (error) {
      Alert.alert('Udfyld venligst', error);
      return;
    }

    setIsSubmitting(true);
    try {
      await setDoc(doc(firestore, 'events', eventId, 'registrations', user.uid), {
        eventId,
        userId: user.uid,
        userName: user.displayName || '',
        userEmail: user.email || '',
        registeredAt: serverTimestamp(),
        formData: values,
      });
      router.back();
    } catch (err) {
      console.error('Event registration failed:', err);
      Alert.alert('Fejl', 'Kunne ikke gennemføre tilmelding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  if (isLoading || !event) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-4">
      <View>
        <Text className="text-2xl font-bold text-foreground">{event.title}</Text>
        <View className="mt-2">
          <RichText html={event.description ?? ''} />
        </View>
      </View>

      {isRegistered ? (
        <Card>
          <CardTitle>Du er tilmeldt</CardTitle>
          <CardDescription>Vi glæder os til at se dig.</CardDescription>
        </Card>
      ) : isDeadlinePassed ? (
        <Card>
          <CardTitle>Tilmeldingsfristen er udløbet</CardTitle>
        </Card>
      ) : isFull ? (
        <Card>
          <CardTitle>Arrangementet er fuldt booket</CardTitle>
        </Card>
      ) : (
        <View className="gap-6">
          {(event.formFields ?? []).map((field) => (
            <EventFormFieldRenderer
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
            />
          ))}
          <Button onPress={handleSubmit} loading={isSubmitting}>
            Tilmeld
          </Button>
        </View>
      )}
    </ScrollView>
  );
}
