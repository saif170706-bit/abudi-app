import React, { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { signInWithEmailAndPassword } from '@firebase/auth';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguagePreference } from '@/context/language-context';

export default function LoginScreen() {
  const { auth } = useFirebase();
  const { tGlobal } = useLanguagePreference();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/');
    } catch (error: any) {
      Alert.alert(tGlobal('Login fejlede'), tGlobal('Ugyldig email eller adgangskode.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-1 justify-center px-6 py-8" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 text-3xl font-bold text-foreground">{tGlobal('Velkommen Tilbage')}</Text>
        <Text className="mb-8 text-base text-muted-foreground">{tGlobal('Log ind på din konto')}</Text>

        <View className="gap-4">
          <Input
            placeholder={tGlobal('Email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input placeholder={tGlobal('Adgangskode')} secureTextEntry value={password} onChangeText={setPassword} />
          <Button onPress={handleLogin} loading={loading}>
            {tGlobal('Log Ind')}
          </Button>
        </View>

        <Link href="/(auth)/forgot-password" className="mt-4 text-center text-sm text-muted-foreground">
          {tGlobal('Glemt adgangskode?')}
        </Link>
        <Link href="/(auth)/signup" className="mt-6 text-center text-sm text-primary">
          {tGlobal('Har du ikke en konto? Opret Konto')}
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
