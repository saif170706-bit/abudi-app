'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { useLanguage, type Language } from "@/context/LanguageContext";
import { useHaptic } from "use-haptic";

const LOGO_URL = "https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png";

const formSchema = z.object({
  email: z.string().email({ message: "Indtast venligst en gyldig email." }),
});

const translations: Record<string, Record<Language, string>> = {
    forgotPassword: { da: 'Glemt Adgangskode', en: 'Forgot Password', ar: 'هل نسيت كلمة المرور؟' , so: "Iloowday Furaha"},
    enterEmail: { da: 'Indtast din email for at modtage et link til nulstilling.', en: 'Enter your email to receive a reset link.', ar: 'أدخل بريدك الإلكتروني لتلقي رابط إعادة تعيين.' , so: "Gali iimaylkaaga si aad u hesho isku xirka dib u dejinta."},
    sendResetLink: { da: 'Send Link til Nulstilling', en: 'Send Reset Link', ar: 'إرسال رابط إعادة التعيين' , so: "Dir Isku Xirka"},
    rememberPassword: { da: 'Husker du din adgangskode?', en: 'Remember your password?', ar: 'هل تذكرت كلمة مرورك؟' , so: "Ma xasuusataa furahaaga?"},
    login: { da: 'Log Ind', en: 'Login', ar: 'تسجيل الدخول' , so: "Soo Gal"},
    checkEmail: { da: 'Tjek din Email', en: 'Check your Email', ar: 'تحقق من بريدك الإلكتروني' , so: "Hubi Iimaylkaaga"},
    linkSent: { da: 'Vi har sendt et link til nulstilling af adgangskode til din mail.', en: 'We\'ve sent a password reset link to your email.', ar: 'لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.' , so: "We've sent a password reset link to your email."},
    backToLogin: { da: 'Tilbage til Login', en: 'Back to Login', ar: 'العودة إلى تسجيل الدخول' , so: "Ku Noqo Soo Gelitaanka"},
    emailLabel: { da: 'Email', en: 'Email', ar: 'البريد الإلكتروني' , so: "Iimayl"},
};

export default function ForgotPasswordPage() {
  const { tGlobal } = useGlobalTranslation();

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { language } = useLanguage();
  const { triggerHaptic } = useHaptic();
  
  const t = (key: string) => translations[key]?.[language] || translations[key]?.['en'];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    triggerHaptic();
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setSubmitted(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fejl",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center px-4 py-8 sm:px-6">
        <Card className="w-full border-none shadow-[0_25px_70px_rgba(0,0,0,0.07)] rounded-[48px] overflow-hidden bg-card">
            <CardHeader className="text-center pt-12 pb-4 px-6 sm:px-10">
                <div className="grid h-20 w-20 place-items-center mx-auto mb-6 rounded-[26px] bg-primary/10 text-primary shadow-inner">
                    <CheckCircle className="h-10 w-10" />
                </div>
                <CardTitle className="text-[34px] leading-tight font-extrabold font-headline tracking-tight text-foreground">{t('checkEmail')}</CardTitle>
                <CardDescription className="text-[16px] font-medium leading-relaxed mt-2">
                    {t('linkSent')}
                </CardDescription>
            </CardHeader>
            <CardContent className="px-6 sm:px-10 pb-12">
                <Link href="/" className="w-full">
                    <Button className="w-full h-16 rounded-[26px] text-lg font-bold bg-[#111214] hover:bg-black text-white shadow-lg active:scale-[0.98] transition-all">
                        {t('backToLogin')}
                    </Button>
                </Link>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center px-4 py-8 sm:px-6">
      <Card className="w-full border-none shadow-[0_25px_70px_rgba(0,0,0,0.07)] rounded-[48px] overflow-hidden bg-card">
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
            {t('forgotPassword')}
          </CardTitle>
          <CardDescription className="text-[15px] font-medium mt-1">
            {t('enterEmail')}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-10 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground ml-1">{t('emailLabel')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-black/20" />
                        <Input 
                          placeholder={tGlobal("navn@eksempel.dk")} 
                          {...field} 
                          className="h-14 rounded-2xl border-border bg-muted pl-12 text-[16px] focus:bg-card transition-all shadow-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-16 rounded-[26px] text-lg font-bold bg-[#111214] hover:bg-black text-white shadow-[0_15px_35px_rgba(0,0,0,0.12)] transition-all active:scale-[0.98] group mt-2" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-6 w-6 animate-spin" />}
                {t('sendResetLink')}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="px-6 sm:px-10 pb-10 pt-6 bg-muted border-t border-black/[0.03]">
          <div className="text-center w-full">
            <p className="text-[15px] text-muted-foreground">
              {t('rememberPassword')}{" "}
              <Link href="/" className="text-primary font-extrabold hover:underline ml-1">
                {t('login')}
              </Link>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
