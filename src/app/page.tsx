'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useState, FormEvent, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Mail, Lock, User as UserIcon, Languages, ArrowRight } from 'lucide-react';
import {
  updateProfile,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useHaptic } from 'use-haptic';
import { cn } from '@/lib/utils';

const LOGO_URL = "https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png";


export default function LoginPage() {
  const { tGlobal } = useGlobalTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { auth, firestore } = useFirebase();
  const { user, loading: isUserLoading } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  

  if (isUserLoading || (user && profile)) return null;

  // Prefetch critical pages on mount
  useEffect(() => {
    router.prefetch('/terms');
    router.prefetch('/forgot-password');
  }, [router]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    setLoading(true);
    signInWithEmailAndPassword(auth, email, password)
        .catch((error) => {
            let description = tGlobal('Der opstod en fejl under login.');
            if (error.code === 'auth/user-disabled') {
                description = tGlobal('Denne konto er låst pga. anmodning om sletning. Kontakt Ibn Amer inden for 30 dage hvis du ønsker at gendanne den.');
            } else if (error.code === 'auth/invalid-credential') {
                description = tGlobal('Ugyldig email eller adgangskode.');
            }
            toast({ variant: 'destructive', title: tGlobal('Login Fejl'), description });
            setLoading(false);
        });
  };
  
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    if (password !== confirmPassword) { toast({ variant: 'destructive', title: tGlobal('Adgangskoderne stemmer ikke.') }); return; }
    if (!agreedToTerms) { toast({ variant: 'destructive', title: tGlobal('Accepter venligst vilkårene.') }); return; }

    setLoading(true);
    try {
        const placeholderDocRef = doc(firestore, 'placeholders', email.toLowerCase());
        const placeholderSnap = await getDoc(placeholderDocRef);
        if (!placeholderSnap.exists()) throw new Error(tGlobal('Denne email er ikke forhåndsgodkendt.'));

        const pData = placeholderSnap.data();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        await updateProfile(newUser, { displayName: name });
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('cachedRole', pData.role);
        }

        await setDoc(doc(firestore, `${pData.role}s`, newUser.uid), {
            uid: newUser.uid, 
            id: newUser.uid,
            displayName: name, 
            email: newUser.email,
            phoneNumber, 
            subscriptionAmount: pData.subscriptionAmount,
            role: pData.role, 
            gender: pData.gender, 
            studentNumber: pData.studentNumber || null,
            name, 
            displayNameLower: name.toLowerCase(),
            language: language // Sync language on signup
        });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Fejl', description: error.message });
        setLoading(false);
    }
  };

  const toggleMode = () => {
    triggerHaptic();
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center px-4 py-8 sm:px-6">
      <Card className="w-full relative border-none shadow-[0_25px_70px_rgba(0,0,0,0.07)] rounded-[48px] overflow-hidden bg-card">
        {/* Language Switcher Overlay */}
        <div className="absolute top-6 right-6 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-muted hover:bg-black/[0.06] h-10 w-10">
                  <Languages className="h-5 w-5 text-foreground/60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-border shadow-xl">
                <DropdownMenuItem onSelect={() => setLanguage('da')} className="rounded-xl h-11 font-medium">Dansk</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLanguage('en')} className="rounded-xl h-11 font-medium">English</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLanguage('ar')} className="rounded-xl h-11 font-medium">العربية</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLanguage('so')} className="rounded-xl h-11 font-medium">Soomaali</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <CardHeader className="text-center pt-12 pb-4 px-6 sm:px-10">
          <div className="relative h-20 w-20 mx-auto mb-4 rounded-[26px] overflow-hidden shadow-lg border-4 border-white">
            <Image 
              src={LOGO_URL} 
              alt="Ibn Amer Logo" 
              fill 
              className="object-cover" 
              priority
            />
          </div>
          <CardTitle className="text-[34px] leading-tight font-extrabold font-headline tracking-tight text-foreground">
            {authMode === 'login' ? tGlobal('Velkommen Tilbage') : tGlobal('Opret Konto')}
          </CardTitle>
        </CardHeader>

        <CardContent className="px-6 sm:px-10 pb-8">
          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground ml-1">{tGlobal('Email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-black/20" />
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    className="h-14 rounded-2xl border-border bg-muted pl-12 text-[16px] focus:bg-card transition-all shadow-sm"
                    placeholder={tGlobal("navn@eksempel.dk")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{tGlobal('Adgangskode')}</Label>
                  <button 
                    type="button" 
                    onClick={() => router.push('/forgot-password')} 
                    className="text-[11px] font-bold text-primary uppercase tracking-wider hover:opacity-70 transition-opacity"
                  >
                    {tGlobal('Glemt adgangskode?')}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-black/20" />
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="h-14 rounded-2xl border-border bg-muted pl-12 pr-12 text-[16px] focus:bg-card transition-all shadow-sm"
                    placeholder={tGlobal("••••••••")}
                  />
                  <button 
                    type="button" 
                    onClick={() => { triggerHaptic(); setShowPassword(!showPassword); }} 
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5 text-black/20" /> : <Eye className="h-5 w-5 text-black/20" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-16 rounded-[26px] text-lg font-bold bg-[#111214] hover:bg-black text-white shadow-[0_15px_35px_rgba(0,0,0,0.12)] transition-all active:scale-[0.98] group mt-2" 
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : null}
                {tGlobal('Log Ind')}
                <ArrowRight className="ml-2 h-5 w-5 opacity-40 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          ) : (
             <form onSubmit={handleSignup} className="space-y-6">
                <div className="space-y-2">
                   <Label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground ml-1">{tGlobal('Fulde Navn')}</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-black/20" />
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      required 
                      className="h-14 rounded-2xl border-border bg-muted pl-12 text-[16px]"
                      placeholder={tGlobal("Fulde Navn")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                   <Label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground ml-1">{tGlobal('Email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-black/20" />
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      className="h-14 rounded-2xl border-border bg-muted pl-12 text-[16px]"
                      placeholder={tGlobal("Email")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground ml-1">{tGlobal('Adgangskode')}</Label>
                    <Input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      className="h-14 rounded-2xl border-border bg-muted text-[16px]"
                      placeholder={tGlobal("••••••")}
                    />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground ml-1">{tGlobal('Bekræft Adgangskode')}</Label>
                    <Input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      required 
                      className="h-14 rounded-2xl border-border bg-muted text-[16px]"
                      placeholder={tGlobal("••••••")}
                    />
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-2xl bg-muted border border-black/[0.03]">
                  <Checkbox 
                    id="terms" 
                    checked={agreedToTerms} 
                    onCheckedChange={(v) => { triggerHaptic(); setAgreedToTerms(!!v); }} 
                    className="mt-0.5"
                  />
                  <label htmlFor="terms" className="text-[13px] font-medium leading-tight text-muted-foreground cursor-pointer">
                    {tGlobal('Jeg accepterer')} <Link href="/terms" className="text-primary font-bold hover:underline">{tGlobal('vilkårene')}</Link>
                  </label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-16 rounded-[26px] text-lg font-bold bg-[#2E9D63] hover:bg-[#2E9D63]/90 text-white shadow-[0_15px_35px_rgba(46,157,99,0.18)] transition-all active:scale-[0.98] mt-2" 
                  disabled={loading || !agreedToTerms}
                >
                  {loading && <Loader2 className="mr-2 h-6 w-6 animate-spin" />}
                   {tGlobal('Tilmeld')}
                </Button>
              </form>
          )}
        </CardContent>

        <CardFooter className="px-6 sm:px-10 pb-10 pt-6 bg-muted border-t border-black/[0.03]">
          <div className="text-center w-full">
            <p className="text-[15px] text-muted-foreground">
               {authMode === 'login' ? tGlobal('Ingen konto?') : tGlobal('Har du allerede en konto?')}{" "}
              <button 
                onClick={toggleMode} 
                className="text-primary font-extrabold hover:underline ml-1"
              >
                 {authMode === 'login' ? tGlobal('Tilmeld') : tGlobal('Log Ind')}
              </button>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
