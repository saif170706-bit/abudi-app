import React, { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { sendPasswordResetEmail } from '@firebase/auth';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguagePreference } from '@/context/language-context';

export default function ForgotPasswordScreen() {
  const { auth } = useFirebase();
  const { tGlobal } = useLanguagePreference();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (error: any) {
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke sende nulstillingslink. Tjek at emailen er korrekt.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-1 justify-center px-6 py-8" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 text-3xl font-bold text-foreground">{tGlobal('Nulstil Adgangskode')}</Text>
        <Text className="mb-8 text-base text-muted-foreground">
          {sent
            ? tGlobal('Tjek din email for et link til at nulstille din adgangskode.')
            : tGlobal('Indtast din email, så sender vi dig et nulstillingslink.')}
        </Text>

        {!sent && (
          <View className="gap-4">
            <Input
              placeholder={tGlobal('Email')}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Button onPress={handleReset} loading={loading}>
              {tGlobal('Send Nulstillingslink')}
            </Button>
          </View>
        )}

        <Link href="/(auth)/login" className="mt-6 text-center text-sm text-primary">
          {tGlobal('Tilbage til login')}
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
