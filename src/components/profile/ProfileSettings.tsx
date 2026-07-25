'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import {
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  signOut,
} from 'firebase/auth';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cleanupFcmTokenOnLogout } from '@/lib/fcm';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import {
  Loader2,
  CreditCard,
  Languages,
  LogOut,
  ChevronRight,
  User,
  X,
  AlertTriangle,
  Mail,
  Send,
  Moon,
  Sun,
  Shield,
  Calendar,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import AvatarUploader from '@/components/profile/AvatarUploader';
import AbsenceRegistration from '@/components/student/AbsenceRegistration';
import { useView } from '@/context/ViewContext';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { requestAccountDeletion } from '@/lib/user';
import IslamicDivider from '@/components/ui/IslamicDivider';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';


export default function ProfileSettings() {
  const { tGlobal } = useGlobalTranslation();
  const { profile, isLoading: isProfileLoading, mutate } = useUserProfile();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const { setView } = useView();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();
  const shouldOpenAbsence = searchParams.get('open') === 'absence';
  

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [deletionReason, setDeletionReason] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhoneNumber(profile.phoneNumber || '');
    }
  }, [profile]);

  useEffect(() => {
    if (profile && firestore) {
      const docRef = doc(firestore, `${profile.role}s`, profile.id);
      updateDoc(docRef, { language }).catch(() => {});
    }
  }, [language, profile, firestore]);

  const handleLogout = async () => {
    try {
      if (!auth) return;
      // Clean up FCM token before signing out so old devices stop receiving notifications
      if (profile?.role) {
        await cleanupFcmTokenOnLogout(profile.role);
      }
      await signOut(auth);
      router.push('/');
    } catch (e: any) {
      toast({ variant: 'destructive', title: tGlobal('Fejl'), description: tGlobal('Kunne ikke logge ud.') });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser || !firestore || !profile) return;
    setLoadingProfile(true);
    try {
      await updateProfile(auth.currentUser, { displayName });
      const userDocRef = doc(firestore, `${profile.role}s`, profile.id);
      await updateDoc(userDocRef, { displayName, name: displayName, displayNameLower: displayName.toLowerCase(), phoneNumber });
      mutate();
      setIsEditOpen(false);
      toast({ title: tGlobal('Profil opdateret') });
    } catch (error: any) {
      toast({ variant: 'destructive', title: tGlobal('Fejl'), description: error.message });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth?.currentUser;
    if (!user || !user.email) return;
    setLoadingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast({ title: tGlobal('Adgangskode ændret') });
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: tGlobal('Fejl'), description: tGlobal('Opdater adgangskode') + ' fejl' });
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleSendContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !firestore || !contactMessage.trim()) return;
    setIsSendingContact(true);
    try {
      await addDoc(collection(firestore, 'contactMessages'), {
        userId: profile.id,
        userName: profile.displayName,
        userEmail: profile.email,
        subject: contactSubject.trim() || tGlobal('Ingen emne'),
        message: contactMessage.trim(),
        createdAt: serverTimestamp(),
        isRead: false
      });
      toast({ variant: 'primary', title: tGlobal('Besked sendt'), description: tGlobal('Vi vender tilbage hurtigst muligt.') });
      setContactSubject('');
      setContactMessage('');
      setIsContactOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: tGlobal('Fejl'), description: tGlobal('Beskeden kunne ikke sendes.') });
    } finally {
      setIsSendingContact(false);
    }
  };

  const handleRequestDeletion = async () => {
    const user = auth?.currentUser;
    if (!user?.email || !reauthPassword) {
      toast({ variant: 'destructive', title: tGlobal('Fejl'), description: tGlobal('Udfyld venligst adgangskode.') });
      return;
    }
    setLoadingDelete(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, reauthPassword);
      await reauthenticateWithCredential(user, credential);
      await requestAccountDeletion(deletionReason.trim());
      toast({ variant: "primary", title: tGlobal('Anmodning modtaget'), description: tGlobal("Din konto vil blive låst med det samme. Din anmodning vil blive behandlet af Ibn Amer inden for ca. 30 dage, hvorefter kontoen slettes permanent.") });
      await signOut(auth);
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: tGlobal('Fejl'), description: tGlobal('Der opstod en fejl. Prøv igen senere.') });
    } finally {
      setLoadingDelete(false);
    }
  };

  if (isProfileLoading || !profile) {
    return <div className="flex h-screen items-center justify-center bg-[#fdfaf5]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isAdmin = profile.role === 'admin';

  const SettingsRow = ({ icon: Icon, label, onClick, rightElement, className = "", variant = "default" }: { icon: any, label: string, onClick?: () => void, rightElement?: React.ReactNode, className?: string, variant?: "default" | "danger" }) => (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center justify-between px-6 py-5 text-left transition-all", className)}>
      <div className="flex items-center gap-4 relative z-10">
        <div className={cn("grid h-12 w-12 place-items-center rounded-2xl shadow-sm", variant === "danger" ? "bg-red-50 text-red-500" : "bg-primary/5 text-primary")}><Icon className="h-5 w-5" /></div>
        <span className="text-[17px] font-bold text-primary">{label}</span>
      </div>
      <div className="flex items-center gap-3 relative z-10">
        {rightElement}
        <ChevronRight className="h-5 w-5 text-primary/20" />
      </div>
    </button>
  );

  return (
    <div className="min-h-screen pt-12 pb-32 px-6 w-full max-w-lg mx-auto space-y-10">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col items-center text-center relative"
      >
        <div className="relative group">
           <Avatar className="h-32 w-32 border-8 border-border dark:border-white/20 shadow-2xl mb-6 scale-hover transition-transform duration-500">
            {profile.photoURL && <AvatarImage src={profile.photoURL} className="object-cover" />}
            <AvatarFallback className="text-3xl bg-primary/10 text-primary dark:text-white font-display">{getInitials(profile.displayName)}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 -right-2 bg-accent text-accent-foreground p-2 rounded-2xl shadow-xl border-4 border-background">
            <User className="h-5 w-5" />
          </div>
        </div>
        <h1 className="text-4xl font-display text-primary tracking-tight mb-2">{profile.displayName}</h1>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-bold text-primary/40 tracking-wider font-jakarta">{profile.email}</p>
          {profile.role === 'student' && profile.studentNumber && (
            <div className="px-4 py-1.5 bg-primary text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">{tGlobal('Elev')} #{profile.studentNumber}</div>
          )}
        </div>
      </motion.div>

      <div className="space-y-12">
        <div className="space-y-6">
          <div className="section-label">{tGlobal('Konto')}</div>
          <div className="space-y-4">
            <SettingsRow icon={User} label={tGlobal('Personlige oplysninger')} onClick={() => setIsEditOpen(true)} className="glass-card shadow-sm hover:translate-y-[-2px]" />
            <SettingsRow icon={CreditCard} label={tGlobal('Administrer medlemskab')} onClick={() => setView('membership')} className="glass-card shadow-sm hover:translate-y-[-2px]" />
            {profile.role === 'student' && (
              <AbsenceRegistration 
                studentId={profile.id} 
                studentName={profile.fullName || profile.displayName || tGlobal('Elev')} 
                defaultOpen={shouldOpenAbsence}
                trigger={
                  <SettingsRow 
                    icon={Calendar} 
                    label={tGlobal('Meld Fravær')} 
                    className="glass-card shadow-sm hover:translate-y-[-2px]" 
                  />
                }
              />
            )}
            {profile.role === 'student' && (
              <SettingsRow 
                icon={Shield} 
                label={tGlobal('Skjul fra Leaderboard')} 
                onClick={async () => {
                  const newVal = !profile.hideFromLeaderboard;
                  if (!firestore) return;
                  await updateDoc(doc(firestore, `${profile.role}s`, profile.id), { hideFromLeaderboard: newVal });
                  mutate();
                  toast({ title: newVal ? tGlobal('Skjult fra leaderboard') : tGlobal('Synlig på leaderboard'), description: tGlobal('Dit navn og dine point vil ikke være synlige for andre.') });
                }} 
                rightElement={
                  <div className={cn("h-6 w-11 rounded-full p-1 transition-colors", profile.hideFromLeaderboard ? "bg-accent" : "bg-neutral-200")}>
                    <div className={cn("h-4 w-4 rounded-full bg-white transition-transform shadow-sm", profile.hideFromLeaderboard ? "translate-x-5" : "translate-x-0")} />
                  </div>
                }
                className="glass-card shadow-sm hover:translate-y-[-2px]" 
              />
            )}
            <SettingsRow icon={Mail} label={tGlobal('Kontakt os')} onClick={() => setIsContactOpen(true)} className="glass-card shadow-sm hover:translate-y-[-2px]" />
          </div>
        </div>

        <IslamicDivider />

        <div className="space-y-6">
          <div className="section-label">{tGlobal('Vælg sprog')}</div>
          <div className="space-y-4">
            <SettingsRow icon={Languages} label={tGlobal('Vælg sprog')} rightElement={<span className="text-[10px] font-black text-accent uppercase tracking-widest bg-accent/10 px-3 py-1 rounded-full">{language}</span>} onClick={() => { const langs: Language[] = ['da', 'en', 'ar', 'so']; const nextIdx = (langs.indexOf(language) + 1) % langs.length; setLanguage(langs[nextIdx]); }} className="glass-card shadow-sm" />
            <SettingsRow icon={theme === 'dark' ? Moon : Sun} label={theme === 'dark' ? tGlobal('Mørkt Tema') : tGlobal('Lyst Tema')} rightElement={<span className="text-[10px] font-black text-accent uppercase tracking-widest bg-accent/10 px-3 py-1 rounded-full">{theme || 'system'}</span>} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="glass-card shadow-sm" />
          </div>
        </div>

        <div className="pt-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleLogout} className="w-full flex items-center justify-center gap-3 h-16 rounded-[28px] bg-red-50 text-red-600 border border-red-100 font-black uppercase text-[11px] tracking-[0.2em] shadow-sm">
            <LogOut className="h-5 w-5" />
            {tGlobal('Log ud')}
          </motion.button>
        </div>
      </div>

      <FullscreenSheet open={isEditOpen} onOpenChange={setIsEditOpen} title={tGlobal('Rediger profil')} rightSlot={<button onClick={() => setIsEditOpen(false)} className="p-3 bg-primary/5 rounded-2xl"><X className="h-5 w-5 text-primary" /></button>}>
        <div className="p-6 space-y-10 pb-32 w-full max-w-lg mx-auto">
          <div className="glass-card overflow-hidden">
            <div className="glass-card-inner !p-10 flex flex-col items-center justify-center">
              <AvatarUploader />
              <p className="mt-4 text-[10px] font-black uppercase text-primary/30 tracking-widest">{tGlobal('skift billede')}</p>
            </div>
          </div>
          <div className="space-y-6 w-full">
            <div className="section-label">{tGlobal('Personlige oplysninger')}</div>
            {!isAdmin && (
              <div className="p-5 rounded-[28px] bg-primary/5 border border-primary/10 text-xs font-bold text-primary/60 leading-relaxed shadow-inner">
                {tGlobal('Ændringer i dine profiloplysninger skal ske via Ibn Amers administration. Kontakt os ')}
                <button onClick={() => { setIsEditOpen(false); setIsContactOpen(true); }} className="text-accent font-black mx-1 hover:underline">{tGlobal('her')}</button>.
              </div>
            )}
            <div className="glass-card">
              <form onSubmit={handleProfileUpdate} className="glass-card-inner space-y-6">
                  {profile.role === 'student' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/30 ml-2">{tGlobal('Elevnummer')}</Label>
                        <Input value={profile.studentNumber || tGlobal('Ej tildelt')} disabled className="h-14 rounded-2xl border-border bg-muted text-muted-foreground font-black px-6" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/30 ml-2">{tGlobal('Din Hifz Plan')}</Label>
                        <Input value={`${profile.hifzPlan || '3'} ${tGlobal('år')}`} disabled className="h-14 rounded-2xl border-border bg-muted text-muted-foreground font-black px-6" />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-[10px] font-black uppercase tracking-widest text-primary/30 ml-2">{tGlobal('Fulde Navn')}</Label>
                    <Input id="edit-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={!isAdmin} className={cn("h-14 rounded-2xl border-border px-6 font-bold", !isAdmin ? "bg-muted text-muted-foreground" : "bg-card text-foreground focus:ring-2")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone" className="text-[10px] font-black uppercase tracking-widest text-primary/30 ml-2">{tGlobal('Telefonnummer')}</Label>
                    <Input id="edit-phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={!isAdmin} className={cn("h-14 rounded-2xl border-border px-6 font-bold", !isAdmin ? "bg-muted text-muted-foreground" : "bg-card text-foreground focus:ring-2")} />
                  </div>
                  {isAdmin && (
                    <Button type="submit" disabled={loadingProfile} className="w-full h-16 rounded-[28px] font-black uppercase text-[11px] tracking-[0.2em] bg-primary text-white shadow-2xl mt-4">
                      {loadingProfile && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
                      {tGlobal('Gem ændringer')}
                    </Button>
                  )}
              </form>
            </div>
          </div>
          <div className="space-y-6 w-full">
            <div className="section-label">{tGlobal('Skift adgangskode')}</div>
            <div className="glass-card">
              <form onSubmit={handlePasswordUpdate} className="glass-card-inner space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="pwd-current" className="text-[10px] font-black uppercase tracking-widest text-primary/30 ml-2">{tGlobal('Nuværende adgangskode')}</Label>
                    <Input id="pwd-current" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-14 rounded-2xl border-border bg-card px-6" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pwd-new" className="text-[10px] font-black uppercase tracking-widest text-primary/30 ml-2">{tGlobal('Ny adgangskode')}</Label>
                    <Input id="pwd-new" type="password" autoComplete="new-password" placeholder={tGlobal('Mindst 6 tegn')} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-14 rounded-2xl border-border bg-card px-6" />
                  </div>
                  <Button type="submit" variant="outline" disabled={loadingPassword} className="w-full h-16 rounded-[28px] font-black uppercase text-[11px] tracking-[0.2em] border-primary/20 text-primary">
                    {loadingPassword && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
                    {tGlobal('Opdater adgangskode')}
                  </Button>
              </form>
            </div>
          </div>
          <div className="pt-8 text-center">
             <button onClick={() => setIsDeleteOpen(true)} className="text-[10px] font-black uppercase tracking-[0.25em] text-red-600/40 hover:text-red-600 transition-colors uppercase">{tGlobal('Slet konto')}</button>
          </div>
        </div>
      </FullscreenSheet>

      <FullscreenSheet open={isContactOpen} onOpenChange={setIsContactOpen} title={tGlobal('Kontakt os')} rightSlot={<button onClick={() => setIsContactOpen(false)} className="p-3 bg-primary/5 rounded-2xl"><X className="h-5 w-5 text-primary" /></button>}>
        <div className="p-6 space-y-10 pb-32 w-full max-w-lg mx-auto">
          <div className="space-y-3">
             <h2 className="text-3xl font-display text-primary tracking-tight">{tGlobal('Send en besked til Ibn Amer Instituttet.')}</h2>
          </div>
          <form onSubmit={handleSendContact} className="space-y-8 w-full">
            <div className="glass-card">
              <div className="glass-card-inner space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="contact-subject" className="text-[10px] font-black uppercase tracking-widest text-primary/30 ml-2">{tGlobal('Emne')}</Label>
                  <Input id="contact-subject" value={contactSubject} onChange={(e) => setContactSubject(e.target.value)} className="h-14 rounded-2xl border-white/40 bg-white/40 px-6 font-bold" placeholder={tGlobal('Fx: Spørgsmål om betaling')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-message" className="text-[10px] font-black uppercase tracking-widest text-primary/30 ml-2">{tGlobal('Besked')}</Label>
                  <Textarea id="contact-message" value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} required placeholder={tGlobal('Skriv din besked her...')} className="min-h-[250px] rounded-3xl border-border bg-card p-6 text-base font-medium resize-none shadow-inner" />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={isSendingContact || !contactMessage.trim()} className="w-full h-20 rounded-[32px] bg-primary text-white font-black uppercase text-[12px] tracking-[0.25em] shadow-2xl flex items-center justify-center gap-4">
              {isSendingContact ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-5 w-5" />}
              {tGlobal('Send')}
            </Button>
          </form>
        </div>
      </FullscreenSheet>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogPortal>
          <DialogOverlay className="z-[300]" />
          <DialogContent className="z-[300] rounded-[40px] sm:max-w-md bg-card border-border shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-red-600 font-display text-2xl">
                <AlertTriangle className="h-6 w-6" />
                {tGlobal('Er du helt sikker?')}
              </DialogTitle>
              <DialogDescription className="pt-2 text-primary/60 font-medium">
                {tGlobal('Din konto vil blive låst med det samme. Din anmodning vil blive behandlet af Ibn Amer inden for ca. 30 dage, hvorefter kontoen slettes permanent.')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/30 ml-2">{tGlobal('Hvorfor ønsker du at slette din konto?')}</Label>
                <Textarea placeholder={tGlobal("Hvorfor forlader du os?")} value={deletionReason} onChange={(e) => setDeletionReason(e.target.value)} className="rounded-2xl min-h-[100px] border-primary/10 bg-primary/5" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/30 ml-2">{tGlobal('Nuværende adgangskode')}</Label>
                <Input type="password" autoComplete="off" placeholder={tGlobal('Bekræft med adgangskode')} value={reauthPassword} onChange={(e) => setReauthPassword(e.target.value)} className="h-14 rounded-2xl border-primary/10" />
              </div>
              <div className="flex items-start gap-4 p-5 rounded-3xl bg-red-50 border border-red-100">
                <Checkbox id="confirm-del" checked={deleteConfirmation} onCheckedChange={(v) => setDeleteConfirmation(!!v)} className="mt-1" />
                <label htmlFor="confirm-del" className="text-xs font-bold leading-tight text-red-900">{tGlobal('Jeg forstår at min konto låses i 30 dage.')}</label>
              </div>
            </div>
            <DialogFooter className="flex-col gap-3">
              <Button variant="destructive" className="w-full h-14 rounded-2xl font-black uppercase text-[11px] tracking-widest" disabled={!deleteConfirmation || !reauthPassword || loadingDelete} onClick={handleRequestDeletion}>
                {loadingDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : tGlobal('Anmod om sletning')}
              </Button>
              <Button variant="ghost" className="w-full h-12 rounded-xl font-bold text-primary/40" onClick={() => setIsDeleteOpen(false)}>{tGlobal('Annuller')}</Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
