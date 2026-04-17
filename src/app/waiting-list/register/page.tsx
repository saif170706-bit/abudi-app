'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, count, getCountFromServer } from 'firebase/firestore';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  CheckCircle, 
  User, 
  Phone, 
  Mail, 
  BookOpen, 
  History,
  Users,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useHaptic } from 'use-haptic';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function WaitingListRegisterPage() {
  const { tGlobal } = useGlobalTranslation();

  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState<'man' | 'woman' | ''>('');
  const [readingLevel, setReadingLevel] = useState('');
  const [memorizingLevel, setMemorizingLevel] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    if (!name || !email || !phoneNumber || !gender) {
      toast({ variant: 'destructive', title: 'Manglende felter', description: 'Udfyld venligst alle påkrævede felter.' });
      return;
    }

    setIsLoading(true);
    triggerHaptic();

    try {
      // 1. Get current position for this gender
      const q = query(collection(firestore, 'waitingList'), where('gender', '==', gender));
      const snapshot = await getCountFromServer(q);
      const currentCount = snapshot.data().count;
      
      // 2. Add to waiting list
      const data = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phoneNumber: phoneNumber.trim(),
        gender,
        readingLevel: readingLevel.trim(),
        memorizingLevel: memorizingLevel.trim(),
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'waitingList'), data);
      
      setPosition(currentCount + 1);
      setIsSuccess(true);
      triggerHaptic();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Fejl', description: 'Der opstod en fejl. Prøv igen senere.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-[40px] border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="bg-[#2E9D63] p-10 text-center text-white relative">
            <div className="absolute top-0 left-0 right-0 h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif")', backgroundSize: '200px' }} />
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-card/20 mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold font-headline leading-tight">Du er nu på ventelisten!</h2>
          </div>
          
          <CardContent className="p-8 space-y-8">
            <div className="text-center space-y-2">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Din nuværende plads</p>
              <div className="text-7xl font-extrabold text-foreground font-headline">#{position}</div>
              <p className="text-sm font-medium text-muted-foreground max-w-[240px] mx-auto pt-2">
                Vi kontakter dig via email eller telefon, når der bliver en plads ledig.
              </p>
            </div>

            <div className="p-6 rounded-[28px] bg-muted border border-border space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary"><Info className="h-4 w-4" /></div>
                <h3 className="text-sm font-bold text-foreground">Information</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ibn Amer Instituttet prioriterer kvalitet i undervisningen. Vi optager løbende nye elever, typisk omkring <strong>15 mænd</strong> og <strong>5 kvinder</strong> hver måned.
              </p>
            </div>

            <Button onClick={() => window.location.reload()} className="w-full h-16 rounded-[24px] bg-[#111214] hover:bg-black text-white font-bold text-lg shadow-xl shadow-black/10">
              Færdig
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="text-center space-y-4">
          <div className="relative h-20 w-20 mx-auto rounded-[24px] overflow-hidden shadow-lg">
            <Image 
              src="https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png" 
              alt="Logo" 
              fill 
              className="object-cover" 
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-headline">Venteliste</h1>
            <p className="text-muted-foreground font-medium">Tilmeld dig ventelisten til Ibn Amer Instituttet</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card className="rounded-[32px] border border-border bg-card shadow-sm overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><User className="h-5 w-5" /></div>
                  <CardTitle className="text-xl font-bold">Personlige oplysninger</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Fulde Navn *</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder={tGlobal("Dit navn")} 
                    required 
                    className="h-14 rounded-2xl border-border bg-muted px-5 text-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder={tGlobal("din@email.dk")} 
                      required 
                      className="h-14 rounded-2xl border-border bg-muted px-5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Telefonnummer *</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)} 
                      placeholder={tGlobal("88 88 88 88")} 
                      required 
                      className="h-14 rounded-2xl border-border bg-muted px-5"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Køn *</Label>
                  <RadioGroup 
                    value={gender} 
                    onValueChange={(v: any) => { triggerHaptic(); setGender(v); }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className={cn(
                      "flex items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer",
                      gender === 'man' ? "bg-primary/5 border-primary shadow-sm" : "bg-muted border-border hover:bg-muted"
                    )} onClick={() => setGender('man')}>
                      <RadioGroupItem value="man" id="man" className="sr-only" />
                      <Label htmlFor="man" className="font-bold text-foreground cursor-pointer">Mand</Label>
                    </div>
                    <div className={cn(
                      "flex items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer",
                      gender === 'woman' ? "bg-primary/5 border-primary shadow-sm" : "bg-muted border-border hover:bg-muted"
                    )} onClick={() => setGender('woman')}>
                      <RadioGroupItem value="woman" id="woman" className="sr-only" />
                      <Label htmlFor="woman" className="font-bold text-foreground cursor-pointer">Kvinde</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[32px] border border-border bg-card shadow-sm overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><BookOpen className="h-5 w-5" /></div>
                  <CardTitle className="text-xl font-bold">Faglige oplysninger</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reading" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nuværende Læseniveau</Label>
                  <Textarea 
                    id="reading" 
                    value={readingLevel} 
                    onChange={(e) => setReadingLevel(e.target.value)} 
                    placeholder={tGlobal("Beskriv hvor god du er til at læse arabisk...")} 
                    className="min-h-[100px] rounded-2xl border-border bg-muted p-4 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memorizing" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nuværende Memoreringsniveau</Label>
                  <Textarea 
                    id="memorizing" 
                    value={memorizingLevel} 
                    onChange={(e) => setMemorizingLevel(e.target.value)} 
                    placeholder={tGlobal("Hvor meget af Koranen har du memoreret?")} 
                    className="min-h-[100px] rounded-2xl border-border bg-muted p-4 text-base"
                  />
                </div>
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-16 rounded-[24px] bg-[#2E9D63] hover:bg-[#2E9D63]/90 text-white font-bold text-lg shadow-[0_10px_30px_rgba(46,157,99,0.25)] transition-all active:scale-[0.98]"
            >
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Tilmeld venteliste"}
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          <p className="text-xs font-medium">Vi behandler dine data sikkert og fortroligt.</p>
        </div>
      </div>
    </div>
  );
}
