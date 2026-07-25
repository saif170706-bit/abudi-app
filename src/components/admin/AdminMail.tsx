'use client';

import { useState, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { 
  collection, 
  doc, 
  deleteDoc, 
  updateDoc, 
} from 'firebase/firestore';
import { 
  Loader2, 
  Trash2, 
  ChevronRight, 
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Phone,
  Mail
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getInitials, cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { useHaptic } from 'use-haptic';
import { useMembersData, type CombinedUser } from '@/hooks/use-members-data';
import { useAdminMail } from '@/hooks/use-admin-mail';
import { restoreAccount, deleteUser } from '@/lib/user';

export default function AdminMail() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();
  
  // Use pre-fetched data from background hooks
  const { members, isLoading: isMembersLoading, mutate: mutateMembers } = useMembersData();
  const { messages, isLoading: isMessagesLoading, mutate: mutateMessages } = useAdminMail();

  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  // Find the sender's profile to get the phone number if available
  const senderProfile = useMemo(() => {
    if (!selectedMessage || !members) return null;
    const uid = selectedMessage.userId || selectedMessage.uid;
    return members.find(m => m.uid === uid);
  }, [selectedMessage, members]);

  // Filter Members for Deletion Requests
  const deletionRequests = useMemo(() => {
    return members.filter(m => m.status === 'Afventer Sletning');
  }, [members]);

  const handleDeleteMessage = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!firestore || !id) return;
    triggerHaptic();
    setIsDeleting(id);
    try {
      await deleteDoc(doc(firestore, 'contactMessages', id));
      toast({ variant: 'primary', title: 'Besked slettet' });
      mutateMessages();
      if (selectedMessage?.id === id) setSelectedMessage(null);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Fejl' });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (!firestore || !id) return;
    try {
      await updateDoc(doc(firestore, 'contactMessages', id), { isRead: true });
      mutateMessages();
    } catch (e) {}
  };

  const handleCall = (number: string | null | undefined) => {
    triggerHaptic();
    if (!number) {
      toast({ variant: 'destructive', title: 'Intet nummer fundet', description: 'Brugeren har ikke oplyst et telefonnummer.' });
      return;
    }
    window.location.href = `tel:${number}`;
  };

  const handleEmail = (email: string | null | undefined) => {
    triggerHaptic();
    if (!email) return;
    window.location.href = `mailto:${email}`;
  };

  const handleRestore = async (u: CombinedUser) => {
    if (!u || !u.uid) return;
    setIsRestoring(u.uid);
    triggerHaptic();
    try {
      await restoreAccount(u.uid, u.role);
      toast({ variant: 'primary', title: 'Konto gendannet' });
      mutateMembers();
      if (selectedMessage?.uid === u.uid) setSelectedMessage(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Fejl ved gendannelse' });
    } finally {
      setIsRestoring(null);
    }
  };

  const handleFinalDelete = async (u: CombinedUser) => {
    if (!u || !u.uid) return;
    setIsDeleting(u.uid);
    triggerHaptic();
    try {
      await deleteUser(u.uid);
      toast({ variant: 'primary', title: 'Konto slettet permanent' });
      mutateMembers();
      if (selectedMessage?.uid === u.uid) setSelectedMessage(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Fejl ved sletning' });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="px-4 pt-10 pb-32 sm:px-6 max-w-4xl mx-auto">
      <div className="mb-10">
        <p className="text-lg text-muted-foreground">Admin</p>
        <h1 className="text-[38px] leading-[1.05] font-semibold tracking-tight text-foreground">
          Indbakke
        </h1>
      </div>

      <Tabs defaultValue="inbox" className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted p-1 rounded-2xl">
          <TabsTrigger value="inbox" className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
            Indbakke {(messages?.filter(m => !m.isRead).length || 0) > 0 && <Badge className="h-5 px-1.5 bg-primary text-primary-foreground border-none">{messages?.filter(m => !m.isRead).length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
            Anmodninger {deletionRequests.length > 0 && <Badge className="h-5 px-1.5 bg-red-500 text-white border-none">{deletionRequests.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-3 outline-none">
          {isMessagesLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>
          ) : messages?.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <Inbox className="h-12 w-12 text-black/10" />
              <p className="text-muted-foreground font-medium">Ingen beskeder fundet.</p>
            </div>
          ) : (
            messages?.map(msg => (
              <Card 
                key={msg.id}
                onClick={() => { triggerHaptic(); setSelectedMessage({ ...msg, type: 'message' }); handleMarkAsRead(msg.id); }}
                className={cn(
                  "rounded-[24px] border border-border bg-card shadow-sm overflow-hidden transition-all active:scale-[0.99] cursor-pointer",
                  !msg.isRead ? "ring-1 ring-primary/20 bg-primary/[0.01]" : ""
                )}
              >
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarFallback className="bg-muted text-xs font-bold">{getInitials(msg.userName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-[16px] truncate", !msg.isRead ? "font-extrabold text-foreground" : "font-bold text-muted-foreground")}>{msg.userName}</p>
                        {!msg.isRead && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium truncate">{msg.subject}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="text-[10px] font-bold text-black/20 uppercase">
                      {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) : '...'}
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-20" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-3 outline-none">
          {isMembersLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>
          ) : deletionRequests.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-primary/20" />
              <p className="text-muted-foreground font-medium">Ingen sletningsanmodninger.</p>
            </div>
          ) : (
            deletionRequests.map(req => (
              <Card 
                key={req.uid}
                onClick={() => { triggerHaptic(); setSelectedMessage({ ...req, type: 'deletion' }); }}
                className="rounded-[24px] border border-red-100 bg-red-50/10 shadow-sm overflow-hidden transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar className="h-12 w-12 border border-red-100">
                      <AvatarImage src={req.photoURL || undefined} />
                      <AvatarFallback className="bg-red-50 text-red-600 text-xs font-bold">{getInitials(req.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[16px] font-extrabold text-red-900 truncate">{req.displayName}</p>
                      <p className="text-xs text-red-700/60 font-medium uppercase tracking-tight">Anmodning om sletning</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="text-[10px] font-bold text-red-400 uppercase">
                      {req.deletionRequestedAt?.toDate ? req.deletionRequestedAt.toDate().toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) : '...'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-red-300" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Message/Request Detail Sheet */}
      <FullscreenSheet
        open={!!selectedMessage}
        onOpenChange={(o) => !o && setSelectedMessage(null)}
        title={selectedMessage?.type === 'deletion' ? 'Sletningsanmodning' : 'Besked'}
        rightSlot={<button onClick={() => setSelectedMessage(null)} className="p-2"><X className="h-6 w-6 opacity-40" /></button>}
      >
        {selectedMessage && (
          <div className="p-6 space-y-8 pb-32">
            <div className="flex flex-col items-center gap-4 text-center">
              <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                <AvatarImage src={selectedMessage.photoURL || senderProfile?.photoURL || undefined} />
                <AvatarFallback className="text-2xl font-bold">{getInitials(selectedMessage.userName || selectedMessage.displayName)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h2 className="text-3xl font-extrabold font-headline">{selectedMessage.userName || selectedMessage.displayName}</h2>
                <p className="text-sm text-muted-foreground font-medium">{selectedMessage.userEmail || selectedMessage.email}</p>
                {selectedMessage.type === 'deletion' && (
                  <Badge className="bg-red-500 text-white border-none mt-2 font-bold uppercase text-[10px] tracking-[0.1em]">AFVENTER SLETNING</Badge>
                )}
              </div>
            </div>

            {/* Quick Contact Actions */}
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => handleCall(senderProfile?.phoneNumber || selectedMessage.phoneNumber)}
                className="h-14 flex-1 rounded-2xl border-border bg-card shadow-sm font-bold gap-3 text-blue-600 hover:bg-blue-50"
              >
                <Phone className="h-5 w-5" />
                Ring op
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleEmail(selectedMessage.userEmail || selectedMessage.email)}
                className="h-14 flex-1 rounded-2xl border-border bg-card shadow-sm font-bold gap-3 text-purple-600 hover:bg-purple-50"
              >
                <Mail className="h-5 w-5" />
                Skriv Mail
              </Button>
            </div>

            <Card className="rounded-[32px] border-none bg-card shadow-sm p-6 space-y-6">
              {selectedMessage.type === 'message' ? (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Emne</p>
                    <p className="text-lg font-bold text-foreground">{selectedMessage.subject || 'Intet emne'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Besked</p>
                    <p className="text-[17px] font-medium text-foreground/80 leading-relaxed whitespace-pre-wrap">{selectedMessage.message || 'Ingen besked'}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Årsag til sletning</p>
                    <p className="text-[17px] font-bold text-red-900 leading-relaxed italic">
                      "{selectedMessage.deletionReason || 'Ingen årsag angivet'}"
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900 font-medium leading-relaxed">
                      Brugerens konto er i øjeblikket låst. Du kan enten gendanne den eller slette den permanent.
                    </p>
                  </div>
                </>
              )}
            </Card>

            <div className="flex flex-col gap-3 pt-4">
              {selectedMessage.type === 'deletion' ? (
                <>
                  <Button 
                    onClick={() => handleRestore(selectedMessage)} 
                    disabled={isRestoring === selectedMessage.uid}
                    className="h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20"
                  >
                    {isRestoring === selectedMessage.uid ? <Loader2 className="h-6 w-6 animate-spin" /> : <RotateCcw className="h-6 w-6 mr-2" />}
                    Gendan Konto
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => handleFinalDelete(selectedMessage)}
                    disabled={isDeleting === (selectedMessage.uid || selectedMessage.id)}
                    className="h-16 rounded-2xl font-bold text-lg text-red-600 bg-red-50 border border-red-100 hover:bg-red-100"
                  >
                    {isDeleting === (selectedMessage.uid || selectedMessage.id) ? <Loader2 className="h-6 w-6 animate-spin" /> : <Trash2 className="h-6 w-6 mr-2" />}
                    Slet Permanent
                  </Button>
                </>
              ) : (
                <Button 
                  variant="ghost" 
                  onClick={(e) => handleDeleteMessage(e, selectedMessage.id)}
                  disabled={selectedMessage && isDeleting === selectedMessage.id}
                  className="h-16 rounded-2xl font-bold text-lg text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 shadow-sm"
                >
                  {selectedMessage && isDeleting === selectedMessage.id ? <Loader2 className="h-6 w-6 animate-spin" /> : <Trash2 className="h-6 w-6 mr-2" />}
                  Slet Besked
                </Button>
              )}
            </div>
          </div>
        )}
      </FullscreenSheet>
    </div>
  );
}
