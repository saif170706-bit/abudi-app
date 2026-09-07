import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
// See firebase/client.ts for why auth APIs come from @firebase/auth, not firebase/auth.
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile as updateAuthProfile } from '@firebase/auth';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useLanguagePreference, LANGUAGES } from '@/context/language-context';
import { LanguageMenu } from '@/components/ui/language-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pickAndUploadAvatar } from '@/lib/upload-image';
import * as WebBrowser from 'expo-web-browser';

function SettingsRow({
  icon,
  label,
  onPress,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/5">
        <Ionicons name={icon} size={18} color="#197670" />
      </View>
      <Text className="flex-1 font-semibold text-card-foreground">{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={18} color="#9ca3af" />}
    </Pressable>
  );
}

function InfoModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Text className="text-lg font-semibold text-foreground">{title}</Text>
          <Pressable onPress={onClose} className="p-2">
            <Ionicons name="close" size={22} color="#9ca3af" />
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="gap-6 p-6">{children}</ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function BackSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-8 px-6 pb-16 pt-6">
          <Pressable onPress={onClose} className="flex-row items-center gap-1 self-start">
            <Ionicons name="chevron-back" size={18} color="#197670" />
            <Text className="text-sm font-bold text-primary">Tilbage</Text>
          </Pressable>
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function FieldRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
      <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</Text>
      <Text className="mt-1 font-bold text-foreground">{value || 'Ikke angivet'}</Text>
    </View>
  );
}

export function TeacherMoreScreen() {
  const { logout, user } = useAuth();
  const { firestore } = useFirebase();
  const { profile, mutate } = useUserProfile();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { language, tGlobal } = useLanguagePreference();

  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sendingContact, setSendingContact] = useState(false);

  const currentLangLabel = LANGUAGES.find((l) => l.code === language)?.code.toUpperCase() ?? 'DA';

  const handleChangePhoto = async () => {
    if (!user || !profile) return;
    setUploadingAvatar(true);
    try {
      const url = await pickAndUploadAvatar(user.uid);
      if (!url) return;
      await updateAuthProfile(user, { photoURL: url });
      await updateDoc(doc(firestore, `${profile.role}s`, profile.id), { photoURL: url });
      mutate();
    } catch (error) {
      console.error('Avatar upload failed:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke uploade billedet.'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user?.email || !currentPassword || !newPassword) return;
    setUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert(tGlobal('Adgangskode ændret'));
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      console.error('Password update failed:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke opdatere adgangskoden.'));
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSendContact = async () => {
    if (!profile || !message.trim()) return;
    setSendingContact(true);
    try {
      await addDoc(collection(firestore, 'contactMessages'), {
        userId: profile.id,
        userName: profile.displayName,
        userEmail: profile.email,
        subject: subject.trim() || tGlobal('Ingen emne'),
        message: message.trim(),
        createdAt: serverTimestamp(),
        isRead: false,
      });
      Alert.alert(tGlobal('Besked sendt'), tGlobal('Vi vender tilbage hurtigst muligt.'));
      setSubject('');
      setMessage('');
      setContactOpen(false);
    } catch (error) {
      console.error('Failed to send contact message:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Beskeden kunne ikke sendes.'));
    } finally {
      setSendingContact(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="gap-8 px-6 pb-32 pt-8">
        <View className="items-center gap-2">
          <View className="h-24 w-24 overflow-hidden rounded-full border-4 border-border shadow-sm">
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center bg-primary/10">
                <Ionicons name="person" size={36} color="#197670" />
              </View>
            )}
          </View>
          <Text className="text-2xl font-bold text-foreground">{profile?.displayName ?? tGlobal('Lærer')}</Text>
          <Text className="text-muted-foreground">{profile?.email}</Text>
        </View>

        <View className="gap-3">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| {tGlobal('Konto')}</Text>
          <SettingsRow icon="person-outline" label={tGlobal('Personlige oplysninger')} onPress={() => setPersonalOpen(true)} />
          <SettingsRow icon="card-outline" label={tGlobal('Administrer medlemskab')} onPress={() => setMembershipOpen(true)} />
          <SettingsRow icon="mail-outline" label={tGlobal('Kontakt os')} onPress={() => setContactOpen(true)} />
        </View>

        <View className="gap-3">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| {tGlobal('Vælg sprog')}</Text>
          <SettingsRow
            icon="language-outline"
            label={tGlobal('Vælg sprog')}
            onPress={() => setLanguageMenuOpen(true)}
            right={
              <View className="flex-row items-center gap-2">
                <View className="rounded-full bg-accent/10 px-2 py-1">
                  <Text className="text-[10px] font-black text-accent">{currentLangLabel}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </View>
            }
          />
          <SettingsRow
            icon="sunny-outline"
            label={tGlobal('Lyst Tema')}
            onPress={toggleColorScheme}
            right={
              <View className="flex-row items-center gap-2">
                <View className="rounded-full bg-accent/10 px-2 py-1">
                  <Text className="text-[10px] font-black text-accent">{colorScheme === 'dark' ? 'DARK' : 'LIGHT'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </View>
            }
          />
        </View>

        <View className="gap-3">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| {tGlobal('Om')}</Text>
          <SettingsRow
            icon="shield-checkmark-outline"
            label={tGlobal('Privatlivspolitik')}
            onPress={() => WebBrowser.openBrowserAsync('https://ibnamer.dk/privacy')}
          />
          <SettingsRow
            icon="document-text-outline"
            label={tGlobal('Vilkår og betingelser')}
            onPress={() => WebBrowser.openBrowserAsync('https://ibnamer.dk/terms')}
          />
        </View>

        <Pressable onPress={logout} className="items-center justify-center rounded-full bg-red-50 py-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="log-out-outline" size={16} color="#dc2626" />
            <Text className="text-xs font-black uppercase tracking-widest text-red-600">{tGlobal('Log ud')}</Text>
          </View>
        </Pressable>
      </ScrollView>

      <LanguageMenu visible={languageMenuOpen} onClose={() => setLanguageMenuOpen(false)} />

      <BackSheet visible={personalOpen} onClose={() => setPersonalOpen(false)}>
        <View className="items-center gap-4 rounded-[28px] border border-border bg-card p-8">
          <View className="h-24 w-24 overflow-hidden rounded-full border-4 border-border shadow-sm">
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center bg-primary/10">
                <Ionicons name="person" size={36} color="#197670" />
              </View>
            )}
          </View>
          <Button variant="outline" loading={uploadingAvatar} onPress={handleChangePhoto} className="px-5 py-2">
            {uploadingAvatar ? '' : `📷 ${tGlobal('skift billede')}`}
          </Button>
        </View>

        <View className="gap-4">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| {tGlobal('Personlige oplysninger')}</Text>
          <View className="rounded-[24px] border border-primary/10 bg-primary/5 p-5">
            <Text className="text-xs font-bold leading-relaxed text-primary/60">
              {tGlobal('Ændringer i dine profiloplysninger skal ske via Ibn Amers administration. Kontakt os')}{' '}
              <Text className="font-black text-accent" onPress={() => { setPersonalOpen(false); setContactOpen(true); }}>
                {tGlobal('her')}
              </Text>
              .
            </Text>
          </View>
          <View className="gap-3 rounded-[24px] border border-border bg-card p-5">
            <FieldRow label={tGlobal('Fulde Navn')} value={profile?.displayName} />
            <FieldRow label={tGlobal('Telefonnummer')} value={profile?.phoneNumber} />
          </View>
        </View>

        <View className="gap-4">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| {tGlobal('Skift adgangskode')}</Text>
          <View className="gap-4 rounded-[24px] border border-border bg-card p-5">
            <View className="gap-2">
              <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{tGlobal('Nuværende adgangskode')}</Text>
              <Input secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
            </View>
            <View className="gap-2">
              <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{tGlobal('Ny adgangskode')}</Text>
              <Input secureTextEntry placeholder={tGlobal('Mindst 6 tegn')} value={newPassword} onChangeText={setNewPassword} />
            </View>
            <Button variant="outline" loading={updatingPassword} onPress={handleUpdatePassword}>
              {tGlobal('Opdater adgangskode')}
            </Button>
          </View>
        </View>
      </BackSheet>

      <BackSheet visible={membershipOpen} onClose={() => setMembershipOpen(false)}>
        <View className="gap-2">
          <Text className="text-3xl font-bold text-accent">{tGlobal('Administrer Medlemskab')}</Text>
          <Text className="leading-relaxed text-muted-foreground">
            {tGlobal('Administrer dine kontooplysninger på en sikker måde.')}
          </Text>
        </View>
        <FieldRow label={tGlobal('Rolle')} value={tGlobal('Lærer')} />
      </BackSheet>

      <InfoModal visible={contactOpen} title={tGlobal('Kontakt os')} onClose={() => setContactOpen(false)}>
        <Text className="text-lg font-bold text-foreground">{tGlobal('Send en besked til Ibn Amer Instituttet.')}</Text>
        <View className="gap-2">
          <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{tGlobal('Emne')}</Text>
          <Input value={subject} onChangeText={setSubject} placeholder={tGlobal('Fx: Spørgsmål om betaling')} />
        </View>
        <View className="gap-2">
          <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{tGlobal('Besked')}</Text>
          <Input multiline numberOfLines={6} value={message} onChangeText={setMessage} placeholder={tGlobal('Skriv din besked her...')} className="min-h-[140px]" />
        </View>
        <Button loading={sendingContact} onPress={handleSendContact}>
          {tGlobal('Send')}
        </Button>
      </InfoModal>
    </SafeAreaView>
  );
}
