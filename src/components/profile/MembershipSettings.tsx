'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CreditCard, Smartphone, CheckCircle2, ShieldCheck, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useView } from '@/context/ViewContext';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const translations: Record<string, Record<Language, string>> = {
  back: { da: 'Tilbage', en: 'Back', ar: 'عودة', so: 'Dib' },
  manageMembership: { da: 'Administrer Medlemskab', en: 'Manage Membership', ar: 'إدارة العضوية', so: 'Maamul Xubinnimada' },
  manageMembershipDesc: { da: 'Administrer dit abonnement, betalingsmetoder og faktureringshistorik på en sikker måde.', en: 'Securely manage your subscription, payment methods, and billing history.', ar: 'إدارة اشتراكك وطرق الدفع وسجل الفواتير بشكل آمن.', so: 'Si ammaan ah u maamul isdiiwaangelintaada, hababka lacag bixinta, iyo taariikhda biilasha.' },
  yourSubscription: { da: 'Aktivt Abonnement', en: 'Active Subscription', ar: 'الاشتراك النشط', so: 'Isdiiwaangelinta Firfircoon' },
  yourSubscriptionDesc: { da: 'Detaljer om din nuværende plan og næste betaling.', en: 'Details of your current plan and next payment.', ar: 'تفاصيل خطتك الحالية والدفعة التالية.', so: 'Faahfaahinta qorshahaaga hadda iyo lacag bixinta xigta.' },
  monthlyAmount: { da: 'Månedlig pris', en: 'Monthly price', ar: 'السعر الشهري', so: 'Qiimaha bishii' },
  active: { da: 'Aktiv', en: 'Active', ar: 'نشط', so: 'Firfircoon' },
  inactive: { da: 'Inaktiv', en: 'Inactive', ar: 'غير نشط', so: 'Aan firfircooneyn' },
  paymentMethods: { da: 'Betalingsmetoder', en: 'Payment Methods', ar: 'طرق الدفع', so: 'Hababka Lacag Bixinta' },
  selectPaymentMethod: { da: 'Vælg din foretrukne betalingsmetode.', en: 'Select your preferred payment method.', ar: 'اختر طريقة الدفع المفضلة لديك.', so: 'Xulo habka lacag bixinta aad doorbidayso.' },
  comingSoonToastTitle: { da: 'Tjenesten er på vej! 🚀', en: 'Service on the way! 🚀', ar: 'الخدمة في الطريق! 🚀', so: 'Adeeggu waa soo socdaa! 🚀' },
  comingSoonToastDesc: { da: 'Denne betalingsmetode er under integration og vil snart være tilgængelig.', en: 'This payment method is being integrated and will be available soon.', ar: 'جاري دمج طريقة الدفع هذه وستكون متاحة قريبًا.', so: 'Habkan lacag bixinta waa la isku dubaridi doonaa oo dhawaan ayaa la heli doonaa.' },
  mobilePay: { da: 'MobilePay', en: 'MobilePay', ar: 'موبايل باي', so: 'MobilePay' },
  applePay: { da: 'Apple Pay', en: 'Apple Pay', ar: 'أبل باي', so: 'Apple Pay' },
  googlePay: { da: 'Google Pay', en: 'Google Pay', ar: 'جوجل باي', so: 'Google Pay' },
  creditCard: { da: 'Kortbetaling', en: 'Credit/Debit Card', ar: 'بطاقة الائتمان/الخصم', so: 'Kaarka Daymaha/Kaarka Lacagta' },
  securePayment: { da: 'Sikker betaling via Nets', en: 'Secure payment via Nets', ar: 'دفع آمن عبر Nets', so: 'Lacag bixin ammaan ah oo loo maro Nets' }
};

interface MembershipSettingsProps {}

export default function MembershipSettings({}: MembershipSettingsProps) {
  const { profile, isLoading } = useUserProfile();
  const { goBack } = useView();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const t = (key: string) => translations[key]?.[language] || translations[key]?.['en'];

  const handlePaymentClick = () => {
    toast({
      title: t('comingSoonToastTitle'),
      description: t('comingSoonToastDesc'),
      duration: 3000,
    });
  };

  const paymentOptions = [
    {
      id: 'mobilepay',
      name: t('mobilePay'),
      icon: Smartphone,
      color: 'bg-[#5A78FF] text-white hover:bg-[#5A78FF]/90',
      shadow: 'hover:shadow-[0_0_15px_rgba(90,120,255,0.4)]',
    },
    {
      id: 'applepay',
      name: t('applePay'),
      icon: Wallet,
      color: 'bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90',
      shadow: 'hover:shadow-[0_0_15px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]',
    },
    {
      id: 'googlepay',
      name: t('googlePay'),
      icon: Smartphone, // Generic alternative logic
      color: 'bg-white text-gray-800 border hover:bg-gray-50 dark:bg-zinc-800 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-700',
      shadow: 'hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]',
      isGoogle: true,
    },
    {
      id: 'card',
      name: t('creditCard'),
      icon: CreditCard,
      color: 'bg-emerald-600 text-white hover:bg-emerald-700',
      shadow: 'hover:shadow-[0_0_15px_rgba(5,150,105,0.4)]',
    }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const amount = profile?.subscriptionAmount ?? 0;
  const isActive = amount > 0;

  return (
    <div className="container mx-auto max-w-2xl p-4 md:p-8 pb-24 md:pb-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <Button variant="ghost" className="mb-6 -ml-4 text-muted-foreground hover:text-foreground" onClick={goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold font-headline bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent pb-1">
          {t('manageMembership')}
        </h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-xl leading-relaxed">
          {t('manageMembershipDesc')}
        </p>
      </motion.div>

      <div className="grid gap-6">
        {/* Subscription Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg bg-card/40 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 dark:bg-accent/10 rounded-full blur-[100px] -mr-16 -mt-16 pointer-events-none" />
            <CardHeader className="relative z-10 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    {t('yourSubscription')}
                  </CardTitle>
                  <CardDescription className="mt-1.5">{t('yourSubscriptionDesc')}</CardDescription>
                </div>
                <Badge 
                  variant="outline" 
                  className={`px-3 py-1 text-sm font-medium border-0 ${
                    isActive 
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-emerald-500' : 'bg-zinc-500 animate-pulse'}`} />
                  {isActive ? t('active') : t('inactive')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex bg-background/50 backdrop-blur-sm justify-between items-center p-5 border border-border/50 rounded-2xl">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground mb-1">{t('monthlyAmount')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight">{amount}</span>
                    <span className="text-lg font-medium text-muted-foreground">DKK</span>
                  </div>
                </div>
                {isActive && (
                  <div className="h-12 w-12 rounded-full ring-4 ring-emerald-500/20 bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Methods Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg bg-card/40 backdrop-blur-xl relative overflow-hidden">
             <div className="absolute bottom-0 left-0 p-32 bg-blue-500/10 rounded-full blur-[100px] -ml-16 -mb-16 pointer-events-none" />
             <CardHeader className="relative z-10 pb-4">
              <CardTitle className="text-xl">{t('paymentMethods')}</CardTitle>
              <CardDescription>{t('selectPaymentMethod')}</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {paymentOptions.map((option, idx) => (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePaymentClick}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-semibold transition-all duration-300 ${option.color} ${option.shadow}`}
                  >
                    {option.isGoogle ? (
                      <div className="flex gap-1 items-center">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span>Pay</span>
                      </div>
                    ) : (
                      <>
                        <option.icon className="w-5 h-5" />
                        {option.name}
                      </>
                    )}
                  </motion.button>
                ))}
              </div>
              
              <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-border/40 text-muted-foreground/70 text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>{t('securePayment')}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
