'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { useDoc, useUser, useFirebase, useMemoFirebase } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Loader2, CheckCircle, ArrowLeft, ChevronLeft, Calendar, Users, X, Mail, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Checkbox } from '@/components/ui/checkbox';
import { useHaptic } from 'use-haptic';
import Image from 'next/image';
import { Label } from '@/components/ui/label';

export default function EventRegistrationPage() {
  const { tGlobal } = useGlobalTranslation();

    const params = useParams();
    const router = useRouter();
    const eventId = params.eventId as string;
    const { user, loading: userLoading } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { triggerHaptic } = useHaptic();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const eventRef = useMemoFirebase(
      () => (eventId && firestore ? doc(firestore, 'events', eventId) : null), 
      [firestore, eventId]
    );
    const { data: event, isLoading: eventLoading } = useDoc<Event>(eventRef);

    // Build dynamic schema based on form fields + basic info for external users
    const formSchema = useMemo(() => {
        const shape: any = {};

        // Add base fields for non-auth users
        if (!user) {
            shape.externalName = z.string().min(1, 'Indtast venligst dit navn');
            shape.externalEmail = z.string().email('Indtast venligst en gyldig email');
        }

        if (event?.formFields) {
            event.formFields.forEach(field => {
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
        }

        return z.object(shape);
    }, [event, user]);

    const defaultValues = useMemo(() => {
        const vals: any = {};
        if (!user) {
            vals.externalName = '';
            vals.externalEmail = '';
        }
        if (event?.formFields) {
            event.formFields.forEach(field => {
                vals[field.id] = field.type === 'checkbox' ? [] : '';
            });
        }
        return vals;
    }, [event, user]);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues,
    });

    useEffect(() => {
        if (event) form.reset(defaultValues);
    }, [event, form, defaultValues]);

    const onSubmit = async (values: any) => {
        if (!event || !firestore) return;
        triggerHaptic();
        setIsSubmitting(true);

        const registrationId = user?.uid || `external_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const regRef = doc(firestore, 'events', event.id, 'registrations', registrationId);

        const userName = user?.displayName || values.externalName || 'Ekstern gæst';
        const userEmail = user?.email || values.externalEmail || 'Ingen email';

        const payload = {
            id: registrationId,
            eventId: event.id,
            userId: user?.uid || null,
            userName,
            userEmail,
            registeredAt: serverTimestamp(),
            formData: values,
            photoURL: user?.photoURL || null,
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

    if (eventLoading || userLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 bg-background">
                <Card className="w-full max-w-sm rounded-[32px] p-8 text-center border-none shadow-xl">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-500 mx-auto mb-6">
                        <X className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Begivenhed ikke fundet</h2>
                    <p className="text-muted-foreground text-sm mb-8">Vi kunne ikke finde den begivenhed, du leder efter.</p>
                    <Button onClick={() => router.back()} className="w-full h-12 rounded-2xl bg-black font-bold">Gå tilbage</Button>
                </Card>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 bg-background">
                <Card className="w-full max-w-md rounded-[40px] p-10 text-center border-none shadow-2xl">
                    <div className="grid h-24 w-24 place-items-center rounded-3xl bg-primary/10 text-primary mx-auto mb-8 animate-in zoom-in-50 duration-500">
                        <CheckCircle className="h-12 w-12" />
                    </div>
                    <h2 className="text-3xl font-extrabold mb-4 font-headline text-foreground">Tilmeldt!</h2>
                    <p className="text-muted-foreground text-[17px] leading-relaxed mb-10">
                        Du er nu tilmeldt <strong>{event.title}</strong>. Vi glæder os til at se dig!
                    </p>
                    <Button onClick={() => router.back()} className="w-full h-16 rounded-[24px] bg-black text-white font-bold text-lg shadow-lg">
                        Færdig
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border px-4 h-16 flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-10 w-10">
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="font-bold text-[17px] truncate max-w-[200px]">Tilmelding</h1>
                <div className="w-10" />
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-8 space-y-8">
                {/* Event Hero */}
                <Card className="overflow-hidden rounded-[32px] border-none bg-card shadow-sm">
                    {event.imageUrl && (
                        <div className="relative aspect-video w-full">
                            <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
                        </div>
                    )}
                    <div className="p-8 space-y-4">
                        <h2 className="text-2xl font-extrabold font-headline leading-tight">{event.title}</h2>
                        <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-500/50" /> {new Date(event.registrationDeadline.toDate()).toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })}</div>
                            {event.capacity > 0 && <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary/50" /> {event.capacity} pladser</div>}
                        </div>
                    </div>
                </Card>

                {/* Form */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        
                        {!user && (
                            <Card className="rounded-[28px] border-none bg-card p-6 shadow-sm space-y-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Dine oplysninger</h3>
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="externalName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-bold text-foreground">Fulde Navn</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input {...field} className="h-14 rounded-xl bg-muted border-border pl-11" placeholder={tGlobal("Indtast dit navn")} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="externalEmail"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-bold text-foreground">Email</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input {...field} type="email" className="h-14 rounded-xl bg-muted border-border pl-11" placeholder={tGlobal("Indtast din email")} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </Card>
                        )}

                        {event.formFields && event.formFields.length > 0 ? (
                            <div className="space-y-4">
                                {event.formFields.map((field) => (
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
                                                            <Input {...formField} className="h-12 rounded-xl bg-muted border-border" placeholder={tGlobal("Skriv dit svar her...")} />
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
                        ) : !user ? null : (
                            <Card className="rounded-[28px] border-none bg-card p-8 text-center shadow-sm">
                                <p className="text-muted-foreground font-medium">Tryk på knappen nedenfor for at bekræfte din tilmelding.</p>
                            </Card>
                        )}

                        <div className="pt-4">
                            <Button 
                                type="submit" 
                                disabled={isSubmitting} 
                                className="w-full h-16 rounded-[24px] bg-[#2E9D63] hover:bg-[#2E9D63]/90 text-white font-bold text-lg shadow-lg shadow-green-500/20 active:scale-[0.98] transition-transform"
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : null}
                                Bekræft tilmelding
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}
