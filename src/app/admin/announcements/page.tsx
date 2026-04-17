'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useUser, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { Loader2, ArrowLeft, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Announcement as AnnouncementType } from '@/types';
import type { Event as EventType } from '@/types';
import AdminEventCard from '@/components/admin/AdminEventCard';
import RichTextarea from '@/components/ui/rich-textarea';
import RichRender from '@/components/ui/rich-render';
import { ScrollArea } from '@/components/ui/scroll-area';

const announcementSchema = z.object({
  title: z.string().min(1, 'Titel er påkrævet.'),
  content: z.string().min(1, { message: 'Indhold er påkrævet.'}),
});

type FeedItem = (AnnouncementType & { itemType: 'announcement' }) | (EventType & { itemType: 'event' });

export default function AdminAnnouncementsPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const [announcementToDelete, setAnnouncementToDelete] = useState<AnnouncementType | null>(null);
  const [announcementToEdit, setAnnouncementToEdit] = useState<AnnouncementType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
  });

  useEffect(() => {
    if (announcementToEdit) {
      form.reset({
        title: announcementToEdit.title,
        content: announcementToEdit.content,
      });
    }
  }, [announcementToEdit, form]);

  const announcementsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc')) : null), [firestore]);
  const eventsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'events'), orderBy('createdAt', 'desc')) : null), [firestore]);

  const { data: allAnnouncements, isLoading: loadingAnnouncements } = useCollection<AnnouncementType>(announcementsQuery);
  const { data: allEvents, isLoading: loadingEvents } = useCollection<EventType>(eventsQuery);

  const feedItems = useMemo((): FeedItem[] => {
    const announcements: FeedItem[] = (allAnnouncements || []).map(ann => ({ ...ann, itemType: 'announcement' }));
    const events: FeedItem[] = (allEvents || []).map(evt => ({ ...evt, itemType: 'event' }));
    const combined = [...announcements, ...events];
    return combined.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [allAnnouncements, allEvents]);

  const handleDeleteAnnouncement = async () => {
    if (!announcementToDelete || !firestore) return;
    try {
      await deleteDoc(doc(firestore, 'announcements', announcementToDelete.id));
      toast({ variant: 'primary', title: 'Meddelelse slettet' });
      setAnnouncementToDelete(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke slette meddelelse.' });
    }
  };

  const handleEditAnnouncement = async (values: z.infer<typeof announcementSchema>) => {
    if (!announcementToEdit || !firestore) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(firestore, 'announcements', announcementToEdit.id);
      await updateDoc(docRef, {
        title: values.title,
        content: values.content,
      });
      toast({ variant: 'primary', title: 'Meddelelse opdateret' });
      setAnnouncementToEdit(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke opdatere meddelelse.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = loadingAnnouncements || loadingEvents;

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" onClick={() => router.push('/admin')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Tilbage til Admin Dashboard
      </Button>
      <PageHeader
        title="Administrer Meddelelser & Begivenheder"
        description="Rediger eller slet opslag, og administrer begivenheder."
      />
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      ) : feedItems.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="text-xl font-semibold font-headline">Ingen Opslag</h3>
          <p className="mt-1 text-sm text-muted-foreground">Der er ingen meddelelser eller begivenheder at vise.</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl mx-auto">
          {feedItems.map(item => {
            if (item.itemType === 'event') {
              return <AdminEventCard key={item.id} event={item} />;
            } else {
              return (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="font-headline text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[300px] overflow-y-auto">
                     <RichRender value={item.content} />
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-4">
                     <CardDescription>
                      Sendt af {item.authorName} den {item.createdAt.toDate().toLocaleDateString('da-DK')}
                    </CardDescription>
                    <div className="flex justify-end gap-2 w-full">
                        <Button variant="outline" size="sm" onClick={() => setAnnouncementToEdit(item)}>
                        <Edit className="mr-2 h-4 w-4" /> Rediger
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setAnnouncementToDelete(item)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Slet
                        </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            }
          })}
        </div>
      )}

      {/* Edit Announcement Dialog */}
      <Dialog open={!!announcementToEdit} onOpenChange={() => setAnnouncementToEdit(null)}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Rediger Meddelelse</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full">
                <Form {...form}>
                    <form id="edit-announcement-form" onSubmit={form.handleSubmit(handleEditAnnouncement)} className="space-y-4 px-6 pt-4 pb-6">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Titel</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="content" render={({ field }) => (
                        <FormItem><FormControl><RichTextarea label="Indhold" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                    )} />
                    </form>
                </Form>
            </ScrollArea>
          </div>
          <DialogFooter className="flex-shrink-0 border-t p-6 pt-4">
            <Button type="button" variant="outline" onClick={() => setAnnouncementToEdit(null)}>Annuller</Button>
            <Button type="submit" form="edit-announcement-form" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Gem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Announcement Alert */}
      <AlertDialog open={!!announcementToDelete} onOpenChange={() => setAnnouncementToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Denne handling kan ikke fortrydes. Meddelelsen "{announcementToDelete?.title}" vil blive slettet permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAnnouncement} className="bg-destructive hover:bg-destructive/90">
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    