'use client';

import { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { 
  Loader2, 
  UserPlus, 
  Trash2, 
  Phone, 
  Mail, 
  ChevronRight, 
  X,
  BookOpen,
  History,
  Copy,
  Users,
  ArrowLeft
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import { getInitials, cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { useHaptic } from 'use-haptic';
import { useView } from '@/context/ViewContext';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

export default function AdminWaitingList() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();
  const { language } = useLanguage();
  const { setView } = useView();
  const { tGlobal } = useGlobalTranslation();

  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const waitingListQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'waitingList'), orderBy('createdAt', 'asc')) : null),
    [firestore]
  );

  const { data: entries, isLoading } = useCollection<any>(waitingListQuery);

  const menQueue = useMemo(() => entries?.filter(e => e.gender === 'man') || [], [entries]);
  const womenQueue = useMemo(() => entries?.filter(e => e.gender === 'woman') || [], [entries]);

  const copyRegisterLink = () => {
    triggerHaptic();
    const link = `${window.location.origin}/waiting-list/register`;
    navigator.clipboard.writeText(link);
    toast({ variant: 'primary', title: tGlobal('Link kopieret!'), description: tGlobal('Linket til venteliste-formularen er kopieret.') });
  };

  const handleDelete = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    if (!firestore) return;
    triggerHaptic();
    setIsDeleting(entryId);
    try {
      await deleteDoc(doc(firestore, 'waitingList', entryId));
      toast({ variant: 'primary', title: tGlobal('Fjernet fra venteliste') });
      if (selectedEntry?.id === entryId) setSelectedEntry(null);
    } catch (err) {
      toast({ variant: 'destructive', title: tGlobal('Fejl'), description: tGlobal('Kunne ikke fjerne personen.') });
    } finally {
      setIsDeleting(null);
    }
  };

  const renderQueueItem = (entry: any, index: number) => {
    const isFirst = index === 0;
    return (
      <Card 
        key={entry.id}
        onClick={() => { triggerHaptic(); setSelectedEntry(entry); }}
        className={cn(
          "rounded-3xl border border-border bg-card shadow-sm overflow-hidden transition-all active:scale-[0.99] cursor-pointer",
          isFirst ? "ring-2 ring-primary/20 bg-primary/[0.01]" : ""
        )}
      >
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarFallback className="bg-muted text-xs font-bold">{getInitials(entry.name)}</AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white",
                isFirst ? "bg-primary" : "bg-black/20"
              )}>
                {index + 1}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[16px] font-bold text-foreground truncate">{entry.name}</p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                {entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleDateString(language === 'da' ? 'da-DK' : language === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' }) : '...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isFirst && (
              <Badge className="bg-primary/10 text-primary border-none font-bold text-[10px] h-7 px-3">
                {tGlobal('NÆSTE')}
              </Badge>
            )}
            <ChevronRight className="h-5 w-5 opacity-20" />
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="px-4 pt-10 pb-32 sm:px-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-10">
        <div className="flex items-start gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { triggerHaptic(); setView('admin-members'); }}
            className="rounded-2xl h-12 w-12 bg-card border border-border shadow-sm text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <p className="text-lg text-muted-foreground">{tGlobal('Admin')}</p>
            <h1 className="text-[38px] leading-[1.05] font-semibold tracking-tight text-foreground">
              {tGlobal('Venteliste')}
            </h1>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={copyRegisterLink}
          className="rounded-2xl h-12 w-12 bg-card border border-border shadow-sm text-primary hover:bg-muted"
          title={tGlobal('Kopier tilmeldingslink')}
        >
          <Copy className="h-6 w-6" />
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>
      ) : (
        <Tabs defaultValue="men" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-muted p-1 rounded-2xl">
            <TabsTrigger value="men" className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
              {tGlobal('Mænd')} <Badge variant="secondary" className="bg-black/5 text-muted-foreground border-none h-5 px-1.5">{menQueue.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="women" className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
              {tGlobal('Kvinder')} <Badge variant="secondary" className="bg-black/5 text-muted-foreground border-none h-5 px-1.5">{womenQueue.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="men" className="space-y-3 outline-none">
            {menQueue.length > 0 ? menQueue.map((e, i) => renderQueueItem(e, i)) : (
              <div className="py-20 text-center text-muted-foreground">{tGlobal('Ingen mænd på ventelisten.')}</div>
            )}
          </TabsContent>

          <TabsContent value="women" className="space-y-3 outline-none">
            {womenQueue.length > 0 ? womenQueue.map((e, i) => renderQueueItem(e, i)) : (
              <div className="py-20 text-center text-muted-foreground">{tGlobal('Ingen kvinder på ventelisten.')}</div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Entry Detail Sheet */}
      <FullscreenSheet
        open={!!selectedEntry}
        onOpenChange={(o) => !o && setSelectedEntry(null)}
        title={selectedEntry?.name}
        rightSlot={<button onClick={() => setSelectedEntry(null)} className="p-2"><X className="h-6 w-6 opacity-40" /></button>}
      >
        <div className="p-6 space-y-8 pb-32">
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar className="h-24 w-24 border-4 border-white shadow-sm">
              <AvatarFallback className="text-2xl font-bold">{getInitials(selectedEntry?.name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-3xl font-extrabold font-headline">{selectedEntry?.name}</h2>
              <p className="text-muted-foreground font-medium">{selectedEntry?.email}</p>
              <div className="flex justify-center gap-2 mt-2">
                <Badge className={cn("px-3 h-6 border-none font-bold uppercase text-[9px] tracking-widest", selectedEntry?.gender === 'man' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600')}>
                  {selectedEntry?.gender === 'man' ? tGlobal('Mand') : tGlobal('Kvinde')}
                </Badge>
                <Badge variant="outline" className="px-3 h-6 border-border text-muted-foreground font-bold uppercase text-[9px] tracking-widest">
                  {selectedEntry?.createdAt?.toDate ? selectedEntry.createdAt.toDate().toLocaleDateString(language === 'da' ? 'da-DK' : language === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '...'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" /> {tGlobal('Rediger')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-black/20 uppercase mb-1">{tGlobal('Læsning')}</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{selectedEntry?.readingLevel || tGlobal('Ikke angivet')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-black/20 uppercase mb-1">{tGlobal('Memorering')}</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{selectedEntry?.memorizingLevel || tGlobal('Ikke angivet')}</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Users className="h-3.5 w-3.5" /> {tGlobal('Medlemmer')}
              </h3>
              <div className="space-y-3">
                <a href={`tel:${selectedEntry?.phoneNumber}`} className="flex items-center gap-4 group">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 group-active:scale-95 transition-transform"><Phone className="h-5 w-5" /></div>
                  <span className="font-bold text-foreground">{selectedEntry?.phoneNumber}</span>
                </a>
                <a href={`mailto:${selectedEntry?.email}`} className="flex items-center gap-4 group">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600 group-active:scale-95 transition-transform"><Mail className="h-5 w-5" /></div>
                  <span className="font-bold text-foreground">{selectedEntry?.email}</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button 
              variant="destructive" 
              className="h-16 rounded-2xl font-bold text-lg shadow-lg shadow-red-500/10"
              disabled={!!isDeleting}
              onClick={(e) => handleDelete(e, selectedEntry.id)}
            >
              {isDeleting === selectedEntry?.id ? <Loader2 className="h-6 w-6 animate-spin" /> : <Trash2 className="h-6 w-6 mr-2" />}
              {tGlobal('Fjernet fra venteliste')}
            </Button>
          </div>
        </div>
      </FullscreenSheet>
    </div>
  );
}
