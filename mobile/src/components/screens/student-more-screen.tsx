import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, Switch, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColorScheme } from 'nativewind';
import { addDoc, collection, doc, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
// See firebase/client.ts for why auth APIs come from @firebase/auth, not firebase/auth.
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile as updateAuthProfile } from '@firebase/auth';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useLanguagePreference, LANGUAGES } from '@/hooks/use-language-preference';
import { LanguageMenu } from '@/components/ui/language-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pickAndUploadAvatar } from '@/lib/upload-image';
import { requestAccountDeletion } from '@/lib/account-actions';

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

function InfoModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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

/** Full-screen modal with a "← Tilbage" back link, matching Personlige oplysninger / Administrer medlemskab. */
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

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** Compact "dd-mm-åååå" date field with a calendar icon, matching the Meld Fravær design. */
function CompactDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
}) {
  const [show, setShow] = useState(false);
  const display = value ? `${pad2(value.getDate())}-${pad2(value.getMonth() + 1)}-${value.getFullYear()}` : 'dd-mm-åååå';

  return (
    <View className="flex-1 gap-2">
      <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</Text>
      <Pressable
        onPress={() => setShow(true)}
        className="flex-row items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
      >
        <Text className={value ? 'font-bold text-foreground' : 'text-muted-foreground'}>{display}</Text>
        <Ionicons name="calendar-outline" size={16} color="#197670" />
      </Pressable>
      {show && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          onChange={(_, selected) => {
            setShow(false);
            if (selected) onChange(selected);
          }}
        />
      )}
    </View>
  );
}

const PAYMENT_METHODS = [
  { id: 'mobilepay', label: 'MobilePay', icon: 'phone-portrait' as const, bg: '#5A78FF', fg: '#fff' },
  { id: 'applepay', label: 'Apple Pay', icon: 'card' as const, bg: '#111214', fg: '#fff' },
  { id: 'googlepay', label: 'G Pay', icon: 'logo-google' as const, bg: '#ffffff', fg: '#374151', border: true },
  { id: 'card', label: 'Kortbetaling', icon: 'card' as const, bg: '#197670', fg: '#fff' },
];

export function StudentMoreScreen() {
  const { logout, user } = useAuth();
  const { firestore } = useFirebase();
  const { profile, mutate } = useUserProfile();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { language } = useLanguagePreference();

  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [absenceOpen, setAbsenceOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [deleteReason, setDeleteReason] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [savingAbsence, setSavingAbsence] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sendingContact, setSendingContact] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const currentLangLabel = LANGUAGES.find((l) => l.code === language)?.code.toUpperCase() ?? 'DA';

  const handleToggleLeaderboard = async (value: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(firestore, 'students', user.uid), { hideFromLeaderboard: value });
      mutate();
    } catch (error) {
      console.error('Failed to toggle leaderboard visibility:', error);
      Alert.alert('Fejl', 'Kunne ikke opdatere indstillingen.');
    }
  };

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
      Alert.alert('Fejl', 'Kunne ikke uploade billedet.');
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
      Alert.alert('Adgangskode ændret');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      console.error('Password update failed:', error);
      Alert.alert('Fejl', 'Kunne ikke opdatere adgangskoden.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user?.email || !deletePassword) {
      Alert.alert('Fejl', 'Udfyld venligst adgangskode.');
      return;
    }
    setDeleting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      await requestAccountDeletion(deleteReason.trim());
      Alert.alert(
        'Anmodning modtaget',
        'Din konto vil blive låst med det samme. Din anmodning vil blive behandlet af Ibn Amer inden for ca. 30 dage, hvorefter kontoen slettes permanent.'
      );
      setDeleteOpen(false);
      setPersonalOpen(false);
      await logout();
    } catch (error) {
      console.error('Account deletion request failed:', error);
      Alert.alert('Fejl', 'Der opstod en fejl. Prøv igen senere.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitAbsence = async () => {
    if (!user || !fromDate || !toDate || !reason.trim()) return;
    setSavingAbsence(true);
    try {
      await addDoc(collection(firestore, 'students', user.uid, 'absenceNotes'), {
        type: 'student_report',
        startDate: Timestamp.fromDate(fromDate),
        endDate: Timestamp.fromDate(toDate),
        text: reason.trim(),
        authorName: profile?.displayName || 'Elev',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Fravær registreret');
      setFromDate(null);
      setToDate(null);
      setReason('');
      setAbsenceOpen(false);
    } catch (error) {
      console.error('Absence registration error:', error);
      Alert.alert('Fejl', 'Der skete en fejl.');
    } finally {
      setSavingAbsence(false);
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
        subject: subject.trim() || 'Ingen emne',
        message: message.trim(),
        createdAt: serverTimestamp(),
        isRead: false,
      });
      Alert.alert('Besked sendt', 'Vi vender tilbage hurtigst muligt.');
      setSubject('');
      setMessage('');
      setContactOpen(false);
    } catch (error) {
      console.error('Failed to send contact message:', error);
      Alert.alert('Fejl', 'Beskeden kunne ikke sendes.');
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
          <Text className="text-2xl font-bold text-foreground">{profile?.displayName ?? 'Elev'}</Text>
          <Text className="text-muted-foreground">{profile?.email}</Text>
          {profile?.role === 'student' && profile?.studentNumber && (
            <View className="mt-1 rounded-full bg-primary px-4 py-1.5">
              <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground">
                Elev #{profile.studentNumber}
              </Text>
            </View>
          )}
        </View>

        <View className="gap-3">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| Konto</Text>
          <SettingsRow icon="person-outline" label="Personlige oplysninger" onPress={() => setPersonalOpen(true)} />
          <SettingsRow icon="card-outline" label="Administrer medlemskab" onPress={() => setMembershipOpen(true)} />
          <SettingsRow icon="calendar-outline" label="Meld Fravær" onPress={() => setAbsenceOpen(true)} />
          <SettingsRow
            icon="shield-outline"
            label="Skjul fra Leaderboard"
            right={<Switch value={!!profile?.hideFromLeaderboard} onValueChange={handleToggleLeaderboard} />}
          />
          <SettingsRow icon="mail-outline" label="Kontakt os" onPress={() => setContactOpen(true)} />
        </View>

        <View className="gap-3">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| Vælg sprog</Text>
          <SettingsRow
            icon="language-outline"
            label="Vælg sprog"
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
            label="Lyst Tema"
            onPress={toggleColorScheme}
            right={
              <View className="flex-row items-center gap-2">
                <View className="rounded-full bg-accent/10 px-2 py-1">
                  <Text className="text-[10px] font-black text-accent">
                    {colorScheme === 'dark' ? 'DARK' : 'LIGHT'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </View>
            }
          />
        </View>

        <Pressable onPress={logout} className="items-center justify-center rounded-full bg-red-50 py-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="log-out-outline" size={16} color="#dc2626" />
            <Text className="text-xs font-black uppercase tracking-widest text-red-600">Log Ud</Text>
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
          <Button variant="outline" loading={uploadingAvatar} onPress={handleChangePhoto} className="flex-row items-center gap-2 px-5 py-2">
            {uploadingAvatar ? '' : '📷 skift billede'}
          </Button>
          <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Skift billede</Text>
        </View>

        <View className="gap-4">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| Personlige oplysninger</Text>
          {!isAdmin && (
            <View className="rounded-[24px] border border-primary/10 bg-primary/5 p-5">
              <Text className="text-xs font-bold leading-relaxed text-primary/60">
                Ændringer i dine profiloplysninger skal ske via Ibn Amers administration. Kontakt os{' '}
                <Text className="font-black text-accent" onPress={() => { setPersonalOpen(false); setContactOpen(true); }}>
                  her
                </Text>
                .
              </Text>
            </View>
          )}
          <View className="gap-3 rounded-[24px] border border-border bg-card p-5">
            {profile?.role === 'student' && <FieldRow label="Elevnummer" value={profile?.studentNumber} />}
            <FieldRow label="Fulde Navn" value={profile?.displayName} />
            <FieldRow label="Telefonnummer" value={profile?.phoneNumber} />
          </View>
        </View>

        <View className="gap-4">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| Skift adgangskode</Text>
          <View className="gap-4 rounded-[24px] border border-border bg-card p-5">
            <View className="gap-2">
              <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Nuværende adgangskode
              </Text>
              <Input secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
            </View>
            <View className="gap-2">
              <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Ny adgangskode
              </Text>
              <Input secureTextEntry placeholder="Mindst 6 tegn" value={newPassword} onChangeText={setNewPassword} />
            </View>
            <Button variant="outline" loading={updatingPassword} onPress={handleUpdatePassword}>
              Opdater adgangskode
            </Button>
          </View>
        </View>

        <Pressable onPress={() => setDeleteOpen(true)} className="items-center py-4">
          <Text className="text-[10px] font-black uppercase tracking-[0.25em] text-red-600/50">Slet konto</Text>
        </Pressable>
      </BackSheet>

      <BackSheet visible={membershipOpen} onClose={() => setMembershipOpen(false)}>
        <View className="gap-2">
          <Text className="text-3xl font-bold text-accent">Administrer Medlemskab</Text>
          <Text className="leading-relaxed text-muted-foreground">
            Administrer dit abonnement, betalingsmetoder og faktureringshistorik på en sikker måde.
          </Text>
        </View>

        <View className="gap-4 rounded-[28px] border border-border bg-primary/[0.03] p-6">
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="shield-checkmark" size={18} color="#197670" />
              <Text className="font-bold text-foreground">Aktivt Abonnement</Text>
            </View>
            <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-3 py-1">
              <View className="h-1.5 w-1.5 rounded-full bg-primary" />
              <Text className="text-[10px] font-black uppercase tracking-widest text-primary">Aktiv</Text>
            </View>
          </View>
          <Text className="-mt-2 text-xs text-muted-foreground">Detaljer om din nuværende plan og næste betaling.</Text>

          <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
            <View>
              <Text className="text-[10px] font-bold text-muted-foreground">Månedlig pris</Text>
              <Text className="text-2xl font-bold text-foreground">
                {profile?.subscriptionAmount ?? 0} <Text className="text-sm font-bold text-muted-foreground">DKK</Text>
              </Text>
            </View>
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Ionicons name="checkmark" size={18} color="#197670" />
            </View>
          </View>
        </View>

        <View className="gap-4 rounded-[28px] border border-border bg-card p-6">
          <View>
            <Text className="font-bold text-foreground">Betalingsmetoder</Text>
            <Text className="text-xs text-muted-foreground">Vælg din foretrukne betalingsmetode.</Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            {[PAYMENT_METHODS.slice(0, 2), PAYMENT_METHODS.slice(2, 4)].map((row, i) => (
              <View key={i} className="w-full flex-row gap-3">
                {row.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() =>
                      Alert.alert('Tjenesten er på vej! 🚀', 'Denne betalingsmetode er under integration og vil snart være tilgængelig.')
                    }
                    style={{ backgroundColor: m.bg, borderWidth: m.border ? 1 : 0, borderColor: '#e5e7eb' }}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-4"
                  >
                    <Ionicons name={m.icon} size={16} color={m.fg} />
                    <Text style={{ color: m.fg }} className="text-sm font-bold">
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
          <View className="flex-row items-center justify-center gap-2 border-t border-border pt-4">
            <Ionicons name="shield-checkmark-outline" size={12} color="#9ca3af" />
            <Text className="text-[10px] font-medium text-muted-foreground">Sikker betaling via Nets</Text>
          </View>
        </View>
      </BackSheet>

      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full gap-4 rounded-[32px] bg-card p-6 shadow-2xl">
            <View className="flex-row items-center gap-3">
              <Ionicons name="warning" size={22} color="#dc2626" />
              <Text className="text-xl font-bold text-red-600">Er du helt sikker?</Text>
            </View>
            <Text className="text-sm leading-relaxed text-muted-foreground">
              Din konto vil blive låst med det samme. Din anmodning vil blive behandlet af Ibn Amer inden for ca. 30
              dage, hvorefter kontoen slettes permanent.
            </Text>
            <View className="gap-2">
              <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Hvorfor ønsker du at slette din konto?
              </Text>
              <Input
                multiline
                numberOfLines={3}
                value={deleteReason}
                onChangeText={setDeleteReason}
                placeholder="Hvorfor forlader du os?"
                className="min-h-[80px]"
              />
            </View>
            <View className="gap-2">
              <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Nuværende adgangskode
              </Text>
              <Input secureTextEntry value={deletePassword} onChangeText={setDeletePassword} placeholder="Bekræft med adgangskode" />
            </View>
            <View className="flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onPress={() => setDeleteOpen(false)}>
                Annuller
              </Button>
              <Button variant="destructive" className="flex-1" loading={deleting} onPress={handleRequestDeletion}>
                Slet konto
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <InfoModal visible={absenceOpen} title="Meld Fravær" onClose={() => setAbsenceOpen(false)}>
        <View className="flex-row gap-3">
          <CompactDateField label="Fra dato" value={fromDate} onChange={setFromDate} />
          <CompactDateField label="Til dato" value={toDate} onChange={setToDate} />
        </View>
        <View className="gap-2">
          <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Årsag til fravær</Text>
          <Input
            multiline
            numberOfLines={4}
            value={reason}
            onChangeText={setReason}
            placeholder="Skriv hvorfor du ikke kan komme (fx sygdom, ferie)..."
            className="min-h-[100px]"
          />
        </View>
        <Button loading={savingAbsence} onPress={handleSubmitAbsence}>
          {savingAbsence ? '' : '✓ Indsend'}
        </Button>
      </InfoModal>

      <InfoModal visible={contactOpen} title="Kontakt os" onClose={() => setContactOpen(false)}>
        <Text className="text-lg font-bold text-foreground">Send en besked til Ibn Amer Instituttet.</Text>
        <View className="gap-2">
          <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Emne</Text>
          <Input value={subject} onChangeText={setSubject} placeholder="Fx: Spørgsmål om betaling" />
        </View>
        <View className="gap-2">
          <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Besked</Text>
          <Input
            multiline
            numberOfLines={6}
            value={message}
            onChangeText={setMessage}
            placeholder="Skriv din besked her..."
            className="min-h-[140px]"
          />
        </View>
        <Button loading={sendingContact} onPress={handleSendContact}>
          Send
        </Button>
      </InfoModal>
    </SafeAreaView>
  );
}
