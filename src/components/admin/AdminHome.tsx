'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useState, FormEvent } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, PlusCircle, LogOut, UserPlus, Languages, Moon, Sun } from 'lucide-react';
import type { UserRole, UserGender } from '@/types';
import { useHaptic } from 'use-haptic';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { useTheme } from 'next-themes';
import { WavingHand } from '@/components/ui/primitives';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


export default function AdminHome() {
  const { tGlobal } = useGlobalTranslation();

  const { auth, firestore } = useFirebase();
  const { user } = useUser();
  const { profile } = useUserProfile();
  const router = useRouter();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [gender, setGender] = useState<UserGender>('man');
  const [subAmount, setSubAmount] = useState(400);
  const [studentNumber, setStudentNumber] = useState('');
  const [courseDuration, setCourseDuration] = useState('3 year');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleLogout = async () => {
    triggerHaptic();
    await signOut(auth);
    router.push('/');
  };


  const handlePreApprove = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast({ variant: 'destructive', title: tGlobal('Ugyldig Email') });
      return;
    }

    setIsSubmitting(true);
    try {
      const userEmail = email.toLowerCase().trim();
      await setDoc(doc(firestore, 'placeholders', userEmail), {
        email: userEmail,
        role,
        subscriptionAmount: subAmount,
        gender,
        phoneNumber: phoneNumber.trim() || null,
        studentNumber: role === 'student' ? studentNumber.trim() : null,
        courseDuration: role === 'student' ? courseDuration : null,
      });

      toast({ 
        variant: 'primary', 
        title: tGlobal('Bruger Godkendt'), 
        description: `${userEmail} ${tGlobal('kan nu oprette en profil.')}` 
      });
      
      setEmail('');
      setPhoneNumber('');
      setStudentNumber('');
      setSubAmount(400);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Fejl', description: tGlobal('Kunne ikke gemme godkendelse.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-10 pb-32 sm:px-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-lg text-muted-foreground">{tGlobal('Admin')}</p>
          <h1 className="text-[38px] leading-[1.05] font-semibold tracking-tight text-foreground">
            {tGlobal('assalamuAlaikum')} {profile?.displayName || ''} <WavingHand />
          </h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              triggerHaptic();
              setTheme(theme === 'dark' ? 'light' : 'dark');
            }}
            className="rounded-full h-12 w-12 bg-card shadow-sm border border-border text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full h-12 w-12 bg-card shadow-sm border border-border text-primary group active:scale-95 transition-all"
              >
                <Languages className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-border shadow-xl min-w-[140px]">
              <DropdownMenuItem onSelect={() => setLanguage('da')} className="rounded-xl h-11 font-medium cursor-pointer">Dansk</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLanguage('en')} className="rounded-xl h-11 font-medium cursor-pointer">English</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLanguage('ar')} className="rounded-xl h-11 font-medium cursor-pointer text-right">العربية</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLanguage('so')} className="rounded-xl h-11 font-medium cursor-pointer">Soomaali</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout} 
            className="rounded-full h-12 w-12 bg-card shadow-sm border border-border text-red-500"
          >
            <LogOut className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Button 
          onClick={() => { triggerHaptic(); router.push('/admin/terminal/queue'); }} 
          variant="outline" 
          className="h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border-2"
        >
          <span className="font-bold">{tGlobal('Terminal: Træk Nummer')}</span>
          <span className="text-xs text-muted-foreground">{tGlobal('Kø-skærm for iPad')}</span>
        </Button>
        <Button 
          onClick={() => { triggerHaptic(); window.open('/admin/terminal/tv', '_blank'); }} 
          variant="outline" 
          className="h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border-2"
        >
          <span className="font-bold">{tGlobal('Terminal: TV Visning')}</span>
          <span className="text-xs text-muted-foreground">{tGlobal('Oversigt for infoskærm')}</span>
        </Button>
      </div>

      <div className="space-y-8">
        <Card className="rounded-[32px] border border-border bg-card shadow-[0_10px_40px_rgba(17,18,20,0.08)] overflow-hidden">
          <CardHeader className="pt-8 px-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <CardTitle className="text-2xl font-bold font-headline">{tGlobal('Godkend ny bruger')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <form onSubmit={handlePreApprove} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Email')}</Label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder={tGlobal("bruger@eksempel.dk")} 
                  className="h-14 rounded-2xl border-border bg-muted px-5 text-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Telefonnummer')}</Label>
                <Input 
                  type="tel" 
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)} 
                  placeholder="+45"
                  className="h-14 rounded-2xl border-border bg-muted px-5 text-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Rolle')}</Label>
                  <Select onValueChange={(v) => { triggerHaptic(); setRole(v as UserRole); }} value={role}>
                    <SelectTrigger className="h-14 rounded-2xl border-border bg-muted px-5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">{tGlobal('Elev')}</SelectItem>
                      <SelectItem value="teacher">{tGlobal('Lærer')}</SelectItem>
                      <SelectItem value="admin">{tGlobal('Admin')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Køn')}</Label>
                  <div className="h-14 flex items-center px-5 rounded-2xl border border-border bg-muted">
                    <RadioGroup 
                      value={gender} 
                      onValueChange={(v) => {
                        triggerHaptic();
                        setGender(v as UserGender);
                      }} 
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="man" id="add-man" />
                        <Label htmlFor="add-man" className="font-semibold cursor-pointer">{tGlobal('Mand')}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="woman" id="add-woman" />
                        <Label htmlFor="add-woman" className="font-semibold cursor-pointer">{tGlobal('Kvinde')}</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>

              {role === 'student' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Elevnummer')}</Label>
                    <Input 
                      placeholder={tGlobal("Fx. 12345")} 
                      value={studentNumber} 
                      onChange={(e) => setStudentNumber(e.target.value)} 
                      className="h-14 rounded-2xl border-border bg-muted px-5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Kursusforløb')}</Label>
                    <Select onValueChange={(v) => { triggerHaptic(); setCourseDuration(v); }} value={courseDuration}>
                      <SelectTrigger className="h-14 rounded-2xl border-border bg-muted px-5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.5 year">{tGlobal('1,5 år')}</SelectItem>
                        <SelectItem value="3 year">{tGlobal('3 år')}</SelectItem>
                        <SelectItem value="5 year">{tGlobal('5 år')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Abonnement (DKK)')}</Label>
                <Input 
                  type="number" 
                  value={subAmount} 
                  onChange={(e) => setSubAmount(Number(e.target.value))} 
                  className="h-14 rounded-2xl border-border bg-muted px-5"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-16 rounded-[20px] text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_rgba(25,118,112,0.25)] transition-all active:scale-[0.98]" 
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <PlusCircle className="mr-2 h-6 w-6" />}
                {tGlobal('Godkend Bruger')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
