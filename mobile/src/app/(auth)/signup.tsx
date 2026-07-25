import React, { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from '@firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupScreen() {
  const { auth, firestore } = useFirebase();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    if (password !== confirmPassword) {
      Alert.alert('Fejl', 'Adgangskoderne stemmer ikke.');
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const placeholderDocRef = doc(firestore, 'placeholders', normalizedEmail);
      const placeholderSnap = await getDoc(placeholderDocRef);
      if (!placeholderSnap.exists()) {
        throw new Error('Denne email er ikke forhåndsgodkendt.');
      }

      const pData = placeholderSnap.data() as any;
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const newUser = userCredential.user;
      await updateProfile(newUser, { displayName: name });

      await setDoc(doc(firestore, `${pData.role}s`, newUser.uid), {
        uid: newUser.uid,
        id: newUser.uid,
        displayName: name,
        email: newUser.email,
        subscriptionAmount: pData.subscriptionAmount,
        role: pData.role,
        gender: pData.gender,
        studentNumber: pData.studentNumber || null,
        name,
        displayNameLower: name.toLowerCase(),
      });

      router.replace('/');
    } catch (error: any) {
      Alert.alert('Fejl', error.message ?? 'Der skete en fejl. Prøv igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-1 justify-center px-6 py-8" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 text-3xl font-bold text-foreground">Opret Konto</Text>
        <Text className="mb-8 text-base text-muted-foreground">Kun forhåndsgodkendte emails kan oprette konto</Text>

        <View className="gap-4">
          <Input placeholder="Fulde Navn" value={name} onChangeText={setName} />
          <Input
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input placeholder="Adgangskode" secureTextEntry value={password} onChangeText={setPassword} />
          <Input
            placeholder="Bekræft Adgangskode"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <Button onPress={handleSignup} loading={loading}>
            Opret Konto
          </Button>
        </View>

        <Link href="/(auth)/login" className="mt-6 text-center text-sm text-primary">
          Har du allerede en konto? Log Ind
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
