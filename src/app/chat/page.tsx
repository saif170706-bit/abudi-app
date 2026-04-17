'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Channel,
  ChannelList,
  MessageInput,
  MessageList,
  Thread,
  Window,
  useChatContext,
  type ChannelPreviewUIComponentProps,
} from 'stream-chat-react';
import type { DefaultGenerics } from 'stream-chat';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { useUser, useFirebase } from '@/firebase';
import { useView } from '@/context/ViewContext';
import { useUnreadSync } from '@/hooks/use-unread-sync';

import NewChatDialog from '@/components/chat/NewChatDialog';

import {
  Loader2,
  Search,
  Plus,
  ArrowLeft,
  VideoIcon,
  Phone,
  PhoneOff,
  LogOut,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

import { doc, writeBatch, onSnapshot, getDoc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// ---------------------------
// Helpers
// ---------------------------
function formatTimeOrDate(dateLike: any) {
  if (!dateLike) return '';
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return d.toLocaleDateString('da-DK');
}

function getOtherMember(channel: any, myId: string | undefined) {
  const members = channel?.state?.members || {};
  const arr = Object.values(members) as any[];
  const other = arr.find((m) => m?.user?.id && m.user.id !== myId);
  return other?.user || null;
}

// ---------------------------
// Calling dialog
// ---------------------------
function CallingDialog({
  isOpen,
  callId,
  onCancel,
  onConnected,
}: {
  isOpen: boolean;
  callId: string;
  onCancel: (reason: 'cancelled' | 'timeout') => void;
  onConnected: () => void;
}) {
  const { firestore } = useFirebase();

  useEffect(() => {
    if (!isOpen || !firestore || !callId) return;

    const callDocRef = doc(firestore, 'activeCalls', callId);

    const unsubscribe = onSnapshot(callDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data?.members) && data.members.length > 1) {
          onConnected();
        }
      }
    });

    const timeoutId = setTimeout(() => onCancel('timeout'), 30000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [isOpen, callId, firestore, onCancel, onConnected]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel('cancelled')}>
      <DialogContent hideCloseButton={true} className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center font-headline text-2xl">Calling...</DialogTitle>
          <DialogDescription className="text-center">
            Waiting for the other user to join.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center py-8">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <div className="absolute inset-0 scale-100 animate-pulse rounded-full bg-primary/20" />
            <Phone className="h-10 w-10 text-primary" />
          </div>
        </div>
        <div className="flex justify-center">
          <Button variant="destructive" onClick={() => onCancel('cancelled')}>
            <PhoneOff className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------
// Channel preview item
// ---------------------------
function ChatPreview(props: ChannelPreviewUIComponentProps<DefaultGenerics>) {
  const { tGlobal } = useGlobalTranslation();

  const { channel, setActiveChannel, activeChannel, unread } = props;
  const { user } = useUser();
  const isActive = activeChannel?.id === channel.id;

  const other = getOtherMember(channel, user?.uid);

  const title: string =
    (channel.data?.name as string | undefined) ||
    (other?.name as string | undefined) ||
    'Chat';

  const subtitle1: string | undefined = (other?.email as string | undefined) || undefined;

  const lastMsgText: string =
    (channel.state?.messages?.[channel.state.messages.length - 1]?.text as string | undefined) ||
    ' ';

  const lastAt =
    channel.state?.last_message_at ||
    channel.data?.last_message_at ||
    channel.data?.updated_at;

  const timeText = formatTimeOrDate(lastAt);

  const avatarUrl: string | undefined =
    (channel.data?.image as string | undefined) ||
    (other?.image as string | undefined) ||
    undefined;

  const unreadCount = unread ?? 0;

  return (
    <button
      onClick={() => setActiveChannel(channel)}
      className={[
        'w-full text-left',
        'px-4 py-4',
        'transition-colors',
        isActive ? 'bg-muted' : 'hover:bg-muted',
      ].join(' ')}
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarUrl} alt={title} />
          <AvatarFallback>{getInitials(title)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[18px] font-semibold text-foreground">{title}</div>
              {subtitle1 ? (
                <div className="truncate text-[14px] text-muted-foreground">{subtitle1}</div>
              ) : null}
            </div>

            <div className="shrink-0 text-[14px] text-muted-foreground">{timeText}</div>
          </div>

          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="truncate text-[15px] text-muted-foreground">{lastMsgText}</div>

            {unreadCount > 0 ? (
              <div className="ml-3 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#E24B4B] px-2 text-[14px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function PrettyEmptyChat({
  name,
  photoURL,
}: {
  name: string;
  photoURL?: string;
}) {
  const { tGlobal } = useGlobalTranslation();

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-background p-8 text-center shadow-[0_10px_30px_rgba(17,18,20,0.10)]">
        <Avatar className="mx-auto h-20 w-20">
          <AvatarImage src={photoURL} alt={name} />
          <AvatarFallback className="text-2xl">{getInitials(name)}</AvatarFallback>
        </Avatar>

        <h3 className="mt-4 text-[20px] font-semibold text-foreground">{name}</h3>

        <p className="mt-2 text-[14px] text-muted-foreground">
          Start samtalen ved at sende den første besked 👋
        </p>
      </div>
    </div>
  );
}

// ---------------------------
// Page
// ---------------------------
export default function ChatPage() {
  const { tGlobal } = useGlobalTranslation();

  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { setIsSubView } = useView();

  const [isLeaveAlertOpen, setIsLeaveAlertOpen] = useState(false);
  const { channel, setActiveChannel } = useChatContext();

  const syncUnread = useUnreadSync();

  useEffect(() => {
    setIsSubView(!!channel);
    if (channel) {
      channel.markRead();
      syncUnread();
    }
  }, [channel, setIsSubView, syncUnread]);

  useEffect(() => {
    setActiveChannel(undefined);
  }, [setActiveChannel]);

  const [searchTerm, setSearchTerm] = useState('');

  const filters = useMemo(
    () => ({
      members: { $in: [user?.uid as string] },
      type: { $in: ['messaging', 'team'] },
    }),
    [user?.uid]
  );

  const sort = useMemo(() => ({ last_message_at: -1 as const }), []);
  const options = useMemo(() => ({ presence: true, state: true }), []);

  // ----- Call state -----
  const [callingState, setCallingState] = useState<{
    open: boolean;
    callId: string | null;
    recipientId: string | null;
  }>({ open: false, callId: null, recipientId: null });

  const handleCall = async () => {
    if (!channel || !user?.uid || !firestore) return;

    const callId = channel.id;
    const members = Object.keys(channel.state.members || {});
    const otherUserIds = members.filter((id) => id !== user.uid);
    const isGroupCall = members.length > 2;

    if (otherUserIds.length === 0) {
      toast({ title: 'Cannot start call', description: 'You are the only one in this chat.' });
      return;
    }

    const batch = writeBatch(firestore);
    const callInfo = {
      callId,
      from: user.uid,
      fromName: user.displayName || 'Someone',
      channelId: channel.id,
      channelType: channel.type,
    };

    otherUserIds.forEach((userId) => {
      const inviteRef = doc(firestore, 'callInvites', userId);
      batch.set(inviteRef, callInfo);
    });

    const callDocRef = doc(firestore, 'activeCalls', callId);
    batch.set(callDocRef, { members: [user.uid] });

    batch.commit().catch(() => {
      const permissionError = new FirestorePermissionError({
        path: 'batch write for call invite',
        operation: 'write',
      });
      errorEmitter.emit('permission-error', permissionError);
    });

    if (isGroupCall) {
      router.push(`/video/${callId}`);
    } else {
      setCallingState({
        open: true,
        callId,
        recipientId: otherUserIds[0],
      });
    }
  };

  const handleLeaveChat = async () => {
    if (!channel || !user?.uid) return;

    setIsLeaveAlertOpen(false); // Close dialog immediately to prevent UI blocking
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/stream/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          channelId: channel.id,
          channelType: channel.type,
          userName: user.displayName || 'En bruger',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Could not leave chat");
      }
      
      setActiveChannel(undefined);
      toast({
        title: "Chat forladt",
        description: "Du er blevet fjernet fra samtalen.",
      });
    } catch (error: any) {
      console.error("Error leaving chat:", error);
      toast({
        variant: "destructive",
        title: "Fejl",
        description: error.message || "Kunne ikke forlade chatten.",
      });
    }
  };


  const cancelCall = async (reason: 'cancelled' | 'timeout') => {
    if (!callingState.callId || !callingState.recipientId || !firestore) return;

    const inviteDocRef = doc(firestore, 'callInvites', callingState.recipientId);
    deleteDoc(inviteDocRef).catch(console.error);

    const callDocRef = doc(firestore, 'activeCalls', callingState.callId);

    try {
      const callDocSnap = await getDoc(callDocRef);
      const members = callDocSnap.exists() ? callDocSnap.data()?.members : null;

      if (Array.isArray(members) && members.length === 1) {
        deleteDoc(callDocRef).catch(() => {
          const permissionError = new FirestorePermissionError({
            path: callDocRef.path,
            operation: 'delete',
          });
          errorEmitter.emit('permission-error', permissionError);
        });
      }
    } catch (e) {
      console.error('Error checking activeCall doc:', e);
      const permissionError = new FirestorePermissionError({
        path: callDocRef.path,
        operation: 'get',
      });
      errorEmitter.emit('permission-error', permissionError);
    }

    setCallingState({ open: false, callId: null, recipientId: null });

    if (reason === 'timeout') {
      toast({ title: 'No Answer', description: 'The user did not answer.' });
    } else {
      toast({ title: 'Call Cancelled' });
    }
  };

  const onCallConnected = () => {
    if (!callingState.callId) return;
    const callId = callingState.callId;
    setCallingState({ open: false, callId: null, recipientId: null });
    router.push(`/video/${callId}`);
  };

  const other = channel ? getOtherMember(channel, user?.uid) : null;
  const title = channel ? ((channel.data?.name as string | undefined) || (other?.name as string | undefined) || 'Chat') : '';
  const emailLine = other?.email ? String(other.email) : '';
  const otherName = (other?.name as string | undefined) || title;
  const otherPhoto = (other?.image as string | undefined) || undefined;
  const isDM = channel ? !channel.data?.name : false;

  if (userLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-background relative">
      <CallingDialog
        isOpen={callingState.open}
        callId={callingState.callId || ''}
        onCancel={cancelCall}
        onConnected={onCallConnected}
      />
      
      <AlertDialog open={isLeaveAlertOpen} onOpenChange={setIsLeaveAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forlad chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Du bliver fjernet fra samtalen og modtager ikke flere beskeder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveChat}
              className="bg-destructive hover:bg-destructive/90"
            >
              Forlad
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!channel ? (
        <div className="flex-1 px-4 pt-10 sm:px-6">
          <div className="flex items-start justify-between">
            <h1 className="text-[44px] leading-[1.05] font-semibold tracking-tight text-foreground">
              Chats
            </h1>

            <NewChatDialog>
              <button
                className="mt-1 grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-[0_10px_30px_rgba(17,18,20,0.10)] active:scale-[0.98]"
                aria-label="Start ny chat"
              >
                <Plus className="h-6 w-6" />
              </button>
            </NewChatDialog>
          </div>

          <div className="mt-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={tGlobal("Søg chats...")}
                className="h-14 rounded-2xl pl-12 text-[16px] shadow-[0_10px_30px_rgba(17,18,20,0.06)] border-border bg-card"
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_10px_30px_rgba(17,18,20,0.10)]">
              <ChannelList
                sort={sort}
                filters={filters}
                setActiveChannelOnMount={false}
                Preview={ChatPreview}
                channelRenderFilterFn={(channels) =>
                  channels
                    // client-side "search" filter (simple)
                    .filter((ch) => {
                      const term = searchTerm.trim().toLowerCase();
                      if (!term) return true;

                      const name = (ch.data?.name as string | undefined)?.toLowerCase() || '';
                      const other = getOtherMember(ch, user?.uid);
                      const otherName = (other?.name as string | undefined)?.toLowerCase() || '';
                      const otherEmail = (other?.email as string | undefined)?.toLowerCase() || '';

                      return name.includes(term) || otherName.includes(term) || otherEmail.includes(term);
                    })
                }
                EmptyStateIndicator={() => (
                  <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                    <div className="text-5xl opacity-20 mb-4">💬</div>
                    <div className="text-xl font-semibold text-foreground">Ingen chats endnu</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Tryk på plus for at starte en ny samtale.
                    </div>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className={cn("fixed inset-0 z-[50] flex flex-col bg-transparent overflow-hidden", isDM && "chat--dm")}>
          {/* Subtle Arabic Background Texture specific to the chat messages area */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] mix-blend-multiply dark:mix-blend-screen dark:opacity-[0.03]"
               style={{ 
                 backgroundImage: 'url("https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif")', 
                 backgroundSize: '400px' 
               }} 
          />

          <Channel channel={channel}>
            <Window>
              {/* Premium Floating Header */}
              <div 
                className="absolute left-0 right-0 mx-2 mt-4 z-20 pointer-events-none"
                style={{ top: "env(safe-area-inset-top, 0px)" }}
              >
                <div className="flex items-center justify-between px-3 py-3 gap-3 bg-background/60 backdrop-blur-3xl border border-white/20 dark:border-white/5 rounded-full shadow-[0_10px_40px_rgba(0,-0,0,0.08)] pointer-events-auto">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActiveChannel(undefined)}
                      aria-label="Tilbage"
                      className="rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <ArrowLeft className="h-6 w-6" />
                    </Button>
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="truncate text-base font-bold text-foreground font-headline leading-tight">{title}</div>
                    {emailLine ? (
                      <div className="truncate text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-0.5">{emailLine}</div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={handleCall} className="rounded-xl h-10 border-white/20 shadow-sm font-bold bg-background/50 backdrop-blur-sm">
                      <VideoIcon className="mr-2 h-4 w-4" />
                      Opkald
                    </Button>
                    {!isDM && (
                      <Button variant="destructive" size="sm" onClick={() => setIsLeaveAlertOpen(true)} className="rounded-xl h-10 shadow-sm font-bold shadow-red-500/20">
                        <LogOut className="mr-2 h-4 w-4" />
                        Forlad
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="chat-pattern flex-1 min-h-0 flex flex-col relative z-10 -mt-[72px]">
                <div
                  className="h-full w-full flex flex-col pt-[80px]"
                  style={{
                    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
                  }}
                >
                  <MessageList 
                    EmptyStateIndicator={() => <PrettyEmptyChat name={otherName} photoURL={otherPhoto} />} 
                  />
                </div>

                {/* Premium Floating Input Block */}
                <div
                  className="fixed left-0 right-0 z-50 pointer-events-none"
                  style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
                >
                  <div className="mx-auto w-full max-w-3xl px-2 pointer-events-auto">
                    <div className="bg-background/80 backdrop-blur-3xl border border-white/20 dark:border-white/5 rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.06)] overflow-hidden">
                      <MessageInput />
                    </div>
                  </div>
                </div>
              </div>
            </Window>
            <Thread />
          </Channel>
        </div>
      )}
    </div>
  );
}