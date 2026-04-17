'use client';

import { useMemo, useState, useEffect } from 'react';
import { useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter, useParams } from 'next/navigation';
import { doc, collection, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Trash2, Edit, User, Link as LinkIcon, Eye, Copy } from 'lucide-react';
import type { Event, Registration } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventFormSchema } from '@/components/admin/event-form-schema';
import FormFieldBuilder from '@/components/admin/FormFieldBuilder';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle } from 'lucide-react';
import RichTextarea from '@/components/ui/rich-textarea';

function formatDate(date: any) {
  if (!date) return 'Ukendt';
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function RegistrationDetailDialog({ registration, eventFields, isOpen, onOpenChange }: { registration: Registration | null, eventFields: Event['formFields'], isOpen: boolean, onOpenChange: (isOpen: boolean) => void }) {
    if (!registration) return null;

    const fieldLabelMap = new Map(eventFields?.map(f => [f.id, f.label]));

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Svar fra {registration.userName}</DialogTitle>
                    <DialogDescription>{registration.userEmail}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    {Object.entries(registration.formData).map(([fieldId, answer]) => (
                        <div key={fieldId}>
                            <h4 className="font-semibold">{fieldLabelMap.get(fieldId) || fieldId}</h4>
                            <p className="text-muted-foreground">{Array.isArray(answer) ? answer.join(', ') : answer.toString()}</p>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}


function RegistrationTable({ registrations, event }: { registrations: Registration[], event: Event }) {
    const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);

    const { inAppRegistrations, externalRegistrations } = useMemo(() => {
        const inApp: Registration[] = [];
        const external: Registration[] = [];
        registrations.forEach(reg => {
            if (reg.userId) {
                inApp.push(reg);
            } else {
                external.push(reg);
            }
        });
        return { inAppRegistrations: inApp, externalRegistrations: external };
    }, [registrations]);
    
    const extractFieldFromFormData = (formData: Record<string, any>, fieldId: string | undefined): string => {
        if (!fieldId || !formData[fieldId]) return 'N/A';
        const value = formData[fieldId];
        return Array.isArray(value) ? value.join(', ') : String(value);
    };

    const nameFieldId = useMemo(() => event.formFields?.find(f => f.label.toLowerCase().includes('navn'))?.id, [event.formFields]);
    const emailFieldId = useMemo(() => event.formFields?.find(f => f.label.toLowerCase().includes('mail'))?.id, [event.formFields]);


    if (!registrations || registrations.length === 0) {
        return <p className="text-muted-foreground">Ingen tilmeldinger endnu.</p>
    }

    const renderRow = (reg: Registration, isExternal: boolean) => {
        const name = isExternal ? extractFieldFromFormData(reg.formData, nameFieldId) : reg.userName;
        const email = isExternal ? extractFieldFromFormData(reg.formData, emailFieldId) : reg.userEmail;

        return (
             <TableRow key={reg.id}>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell>{email}</TableCell>
                <TableCell>{formatDate(reg.registeredAt)}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedRegistration(reg)}>
                        <Eye className="h-4 w-4" />
                    </Button>
                </TableCell>
            </TableRow>
        )
    };

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Navn</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tilmeldt Dato</TableHead>
                        <TableHead className="text-right">Handlinger</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {inAppRegistrations.length > 0 && (
                         <TableRow>
                            <TableCell colSpan={4} className="py-2 px-2 bg-muted">
                                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <span>App Brugere</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                    {inAppRegistrations.map(reg => renderRow(reg, false))}

                    {externalRegistrations.length > 0 && (
                        <>
                           <TableRow>
                                <TableCell colSpan={4} className="py-2 px-2 bg-muted">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                         <LinkIcon className="h-4 w-4" />
                                        <span>Eksterne Tilmeldinger (via link)</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </>
                    )}
                    {externalRegistrations.map(reg => renderRow(reg, true))}
                </TableBody>
            </Table>
            <RegistrationDetailDialog 
                isOpen={!!selectedRegistration} 
                onOpenChange={() => setSelectedRegistration(null)}
                registration={selectedRegistration}
                eventFields={event.formFields || []}
            />
        </>
    );
}

export default function EventRegistrationsPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const eventId = params.eventId as string;

    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const eventRef = useMemoFirebase(() => eventId ? doc(db, 'events', eventId) : null, [eventId]);
    const registrationsRef = useMemoFirebase(() => eventId ? collection(db, 'events', eventId, 'registrations') : null, [eventId]);

    const { data: event, isLoading: isEventLoading, mutate: mutateEvent } = useDoc<Event>(eventRef);
    const { data: registrations, isLoading: areRegistrationsLoading } = useCollection<Registration>(registrationsRef);

    const form = useForm<z.infer<typeof eventFormSchema>>({
        resolver: zodResolver(eventFormSchema),
    });

    useEffect(() => {
        if (event) {
            const deadlineDate = event.registrationDeadline?.toDate ? event.registrationDeadline.toDate() : new Date(event.registrationDeadline);
            form.reset({
                title: event.title,
                description: event.description,
                registrationDeadline: deadlineDate.toISOString().slice(0, 16),
                capacity: event.capacity,
                allowExternalRegistrations: event.allowExternalRegistrations,
                formFields: event.formFields?.map(f => ({ ...f, options: f.options?.map(o => ({ value: o })) || [] })) || [],
            });
        }
    }, [event, form]);


    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "formFields"
    });
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ variant: 'primary', title: 'Kopieret!', description: 'Linket er kopieret til din udklipsholder.' });
    };

    const handleDeleteEvent = async () => {
        if (!event) return;
        try {
            await deleteDoc(doc(db, 'events', event.id));
            toast({ variant: 'primary', title: 'Begivenhed slettet' });
            router.push('/admin/announcements');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke slette begivenhed.' });
        }
    };

    const handleUpdateEvent = async (values: z.infer<typeof eventFormSchema>) => {
        if (!event) return;
        setIsSubmitting(true);
        try {
            const updatedData = {
                ...values,
                registrationDeadline: new Date(values.registrationDeadline),
                formFields: values.formFields?.map(f => ({ ...f, options: f.options?.map(o => o.value) || [] })) || [],
            };
            await updateDoc(doc(db, 'events', event.id), updatedData);
            toast({ variant: 'primary', title: 'Begivenhed opdateret' });
            setIsEditModalOpen(false);
            mutateEvent(); 
        } catch (error) {
            toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke opdatere begivenhed.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoading = isEventLoading || areRegistrationsLoading;

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="container mx-auto py-8 text-center">
                 <Button variant="ghost" onClick={() => router.push('/admin/announcements')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Tilbage til Oversigt
                </Button>
                <p>Begivenhed ikke fundet.</p>
            </div>
        );
    }
    
    const registrationLink = event.allowExternalRegistrations ? `${window.location.origin}/events/${event.id}/register` : null;

    return (
        <div className="container mx-auto py-8">
            <Button variant="ghost" onClick={() => router.push('/admin/announcements')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4"/> Tilbage til Oversigt
            </Button>
            <PageHeader 
                title={event.title}
                description={`Viser tilmeldinger for denne begivenhed.`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" /> Rediger
                        </Button>
                        <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Slet
                        </Button>
                    </div>
                }
            />
            
            {registrationLink && (
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Offentligt Tilmeldingslink</CardTitle>
                        <CardDescription>Del dette link for at tillade folk uden for appen at tilmelde sig.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            <Input value={registrationLink} readOnly />
                            <Button type="button" size="sm" onClick={() => copyToClipboard(registrationLink)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Kopiér
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Tilmeldinger</CardTitle>
                    {event.capacity > 0 ? (
                        <CardDescription>{registrations?.length || 0} / {event.capacity} pladser udfyldt.</CardDescription>
                    ) : (
                        <CardDescription>{registrations?.length || 0} tilmeldt (ubegrænset kapacitet).</CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                   <RegistrationTable registrations={registrations || []} event={event} />
                </CardContent>
            </Card>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Denne handling kan ikke fortrydes. Begivenheden "{event.title}" og alle dens tilmeldinger vil blive slettet permanent.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuller</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90">Slet</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle>Rediger Begivenhed</DialogTitle>
                        <DialogDescription>Opdater detaljerne for begivenheden og tilmeldingsformularen.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow overflow-hidden">
                      <ScrollArea className="h-full">
                        <div className="px-6">
                            <Form {...form}>
                                <form id="edit-event-form" onSubmit={form.handleSubmit(handleUpdateEvent)} className="space-y-6 pt-4 pb-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="title" render={({ field }) => (
                                            <FormItem><FormLabel>Titel</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="description" render={({ field }) => (
                                            <FormItem className="md:col-span-2"><FormControl><RichTextarea label="Beskrivelse" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="registrationDeadline" render={({ field }) => (
                                            <FormItem><FormLabel>Tilmeldingsfrist</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField
                                          control={form.control}
                                          name="capacity"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Kapacitet (0 for ubegrænset)</FormLabel>
                                              <FormControl><Input type="number" {...field} /></FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                    </div>
                                    <FormField control={form.control} name="allowExternalRegistrations" render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Tillad Eksterne Tilmeldinger</FormLabel>
                                                <FormDescription>Generer et offentligt link, så folk uden app-konto kan tilmelde sig.</FormDescription>
                                            </div>
                                        </FormItem>
                                    )}/>
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium">Formularbygger</h3>
                                        <div className="space-y-4">
                                            {fields.map((field, index) => <FormFieldBuilder key={field.id} index={index} remove={remove} />)}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), label: '', type: 'text', required: true })}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Tilføj Tekstfelt
                                            </Button>
                                            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), label: '', type: 'radio', required: true, options: [{value: ''}] })}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Enkeltvalg
                                            </Button>
                                            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), label: '', type: 'checkbox', required: true, options: [{value: ''}], maxSelections: 1 })}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Flere valg
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </Form>
                          </div>
                        </ScrollArea>
                    </div>
                    <DialogFooter className="flex-shrink-0 border-t p-6 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Annuller</Button>
                        <Button type="submit" form="edit-event-form" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Gem Ændringer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
