'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useUserProfile } from '@/hooks/use-user-profile';

import NewChatDialog from '@/components/chat/NewChatDialog';
import CallingDialog from '@/components/calls/CallingDialog';

import {
  Loader2,
  Search,
  Plus,
  ArrowLeft,
  VideoIcon,
  Phone,
  LogOut,
  ChevronRight,
  ImageIcon,
  X,
} from 'lucide-react';

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

import { doc, writeBatch, getDoc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUnreadSync } from '@/hooks/use-unread-sync';

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

function forceUnlockUi() {
  if (typeof document === 'undefined') return;

  document.body.style.pointerEvents = '';
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
  document.documentElement.style.overflow = '';

  document.querySelectorAll('[data-radix-portal]').forEach((el) => {
    const node = el as HTMLElement;
    node.style.pointerEvents = 'none';
  });
}

async function waitForUiUnlock(timeout = 1200) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const start = Date.now();

  await new Promise<void>((resolve) => {
    const check = () => {
      const bodyPointerLocked = document.body.style.pointerEvents === 'none';
      const bodyOverflowLocked = document.body.style.overflow === 'hidden';
      const htmlOverflowLocked = document.documentElement.style.overflow === 'hidden';

      const portals = Array.from(document.querySelectorAll('[data-radix-portal]'));
      const blockingPortalExists = portals.some((el) => {
        const node = el as HTMLElement;
        const style = window.getComputedStyle(node);
        return style.pointerEvents !== 'none' && style.display !== 'none';
      });

      const locked =
        bodyPointerLocked ||
        bodyOverflowLocked ||
        htmlOverflowLocked ||
        blockingPortalExists;

      if (!locked || Date.now() - start > timeout) {
        resolve();
        return;
      }

      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  });
}

function removeCidFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('cid');
  window.history.replaceState({}, '', url.pathname + (url.search || ''));
}

// ---------------------------
// Media & Files View
// ---------------------------
function MediaGallery({ channel }: { channel: any }) {
  const attachments = useMemo(() => {
    return channel?.state?.messages?.flatMap((m: any) => m.attachments || []) || [];
  }, [channel?.state?.messages]);

  const images = attachments.filter((a: any) => a.type === 'image');
  const files = attachments.filter((a: any) => a.type === 'file');

  const links = useMemo(() => {
    return (channel?.state?.messages || [])
      .filter((m: any) => m.text && (m.text.includes('http://') || m.text.includes('https://')))
      .map((m: any) => ({
        id: m.id,
        text: m.text,
        url: m.text.match(/(https?:\/\/[^\s]+)/g)?.[0] || '#',
        at: m.created_at,
      }));
  }, [channel?.state?.messages]);

  return (
    <Tabs defaultValue="media" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted p-1 rounded-2xl h-12">
        <TabsTrigger
          value="media"
          className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
        >
          Billeder
        </TabsTrigger>
        <TabsTrigger
          value="docs"
          className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
        >
          Filer
        </TabsTrigger>
        <TabsTrigger
          value="links"
          className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
        >
          Links
        </TabsTrigger>
      </TabsList>

      <TabsContent value="media" className="grid grid-cols-3 gap-3">
        {images.length > 0 ? (
          images.map((img: any, i: number) => (
            <div
              key={i}
              className="aspect-square relative rounded-2xl overflow-hidden bg-black/5 shadow-sm border border-border"
            >
              <img src={img.image_url || img.thumb_url} className="object-cover w-full h-full" alt="" />
            </div>
          ))
        ) : (
          <div className="col-span-3 py-16 text-center text-muted-foreground">
            <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Ingen billeder fundet</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="docs" className="space-y-3">
        {files.length > 0 ? (
          files.map((file: any, i: number) => (
            <a
              key={i}
              href={file.asset_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:bg-muted shadow-sm transition-all active:scale-[0.99]"
            >
              <div className="grid h-12 w-12 place-items-center bg-blue-50 text-blue-600 rounded-xl">
                <ChevronRight className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold truncate text-foreground">{file.title || 'Dokument'}</div>
                <div className="text-xs text-muted-foreground font-medium">
                  {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : ''}
                </div>
              </div>
            </a>
          ))
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            <ChevronRight className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Ingen dokumenter fundet</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="links" className="space-y-3">
        {links.length > 0 ? (
          links.map((link: any, i: number) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:bg-muted shadow-sm transition-all active:scale-[0.99]"
            >
              <div className="grid h-12 w-12 place-items-center bg-green-50 text-green-600 rounded-xl">
                <ChevronRight className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold truncate text-foreground">{link.url}</div>
                <div className="text-xs text-muted-foreground line-clamp-1 font-medium">{link.text}</div>
              </div>
            </a>
          ))
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            <ChevronRight className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Ingen links fundet</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// ---------------------------
// Channel preview item
// ---------------------------
function ChatPreview(props: ChannelPreviewUIComponentProps<DefaultGenerics>) {
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
    (channel.state?.messages?.[channel.state.messages.length - 1]?.text as string | undefined) || ' ';

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
        <Avatar className="h-14 w-14 shadow-sm border border-border">
          <AvatarImage src={avatarUrl} alt={title} className="object-cover" />
          <AvatarFallback className="bg-muted">{getInitials(title)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[17px] font-bold text-foreground leading-tight">{title}</div>
              {subtitle1 ? (
                <div className="truncate text-[13px] text-muted-foreground font-medium mt-0.5">{subtitle1}</div>
              ) : null}
            </div>

            <div className="shrink-0 text-[12px] text-muted-foreground font-bold uppercase tracking-tight">
              {timeText}
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="truncate text-[15px] text-muted-foreground font-medium">{lastMsgText}</div>

            {unreadCount > 0 ? (
              <div className="ml-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#E24B4B] px-1.5 text-[11px] font-bold text-white shadow-sm shadow-red-500/20">
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
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-[40px] border border-border bg-background p-10 text-center shadow-sm">
        <Avatar className="mx-auto h-24 w-24 shadow-xl border-4 border-white">
          <AvatarImage src={photoURL} alt={name} className="object-cover" />
          <AvatarFallback className="text-3xl bg-muted">{getInitials(name)}</AvatarFallback>
        </Avatar>

        <h3 className="mt-6 text-[22px] font-extrabold text-foreground font-headline">{name}</h3>

        <p className="mt-3 text-[15px] text-muted-foreground font-medium leading-relaxed">
          Start samtalen ved at sende den første besked 👋
        </p>
      </div>
    </div>
  );
}

// ---------------------------
// Page
// ---------------------------
export default function ChatView() {
  const { tGlobal } = useGlobalTranslation();

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useUser();
  const { profile } = useUserProfile();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { setIsSubView } = useView();
  const syncUnread = useUnreadSync();

  const [isLeaveAlertOpen, setIsLeaveAlertOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLeavingChat, setIsLeavingChat] = useState(false);

  const { channel, setActiveChannel, client } = useChatContext();

  const closeAllOverlays = () => {
    setIsLeaveAlertOpen(false);
    setIsInfoOpen(false);
    setIsMediaOpen(false);
  };

  const safelyExitChatView = async () => {
    closeAllOverlays();
    await waitForUiUnlock();
    forceUnlockUi();
    setActiveChannel(undefined);
    removeCidFromUrl();
    await new Promise((r) => setTimeout(r, 0));
    forceUnlockUi();
  };

  useEffect(() => {
    setIsSubView(!!channel);
  }, [channel, setIsSubView]);

  useEffect(() => {
    return () => {
      forceUnlockUi();
    };
  }, []);

  useEffect(() => {
    forceUnlockUi();
  }, [channel?.cid]);

  // Deep linking
  useEffect(() => {
    const cid = searchParams.get('cid');
    if (cid && client && client.userID && cid !== channel?.cid) {
      const [type, id] = cid.split(':');
      if (type && id) {
        const targetChannel = client.channel(type, id);
        targetChannel.watch().then(() => {
          setActiveChannel(targetChannel);
        }).catch(() => { });
      }
    }
  }, [searchParams, client, setActiveChannel, channel?.cid]);

  // Mark as read and sync globally
  useEffect(() => {
    if (!channel || !client) return;
    let cancelled = false;
    async function markAndSync() {
      try {
        await channel.markRead();
        if (!cancelled) {
          await syncUnread();
          setTimeout(syncUnread, 300);
        }
      } catch { }
    }
    markAndSync();
    return () => {
      cancelled = true;
    };
  }, [channel?.cid, client, syncUnread]);

  const filters = useMemo(
    () => ({
      members: { $in: [user?.uid as string] },
      type: { $in: ['messaging', 'team'] },
    }),
    [user?.uid]
  );

  const sort = useMemo(() => ({ last_message_at: -1 as const }), []);
  const options = useMemo(() => ({ presence: true, state: true }), []);

  const [callingState, setCallingState] = useState<{
    open: boolean;
    callId: string | null;
    recipientId: string | null;
    type: 'video' | 'audio' | null;
  }>({ open: false, callId: null, recipientId: null, type: null });

  const handleCall = async (type: 'video' | 'audio') => {
    if (!channel || !user?.uid || !firestore) return;

    const callId = `call-${channel.id}-${Date.now()}`;
    const members = Object.keys(channel.state.members || {});
    const otherUserIds = members.filter((id) => id !== user.uid);
    const isGroupCall = members.length > 2;

    if (otherUserIds.length === 0) {
      toast({ title: 'Kunne ikke starte opkald', description: 'Du er alene i denne chat.' });
      return;
    }

    const batch = writeBatch(firestore);
    const callInfo = {
      callId,
      from: user.uid,
      fromName: profile?.displayName || user.displayName || 'Nogen',
      fromPhoto: profile?.photoURL || user.photoURL || '',
      channelId: channel.id,
      channelType: channel.type,
      type,
    };

    otherUserIds.forEach((userId) => {
      const inviteRef = doc(firestore, 'callInvites', userId);
      batch.set(inviteRef, callInfo);
    });

    const callDocRef = doc(firestore, 'activeCalls', callId);
    batch.set(callDocRef, { members: [user.uid], type });

    batch.commit().catch(() => {
      const permissionError = new FirestorePermissionError({
        path: 'batch write for call invite',
        operation: 'write',
      });
      errorEmitter.emit('permission-error', permissionError);
    });

    if (isGroupCall) {
      router.push(`/${type}/${callId}`);
    } else {
      setCallingState({
        open: true,
        callId,
        recipientId: otherUserIds[0],
        type,
      });
    }
  };

  const handleLeaveChat = async () => {
    if (!channel || !user?.uid || isLeavingChat) return;

    const cid = channel.id;
    const ctype = channel.type;

    try {
      setIsLeavingChat(true);

      // close overlays first and unlock UI before unmounting the chat view
      closeAllOverlays();
      await waitForUiUnlock();
      forceUnlockUi();

      // now safely switch back to list
      setActiveChannel(undefined);
      removeCidFromUrl();
      await new Promise((r) => setTimeout(r, 0));
      forceUnlockUi();

      // server-side leave after UI is already safe
      const idToken = await user.getIdToken();
      const res = await fetch('/api/stream/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          channelId: cid,
          channelType: ctype,
        }),
      });

      if (!res.ok) {
        throw new Error('Kunne ikke forlade chat');
      }

      toast({
        title: 'Chat forladt',
        description: 'Du er blevet fjernet fra samtalen.',
      });
    } catch {
      forceUnlockUi();
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `stream/leave/${cid}`,
          operation: 'delete',
        })
      );
    } finally {
      setIsLeavingChat(false);
      forceUnlockUi();
    }
  };

  const cancelCall = async (reason: 'cancelled' | 'timeout') => {
    if (!callingState.callId || !callingState.recipientId || !firestore) return;
    const inviteDocRef = doc(firestore, 'callInvites', callingState.recipientId);
    deleteDoc(inviteDocRef).catch(() => { });
    const callDocRef = doc(firestore, 'activeCalls', callingState.callId);
    try {
      const callDocSnap = await getDoc(callDocRef);
      if (callDocSnap.exists()) {
        const members = callDocSnap.data()?.members;
        if (Array.isArray(members) && members.length === 1) deleteDoc(callDocRef).catch(() => { });
      }
    } catch { }
    setCallingState({ open: false, callId: null, recipientId: null, type: null });
    if (reason === 'timeout') toast({ title: 'Intet svar', description: 'Brugeren besvarede ikke opkaldet.' });
  };

  const onCallConnected = () => {
    if (!callingState.callId || !callingState.type) return;
    const { callId, type } = callingState;
    setCallingState({ open: false, callId: null, recipientId: null, type: null });
    router.push(`/${type}/${callId}`);
  };

  if (userLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!channel) {
    return (
      <>
        <CallingDialog
          isOpen={callingState.open}
          callId={callingState.callId || ''}
          type={callingState.type}
          onCancel={cancelCall}
          onConnected={onCallConnected}
        />

        <div className="flex-1 bg-background px-4 pt-10 sm:px-6">
          <div className="flex items-start justify-between">
            <h1 className="text-[44px] leading-[1.05] font-semibold tracking-tight text-foreground">
              Chats
            </h1>

            <NewChatDialog>
              <button
                className="mt-1 grid h-12 w-12 place-items-center rounded-full bg-[#2E9D63] text-white shadow-[0_10px_30px_rgba(46,157,99,0.2)] active:scale-[0.98] transition-transform"
                aria-label="Start ny chat"
              >
                <Plus className="h-6 w-6" />
              </button>
            </NewChatDialog>
          </div>

          <div className="mt-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={tGlobal('Søg i samtaler...')}
                className="h-14 rounded-2xl pl-12 text-[16px] shadow-[0_10px_30px_rgba(17,18,20,0.06)] border-border bg-card"
              />
            </div>
          </div>

          <div className="mt-8">
            <div className="overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_10px_40px_rgba(17,18,20,0.08)]">
              <ChannelList
                sort={sort}
                filters={filters}
                options={options}
                setActiveChannelOnMount={false}
                Preview={ChatPreview}
                channelRenderFilterFn={(channels) =>
                  channels.filter((ch) => {
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
                  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="text-6xl opacity-10 mb-6">💬</div>
                    <div className="text-xl font-bold text-foreground">Ingen chats endnu</div>
                    <div className="mt-2 text-sm text-muted-foreground font-medium">
                      Tryk på plus for at starte en ny samtale.
                    </div>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  const other = getOtherMember(channel, user?.uid);
  const title =
    (channel.data?.name as string | undefined) ||
    (other?.name as string | undefined) ||
    'Chat';

  const otherPhoto = (other?.image as string | undefined) || undefined;
  const channelPhoto = (channel.data?.image as string | undefined) || otherPhoto;
  const memberCount = Object.keys(channel?.state?.members ?? {}).length;
  const isDM = memberCount === 2;

  return (
    <>
      <CallingDialog
        isOpen={callingState.open}
        callId={callingState.callId || ''}
        type={callingState.type}
        onCancel={cancelCall}
        onConnected={onCallConnected}
      />

      <AlertDialog open={isLeaveAlertOpen} onOpenChange={setIsLeaveAlertOpen}>
        <AlertDialogContent className="rounded-[32px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-2xl">Forlad chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Du bliver fjernet fra samtalen og modtager ikke flere beskeder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-0">
            <AlertDialogCancel onClick={() => setIsLeaveAlertOpen(false)} className="rounded-2xl" disabled={isLeavingChat}>
              Annuller
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveChat}
              disabled={isLeavingChat}
              className="bg-[#E24B4B] hover:bg-red-600 rounded-2xl"
            >
              {isLeavingChat ? 'Forlader...' : 'Forlad'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FullscreenSheet
        open={isInfoOpen}
        onOpenChange={setIsInfoOpen}
        title="Info"
        rightSlot={
          <button onClick={() => setIsInfoOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X className="h-6 w-6 opacity-40" />
          </button>
        }
      >
        <div className="px-6 py-10 flex flex-col items-center space-y-10 pb-32">
          <div className="flex flex-col items-center text-center space-y-5 w-full">
            <Avatar className="h-40 w-40 shadow-2xl border-4 border-white">
              <AvatarImage src={channelPhoto} className="object-cover" />
              <AvatarFallback className="text-5xl bg-muted font-headline">{getInitials(title)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-3xl font-extrabold text-foreground font-headline">{title}</h2>
              {isDM && other?.email && <p className="text-muted-foreground font-medium">{other.email}</p>}
              {!isDM && <p className="text-muted-foreground font-bold">{memberCount} medlemmer</p>}
            </div>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => setIsMediaOpen(true)}
              className="flex w-full items-center justify-between p-5 rounded-3xl bg-card border border-border shadow-sm active:scale-[0.98] transition-all group hover:border-primary/20"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <span className="font-bold text-[16px]">Delt indhold</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-20 group-hover:opacity-40" />
            </button>

            <button
              onClick={() => setIsLeaveAlertOpen(true)}
              className="flex w-full items-center justify-between p-5 rounded-3xl bg-card border border-border shadow-sm text-[#E24B4B] active:scale-[0.98] transition-all group hover:border-red-100"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50">
                  <LogOut className="h-6 w-6" />
                </div>
                <span className="font-bold text-[16px]">Forlad chat</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-20 group-hover:opacity-40" />
            </button>
          </div>
        </div>
      </FullscreenSheet>

      <FullscreenSheet
        open={isMediaOpen}
        onOpenChange={setIsMediaOpen}
        title="Delt indhold"
        rightSlot={
          <button onClick={() => setIsMediaOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X className="h-6 w-6 opacity-40" />
          </button>
        }
      >
        <div className="p-6 pb-24">
          <MediaGallery channel={channel} />
        </div>
      </FullscreenSheet>

      <div className={cn('h-[100dvh] flex flex-col bg-card overflow-hidden', isDM && 'chat--dm')}>
        <Channel channel={channel}>
          <Window>
            <div className="flex items-center justify-between border-b px-4 py-4 gap-2 bg-card/95 backdrop-blur z-10 shadow-sm">
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    await safelyExitChatView();
                  }}
                  aria-label="Tilbage"
                  className="rounded-full"
                >
                  <ArrowLeft className="h-6 w-6" />
                </Button>
              </div>

              <button
                onClick={() => setIsInfoOpen(true)}
                className="flex-1 flex items-center gap-3 min-w-0 px-2 py-1.5 rounded-2xl hover:bg-muted transition-colors text-left"
              >
                <Avatar className="h-11 w-11 flex-shrink-0 shadow-sm border border-border">
                  <AvatarImage src={channelPhoto} className="object-cover" />
                  <AvatarFallback className="text-sm bg-muted">{getInitials(title)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-[17px] font-bold text-foreground leading-tight">{title}</div>
                  {isDM ? (
                    <div
                      className={cn(
                        'text-[11px] font-bold uppercase tracking-widest leading-none mt-0.5',
                        other?.online ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {other?.online ? 'Online' : 'Offline'}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground font-bold leading-none mt-0.5">
                      {memberCount} medlemmer
                    </div>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCall('audio')}
                  className="text-primary hover:text-primary/80 rounded-full h-11 w-11"
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCall('video')}
                  className="text-primary hover:text-primary/80 rounded-full h-11 w-11"
                >
                  <VideoIcon className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <div className="chat-pattern flex-1 min-h-0 relative">
              <div className="h-full overflow-y-auto">
                <MessageList
                  hideReadReceipts
                  EmptyStateIndicator={() => <PrettyEmptyChat name={title} photoURL={channelPhoto} />}
                />
              </div>
            </div>

            <div className="border-t bg-card/95 backdrop-blur pt-3 pb-[max(12px,env(safe-area-inset-bottom,12px))] px-4 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
              <div className="mx-auto w-full max-w-3xl">
                <MessageInput grow />
              </div>
            </div>
          </Window>
          <Thread />
        </Channel>
      </div>
    </>
  );
}