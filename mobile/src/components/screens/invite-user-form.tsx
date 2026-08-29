import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChipPicker } from '@/components/ui/chip-picker';
import type { UserRole, UserGender } from '@/shared/types';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'student', label: 'Elev' },
  { value: 'teacher', label: 'Lærer' },
  { value: 'admin', label: 'Admin' },
];

const GENDER_OPTIONS: { value: UserGender; label: string }[] = [
  { value: 'man', label: 'Mand' },
  { value: 'woman', label: 'Kvinde' },
];

const COURSE_DURATIONS = ['1.5 year', '3 year', '5 year'] as const;

/** "Godkend ny bruger" — pre-approve an email by writing to placeholders/{email}. Shared by the admin home screen and the standalone /admin/invite route. */
export function InviteUserForm() {
  const { firestore } = useFirebase();
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [gender, setGender] = useState<UserGender>('man');
  const [subscriptionAmount, setSubscriptionAmount] = useState('400');
  const [studentNumber, setStudentNumber] = useState('');
  const [courseDuration, setCourseDuration] = useState<(typeof COURSE_DURATIONS)[number]>('3 year');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      Alert.alert('Ugyldig email');
      return;
    }

    setIsSubmitting(true);
    try {
      await setDoc(doc(firestore, 'placeholders', normalizedEmail), {
        email: normalizedEmail,
        role,
        subscriptionAmount: Number(subscriptionAmount) || 0,
        gender,
        phoneNumber: phoneNumber.trim() || null,
        studentNumber: role === 'student' ? studentNumber.trim() || null : null,
        courseDuration: role === 'student' ? courseDuration : null,
        createdAt: serverTimestamp(),
      });
      Alert.alert('Bruger godkendt', `${normalizedEmail} kan nu oprette en profil.`);
      setEmail('');
      setPhoneNumber('');
      setStudentNumber('');
      setSubscriptionAmount('400');
    } catch (error) {
      console.error('Failed to pre-approve user:', error);
      Alert.alert('Fejl', 'Kunne ikke gemme godkendelse.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="gap-5 rounded-2xl border border-border bg-card p-4">
      <Text className="text-lg font-bold text-card-foreground">Godkend ny bruger</Text>

      <View className="gap-2">
        <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</Text>
        <Input autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      </View>

      <View className="gap-2">
        <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Telefonnummer</Text>
        <Input keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="+45" />
      </View>

      <View className="gap-2">
        <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rolle</Text>
        <ChipPicker options={ROLE_OPTIONS} value={role} onChange={setRole} />
      </View>

      <View className="gap-2">
        <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Køn</Text>
        <ChipPicker options={GENDER_OPTIONS} value={gender} onChange={setGender} />
      </View>

      {role === 'student' && (
        <>
          <View className="gap-2">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Elevnummer</Text>
            <Input value={studentNumber} onChangeText={setStudentNumber} placeholder="Fx. 12345" />
          </View>
          <View className="gap-2">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kursusforløb</Text>
            <ChipPicker
              options={COURSE_DURATIONS.map((d) => ({ value: d, label: d }))}
              value={courseDuration}
              onChange={setCourseDuration}
            />
          </View>
        </>
      )}

      <View className="gap-2">
        <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Abonnement (DKK)</Text>
        <Input keyboardType="number-pad" value={subscriptionAmount} onChangeText={setSubscriptionAmount} />
      </View>

      <Button onPress={handleSubmit} loading={isSubmitting}>
        Godkend Bruger
      </Button>
    </View>
  );
}
