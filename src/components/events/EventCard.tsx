'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useState, useMemo, useEffect } from 'react';
import { useView } from '@/context/ViewContext';
import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, CheckCircle2, ArrowRight, Share2, Clock, X, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import RichRender from '@/components/ui/rich-render';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { useHaptic } from 'use-haptic';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface EventCardProps {
  event: any;
  isNew?: boolean;
}

export default function EventCard({ event, isNew }: EventCardProps) {
  const { tGlobal } = useGlobalTranslation();
  const { setIsSubView } = useView();

  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();
  const { language } = useLanguage();

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);


  const registrationRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'events', event.id, 'registrations', user.uid) : null),
    [firestore, event.id, user?.uid]
  );
  const { data: registration } = useDoc(registrationRef);

  const isRegistered = !!registration;
  const isDeadlinePassed = event.registrationDeadline?.toDate ? event.registrationDeadline.toDate() < new Date() : false;
  const isFull = event.capacity > 0 && (event.registrationCount || 0) >= event.capacity;

  const formSchema = useMemo(() => {
    if (!event?.formFields) return z.object({});
    const shape: any = {};
    event.formFields.forEach((field: any) => {
      let fieldSchema: any;
      if (field.type === 'text') {
        fieldSchema = z.string();
        if (field.required) fieldSchema = fieldSchema.min(1, 'Dette felt er påkrævet');
        else fieldSchema = fieldSchema.optional().nullable();
      } else if (field.type === 'radio') {
        fieldSchema = z.string();
        if (field.required) fieldSchema = fieldSchema.min(1, 'Vælg venligst en mulighed');
        else fieldSchema = fieldSchema.optional().nullable();
      } else if (field.type === 'checkbox') {
        fieldSchema = z.array(z.string());
        if (field.required) fieldSchema = fieldSchema.min(1, 'Vælg mindst én mulighed');
        if (field.maxSelections) fieldSchema = fieldSchema.max(field.maxSelections, `Maksimalt ${field.maxSelections} valg`);
      } else {
        fieldSchema = z.any();
      }
      shape[field.id] = fieldSchema;
    });
    return z.object(shape);
  }, [event]);

  const defaultValues = useMemo(() => {
    if (!event?.formFields) return {};
    const vals: any = {};
    event.formFields.forEach((field: any) => {
      vals[field.id] = field.type === 'checkbox' ? [] : '';
    });
    return vals;
  }, [event]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const handleOpenRegister = () => {
    triggerHaptic();
    setIsRegisterOpen(true);
    setIsSuccess(false);
    form.reset(defaultValues);
  };

  const onRegisterSubmit = async (values: any) => {
    if (!user || !firestore) return;
    triggerHaptic();
    setIsSubmitting(true);

    const regRef = doc(firestore, 'events', event.id, 'registrations', user.uid);
    const payload = {
      id: user.uid,
      eventId: event.id,
      userId: user.uid,
      userName: user.displayName || 'Bruger',
      userEmail: user.email || 'Ingen email',
      registeredAt: serverTimestamp(),
      formData: values,
      photoURL: user.photoURL || null,
    };

    try {
      await setDoc(regRef, payload);
      setIsSuccess(true);
      triggerHaptic();
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: regRef.path,
        operation: 'create',
        requestResourceData: payload,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    const link = `${window.location.origin}/events/${event.id}/register`;
    navigator.clipboard.writeText(link);
    toast({ variant: 'primary', title: tGlobal('Link kopieret!') });
  };

  const formatDeadline = (date: any) => {
    if (!date?.toDate) return '...';
    return date.toDate().toLocaleDateString(language, { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Card className={cn(
        "group relative border-none bg-card/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden transition-all duration-500",
        "rounded-[40px] p-1 flex flex-col active:scale-[0.98]",
        isNew ? "before:absolute before:inset-0 before:p-[1px] before:rounded-[40px] before:bg-gradient-to-br before:from-[#DEA93E] before:to-transparent before:-z-10" : ""
      )}>
        <div className="bg-card dark:bg-zinc-950/40 rounded-[39px] h-full flex flex-col overflow-hidden">
        {event.imageUrl && (
          <div className="relative w-full overflow-hidden bg-muted">
            <img 
              src={event.imageUrl} 
              alt={event.title} 
              className="w-full h-auto object-contain block"
            />
          </div>
        )}

        <CardHeader className="pb-2 pt-8 px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-[#004D40]/5 text-[#004D40] dark:text-[#DEA93E] dark:bg-[#DEA93E]/10 border-none font-black px-3 h-6 uppercase tracking-wider text-[9px]">
                  {tGlobal('Begivenhed')}
                </Badge>
                {isNew && (
                  <Badge className="bg-[#DEA93E] text-[#004D40] border-none font-black px-3 h-6 uppercase tracking-wider text-[9px]">
                    {tGlobal('Ny')}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl font-display font-bold leading-tight text-[#004D40] dark:text-white pt-1 break-words">
                {event.title}
              </CardTitle>
            </div>
            
            <button onClick={handleShare} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-[#004D40]/5 text-[#004D40]/20 hover:text-[#004D40] transition-colors shrink-0">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pb-6 px-8">
          <div className="text-base text-foreground/75 dark:text-white/70 leading-relaxed break-words font-medium">
            <RichRender value={event.description} />
          </div>

          <div className="flex flex-wrap gap-y-3 gap-x-6">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
              <Clock className="h-4 w-4 text-[#DEA93E]/60" />
              <span>{formatDeadline(event.registrationDeadline)}</span>
            </div>
            
            {event.capacity > 0 && (
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                <Users className="h-4 w-4 text-[#004D40]/40 dark:text-white/40" />
                <span>{event.capacity} {tGlobal('Pladser')}</span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="px-8 pb-8 pt-0">
          {isRegistered ? (
            <Button disabled className="w-full h-14 rounded-2xl bg-[#004D40]/5 dark:bg-white/5 text-[#004D40] dark:text-white border-none shadow-none font-black text-[15px] gap-3">
              <CheckCircle2 className="h-5 w-5" />
              {tGlobal('Du er tilmeldt')}
            </Button>
          ) : isDeadlinePassed ? (
            <Button disabled className="w-full h-14 rounded-2xl bg-muted/40 text-muted-foreground/40 border-none shadow-none font-black text-[15px]">
              {tGlobal('Frist udløbet')}
            </Button>
          ) : isFull ? (
            <Button disabled className="w-full h-14 rounded-2xl bg-red-500/10 text-red-500/60 border-none shadow-none font-black text-[15px]">
              {tGlobal('Ingen pladser tilbage')}
            </Button>
          ) : (
            <div className="flex flex-col w-full gap-2 overflow-hidden rounded-2xl">
              <Button 
                onClick={handleOpenRegister} 
                className="w-full h-14 bg-[#004D40] hover:bg-[#004D40]/90 dark:bg-white dark:hover:bg-white/90 dark:text-[#004D40] text-white font-black text-[16px] shadow-lg shadow-black/10 flex items-center justify-between px-6 transition-all"
              >
                <span>{tGlobal('Tilmeld dig her')}</span>
                <ArrowRight className="h-5 w-5 opacity-40" />
              </Button>
            </div>
          )}
        </CardFooter>
      </div>
    </Card>

        <FullscreenSheet 
        open={isRegisterOpen} 
        onOpenChange={setIsRegisterOpen} 
        title={isSuccess ? tGlobal('Tilmeldt!') : event.title}
        rightSlot={<button onClick={() => setIsRegisterOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X className="h-6 w-6 opacity-40" /></button>}
      >
        <div className="px-4 py-8 pb-32 max-w-2xl mx-auto space-y-8">
          {isSuccess ? (
            <div className="flex flex-col items-center text-center space-y-10 py-10 animate-in zoom-in-95 duration-500">
              <div className="grid h-24 w-24 place-items-center rounded-[32px] bg-primary/10 text-primary shadow-inner">
                <CheckCircle className="h-12 w-12" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold font-headline text-foreground">{tGlobal('Tilmeldt!')}</h2>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-xs mx-auto">
                  {tGlobal('Du er nu tilmeldt {title}. Vi glæder os til at se dig!').replace('{title}', event.title)}
                </p>
              </div>
              <Button onClick={() => setIsRegisterOpen(false)} className="w-full h-16 rounded-[24px] bg-black text-white font-bold text-lg shadow-xl shadow-black/10 active:scale-[0.98]">
                {tGlobal('Færdig')}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 p-6 rounded-[32px] bg-card border border-border shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">{tGlobal('detaljer')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-foreground font-bold">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <span>{formatDeadline(event.registrationDeadline)}</span>
                  </div>
                  {event.capacity > 0 && (
                    <div className="flex items-center gap-3 text-foreground font-bold">
                      <Users className="h-5 w-5 text-primary" />
                      <span>{event.capacity} {tGlobal('Pladser').toLowerCase()}</span>
                    </div>
                  )}
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onRegisterSubmit)} className="space-y-6">
                  {event.formFields && event.formFields.length > 0 ? (
                    <div className="space-y-4">
                      {event.formFields.map((field: any) => (
                        <Card key={field.id} className="rounded-[28px] border-none bg-card p-6 shadow-sm">
                          <FormField
                            control={form.control}
                            name={field.id}
                            render={({ field: formField }) => (
                              <FormItem className="space-y-4">
                                <FormLabel className="text-base font-bold text-foreground flex items-center gap-2">
                                  {field.label}
                                  {field.required && <span className="text-red-500">*</span>}
                                </FormLabel>
                                <FormControl>
                                  {field.type === 'text' ? (
                                    <Input 
                                      {...formField} 
                                      className="h-14 rounded-xl bg-muted border-border text-base px-5" 
                                      placeholder={tGlobal("Skriv her...")} 
                                    />
                                  ) : field.type === 'radio' ? (
                                    <RadioGroup onValueChange={formField.onChange} value={formField.value} className="grid gap-3">
                                      {field.options?.map((opt: string) => (
                                        <div key={opt} className="flex items-center space-x-3 p-4 rounded-xl border border-border bg-muted active:bg-muted">
                                          <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                                          <label htmlFor={`${field.id}-${opt}`} className="text-sm font-semibold flex-1 cursor-pointer">{opt}</label>
                                        </div>
                                      ))}
                                    </RadioGroup>
                                  ) : field.type === 'checkbox' ? (
                                    <div className="grid gap-3">
                                      {field.options?.map((opt: string) => (
                                        <div key={opt} className="flex items-center space-x-3 p-4 rounded-xl border border-border bg-muted">
                                          <Checkbox
                                            id={`${field.id}-${opt}`}
                                            checked={formField.value?.includes(opt)}
                                            onCheckedChange={(checked) => {
                                              const current = formField.value || [];
                                              if (checked) formField.onChange([...current, opt]);
                                              else formField.onChange(current.filter((v: string) => v !== opt));
                                            }}
                                          />
                                          <label htmlFor={`${field.id}-${opt}`} className="text-sm font-semibold flex-1 cursor-pointer">{opt}</label>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </Card>
                      ))}
                    </div>
                  ) : null}

                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full h-16 rounded-[24px] bg-[#2E9D63] hover:bg-[#2E9D63]/90 text-white font-bold text-lg shadow-xl shadow-green-500/20 active:scale-[0.98] transition-all"
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : null}
                    {tGlobal('Bekræft tilmelding')}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>
      </FullscreenSheet>
    </>
  );
}
