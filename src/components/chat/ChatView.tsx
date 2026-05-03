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

import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useView } from '@/context/ViewContext';
import { useUserProfile } from '@/hooks/use-user-profile';

import NewChatDialog from '@/components/chat/NewChatDialog';
import UserSearch from '@/components/chat/UserSearch';
import AvatarUploader from '@/components/profile/AvatarUploader';
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
  MessageSquare,
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

import { doc, writeBatch, getDoc, deleteDoc, updateDoc, serverTimestamp, onSnapshot, collection } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUnreadSync } from '@/hooks/use-unread-sync';
import { motion } from 'framer-motion';

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
  
  const localeMap = { da: 'da-DK', en: 'en-US', ar: 'ar-SA', so: 'en-GB' };
  // @ts-ignore
  return d.toLocaleDateString(localeMap[window?.__IBNAMER_LANG__] || 'da-DK');
}

function getOtherMember(channel: any, myId: string | undefined) {
  const members = channel?.state?.members || {};
  const arr = Object.values(members) as any[];
  const other = arr.find((m: any) => m?.user?.id && m.user.id !== myId);
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
  const { tGlobal } = useGlobalTranslation();
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
          {tGlobal('Billeder')}
        </TabsTrigger>
        <TabsTrigger
          value="docs"
          className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
        >
          {tGlobal('Filer')}
        </TabsTrigger>
        <TabsTrigger
          value="links"
          className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
        >
          {tGlobal('Links')}
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
            <p className="text-sm font-medium">{tGlobal('Ingen billeder fundet')}</p>
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
                <div className="text-[15px] font-bold truncate text-foreground">{file.title || tGlobal('Dokument')}</div>
                <div className="text-xs text-muted-foreground font-medium">
                  {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : ''}
                </div>
              </div>
            </a>
          ))
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            <ChevronRight className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">{tGlobal('Ingen dokumenter fundet')}</p>
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
            <p className="text-sm font-medium">{tGlobal('Ingen links fundet')}</p>
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
      onClick={() => setActiveChannel?.(channel)}
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
  const { tGlobal } = useGlobalTranslation();
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-[40px] border border-border bg-background p-10 text-center shadow-sm">
        <Avatar className="mx-auto h-24 w-24 shadow-xl border-4 border-white">
          <AvatarImage src={photoURL} alt={name} className="object-cover" />
          <AvatarFallback className="text-3xl bg-muted">{getInitials(name)}</AvatarFallback>
        </Avatar>

        <h3 className="mt-6 text-[22px] font-extrabold text-foreground font-headline">{name}</h3>

        <p className="mt-3 text-[15px] text-muted-foreground font-medium leading-relaxed">
          {tGlobal('Start samtalen ved at sende den første besked')} 👋
        </p>
      </div>
    </div>
  );
}

// ---------------------------
// Page
// ---------------------------
export default function ChatView() {
  const { tGlobal, language } = useGlobalTranslation();
  
  // Set global language for formatTimeOrDate helper
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__IBNAMER_LANG__ = language;
    }
  }, [language]);

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
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const { channel, setActiveChannel, client } = useChatContext();

  const closeAllOverlays = () => {
    setIsLeaveAlertOpen(false);
    setIsInfoOpen(false);
    setIsMediaOpen(false);
    setIsAddMemberOpen(false);
    setIsEditingGroup(false);
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
    
    // Toggle body class for CSS-based navbar hiding
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('chat-open', !!channel);
    }

    // Update Firestore presence for "ChattingWith" logic
    if (user?.uid && firestore && profile?.role) {
      const userCol = profile.role === 'admin' ? 'admins' : profile.role === 'teacher' ? 'teachers' : 'students';
      const userRef = doc(firestore, userCol, user.uid);
      
      const cid = channel ? channel.cid : null;
      updateDoc(userRef, { currentChatId: cid }).catch(() => {});

      return () => {
        setIsSubView(false);
        if (typeof document !== 'undefined') {
          document.body.classList.remove('chat-open');
        }
        
        // Clear presence on unmount
        if (user?.uid && firestore && profile?.role) {
          updateDoc(userRef, { currentChatId: null }).catch(() => {});
        }
      };
    }
  }, [channel?.cid, setIsSubView, user?.uid, firestore, profile?.role]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__IBNAMER_ACTIVE_CID__ = channel?.cid;
    }
  }, [channel?.cid]);

  useEffect(() => {
    return () => {
      forceUnlockUi();
      if (typeof window !== 'undefined') (window as any).__IBNAMER_ACTIVE_CID__ = undefined;
    };
  }, []);

  // FORCE RE-RENDER ON PRESENCE CHANGES
  const [presenceToggle, setPresenceToggle] = useState(0);

  useEffect(() => {
    if (!client || !channel) return;

    const handleEvent = (event: any) => {
      // If the user in the event is a member of our current channel, force a update
      if (event.user && channel.state.members[event.user.id]) {
        setPresenceToggle(prev => prev + 1);
      }
    };

    client.on('user.presence.changed', handleEvent);
    client.on('user.updated', handleEvent);

    return () => {
      client.off('user.presence.changed', handleEvent);
      client.off('user.updated', handleEvent);
    };
  }, [client, channel?.cid]);

  useEffect(() => {
    forceUnlockUi();
    if (typeof window !== 'undefined') (window as any).__IBNAMER_ACTIVE_CID__ = channel?.cid;
  }, [channel?.cid, presenceToggle]);

  // Mark as read and sync globally
  useEffect(() => {
    if (!channel || !client) return;
    let cancelled = false;
    async function markAndSync() {
      if (!channel) return;
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

  // Searchable users logic for "Add Member"
  const [searchableUsers, setSearchableUsers] = useState<any[]>([]);
  const teachersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'teachers') : null), [firestore]);
  const studentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'students') : null), [firestore]);
  const adminsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'admins') : null), [firestore]);

  const { data: teacherData } = useCollection<any>(teachersQuery);
  const { data: studentData } = useCollection<any>(
    (profile?.role === 'teacher' || profile?.role === 'admin') ? studentsQuery : null
  );
  const { data: adminData } = useCollection<any>(
    (profile?.role === 'admin') ? adminsQuery : null
  );

  useEffect(() => {
    const all = [
        ...(teacherData || []),
        ...(studentData || []),
        ...(adminData || [])
    ];
    const uniqueUsersMap = new Map<string, any>();
    all.forEach(u => {
      const userWithUid = { ...u, uid: u.id };
      if (!uniqueUsersMap.has(userWithUid.id)) {
        uniqueUsersMap.set(userWithUid.id, userWithUid);
      }
    });

    const uniqueUsers = Array.from(uniqueUsersMap.values());
    
    // Filter by same gender and exclude self and existing members
    const existingMemberIds = Object.keys(channel?.state?.members || {});
    const filteredUsers = uniqueUsers.filter(u => 
      u.uid !== user?.uid && 
      (!profile || u.gender === profile.gender) &&
      !existingMemberIds.includes(u.uid)
    );
    
    setSearchableUsers(filteredUsers);
  }, [teacherData, studentData, adminData, user?.uid, profile, channel?.state?.members]);

  const [callingState, setCallingState] = useState<{
    open: boolean;
    callId: string | null;
    recipientId: string | null;
    type: 'video' | 'audio' | null;
  }>({ open: false, callId: null, recipientId: null, type: null });

  const [activeChannelCall, setActiveChannelCall] = useState<{ id: string, type: 'video'|'audio'} | null>(null);

  useEffect(() => {
    if (!channel || !firestore) {
      setActiveChannelCall(null);
      return;
    }
    const callId = `call-${channel.id}`;
    const callDocRef = doc(firestore, 'activeCalls', callId);
    const unsubscribe = onSnapshot(callDocRef, (snap) => {
      if (snap.exists()) {
        setActiveChannelCall({ id: callId, type: snap.data()?.type || 'video' });
      } else {
        setActiveChannelCall(null);
      }
    });
    return () => unsubscribe();
  }, [channel?.id, firestore]);

  const handleCall = async (type: 'video' | 'audio') => {
    if (!channel || !user?.uid || !firestore) return;

    if (activeChannelCall) {
       router.push(`/${activeChannelCall.type}/${activeChannelCall.id}`);
       return;
    }

    const callId = `call-${channel.id}`;
    const members = Object.keys(channel.state.members || {});
    const otherUserIds = members.filter((id) => id !== user.uid);
    const isGroupCall = members.length > 2;

    if (otherUserIds.length === 0) {
      toast({ title: tGlobal('Kunne ikke starte opkald'), description: tGlobal('Du er alene i denne chat.') });
      return;
    }

    const batch = writeBatch(firestore);
    const callInfo = {
      callId,
      from: user.uid,
      fromName: profile?.displayName || user.displayName || tGlobal('Nogen'),
      fromPhoto: profile?.photoURL || user.photoURL || '',
      channelId: channel.id,
      channelType: channel.type,
      type,
      createdAt: serverTimestamp(),
    };

    otherUserIds.forEach((userId) => {
      const inviteRef = doc(firestore, 'callInvites', userId);
      batch.set(inviteRef, callInfo);
    });

    const callDocRef = doc(firestore, 'activeCalls', callId);
    batch.set(callDocRef, { 
      members: [user.uid], 
      type, 
      createdAt: serverTimestamp() 
    });

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
        throw new Error(tGlobal('Kunne ikke forlade chat'));
      }

      toast({
        title: tGlobal('Chat forladt'),
        description: tGlobal('Du er blevet fjernet fra samtalen.'),
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
  
  const handleUpdateGroup = async (newName: string, newImage?: string) => {
    if (!channel || isUpdatingGroup) return;
    setIsUpdatingGroup(true);
    try {
      const update: any = {};
      if (newName) update.name = newName;
      if (newImage) update.image = newImage;
      
      await channel.updatePartial({ set: update });
      toast({ title: tGlobal('Profil opdateret') });
      setIsEditingGroup(false);
    } catch (err) {
      console.error("Failed to update group:", err);
      toast({ variant: 'destructive', title: tGlobal('Fejl'), description: tGlobal('Kunne ikke opdatere gruppe') });
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!channel || isAddingMember) return;
    setIsAddingMember(true);
    try {
      await channel.addMembers([userId]);
      toast({ title: tGlobal('Bruger tilføjet') });
    } catch (err) {
      console.error("Failed to add member:", err);
      toast({ variant: 'destructive', title: tGlobal('Fejl'), description: tGlobal('Kunne ikke tilføje medlem') });
    } finally {
      setIsAddingMember(false);
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
    if (reason === 'timeout') toast({ title: tGlobal('Intet svar'), description: tGlobal('Brugeren besvarede ikke opkaldet.') });
  };

  const onCallConnected = () => {
    if (!callingState.callId || !callingState.type) return;
    const { callId, type } = callingState;
    setCallingState({ open: false, callId: null, recipientId: null, type: null });
    router.push(`/${type}/${callId}`);
  };

  if (userLoading) {
    return (
      <div className="flex-1 w-full px-6 pt-12 pb-32 space-y-10 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-10 w-32 bg-primary/5 animate-pulse rounded-2xl" />
            <div className="h-3 w-40 bg-accent/10 animate-pulse rounded-full" />
          </div>
          <div className="h-16 w-16 rounded-[24px] bg-primary/5 animate-pulse shadow-sm" />
        </div>

        <div className="h-16 rounded-[28px] bg-primary/5 animate-pulse w-full" />

        <div className="space-y-6">
          <div className="h-4 w-24 bg-primary/5 animate-pulse rounded-full ml-4" />
          <div className="glass-card overflow-hidden !border-none !bg-black/[0.02]">
            <div className="glass-card-inner !p-8 space-y-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/5 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-primary/5 animate-pulse rounded" />
                    <div className="h-3 w-1/2 bg-primary/5 animate-pulse rounded opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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

        <div className="flex-1 w-full px-6 pt-12 pb-32 space-y-10 max-w-lg mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between"
          >
            <div>
                <h1 className="text-5xl font-display text-primary tracking-tight">{tGlobal('Beskeder')}</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mt-2">{tGlobal('Chat med dine lærere')}</p>
            </div>

            <NewChatDialog>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="h-16 w-16 rounded-[24px] bg-primary text-white shadow-2xl flex items-center justify-center transition-all"
                aria-label={tGlobal('Start ny chat')}
              >
                <Plus className="h-8 w-8" />
              </motion.button>
            </NewChatDialog>
          </motion.div>

          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/20 group-focus-within:text-primary transition-colors" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tGlobal('Søg i samtaler...')}
              className="h-16 rounded-[28px] pl-16 pr-6 text-base font-bold bg-primary/5 border-white/40 focus:bg-white focus:shadow-xl transition-all"
            />
          </div>

          <div className="space-y-6">
            <div className="section-label">{tGlobal('Dine Samtaler')}</div>
            <div className="glass-card overflow-hidden">
              <div className="glass-card-inner !p-0">
                  <ChannelList
                    sort={sort}
                    filters={filters}
                    options={options}
                    setActiveChannelOnMount={false}
                    Preview={ChatPreview}
                    LoadingIndicator={() => (
                      <div className="space-y-8 !p-8 animate-pulse">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/5" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-1/3 bg-primary/5 rounded" />
                                <div className="h-3 w-1/2 bg-primary/5 rounded opacity-50" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    channelRenderFilterFn={(channels) =>
                      channels.filter((ch) => {
                        const term = searchTerm.trim().toLowerCase();
                        if (!term) return true;
                        const name = (ch.data?.name as string | undefined)?.toLowerCase() || '';
                        const otherMember = getOtherMember(ch, user?.uid);
                        const otherName = (otherMember?.name as string | undefined)?.toLowerCase() || '';
                        const otherEmail = (otherMember?.email as string | undefined)?.toLowerCase() || '';
                        return name.includes(term) || otherName.includes(term) || otherEmail.includes(term);
                      })
                    }
                    EmptyStateIndicator={() => (
                      <div className="flex flex-col items-center justify-center py-24 px-10 text-center space-y-6">
                        <div className="h-20 w-20 bg-primary/5 rounded-[32px] flex items-center justify-center animate-pulse">
                            <MessageSquare className="h-10 w-10 text-primary/20" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-primary">{tGlobal('Ingen beskeder endnu')}</h3>
                            <p className="text-xs text-primary/40 font-bold uppercase tracking-wider">{tGlobal('Start din første samtale med en lærer')}</p>
                        </div>
                      </div>
                    )}
                  />
              </div>
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
            <AlertDialogTitle className="font-headline text-2xl">{tGlobal('Forlad chat?')}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {tGlobal('Du bliver fjernet fra samtalen og modtager ikke flere beskeder.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-0">
            <AlertDialogCancel onClick={() => setIsLeaveAlertOpen(false)} className="rounded-2xl" disabled={isLeavingChat}>
              {tGlobal('Annuller')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveChat}
              disabled={isLeavingChat}
              className="bg-[#E24B4B] hover:bg-red-600 rounded-2xl"
            >
              {isLeavingChat ? tGlobal('Forlader...') : tGlobal('Forlad')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FullscreenSheet
        open={isInfoOpen}
        onOpenChange={setIsInfoOpen}
        title={tGlobal('Info')}
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
            <div className="space-y-2 w-full px-4">
              {isEditingGroup ? (
                <div className="space-y-4 w-full">
                  <AvatarUploader 
                    label={tGlobal("Skift gruppebillede")} 
                    isUserAvatar={false} 
                    currentImage={channelPhoto}
                    displayName={title}
                    onUploadSuccess={(url) => handleUpdateGroup(editGroupName, url)}
                  />
                  <Input 
                    value={editGroupName} 
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="h-12 rounded-2xl text-center font-bold"
                    placeholder={tGlobal("Gruppenavn")}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsEditingGroup(false)}>
                      {tGlobal("Annuller")}
                    </Button>
                    <Button className="flex-1 rounded-xl" onClick={() => handleUpdateGroup(editGroupName)} disabled={isUpdatingGroup}>
                      {isUpdatingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : tGlobal("Gem")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-extrabold text-foreground font-headline">{title}</h2>
                  {isDM && other?.email && <p className="text-muted-foreground font-medium">{other.email}</p>}
                  {!isDM && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground font-bold">{memberCount} {tGlobal('medlemmer')}</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-accent font-bold hover:bg-accent/5 rounded-full"
                        onClick={() => {
                          setEditGroupName(title);
                          setIsEditingGroup(true);
                        }}
                      >
                        {tGlobal("Rediger")}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="w-full space-y-3">
            {!isDM && (
              <button
                onClick={() => setIsAddMemberOpen(true)}
                disabled={isAddingMember}
                className="flex w-full items-center justify-between p-5 rounded-3xl bg-card border border-border shadow-sm active:scale-[0.98] transition-all group hover:border-primary/20 disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                    {isAddingMember ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
                  </div>
                  <span className="font-bold text-[16px]">{tGlobal('Tilføj medlem')}</span>
                </div>
                <ChevronRight className="h-5 w-5 opacity-20 group-hover:opacity-40" />
              </button>
            )}

            <button
              onClick={() => setIsMediaOpen(true)}
              className="flex w-full items-center justify-between p-5 rounded-3xl bg-card border border-border shadow-sm active:scale-[0.98] transition-all group hover:border-primary/20"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <span className="font-bold text-[16px]">{tGlobal('Delt indhold')}</span>
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
                <span className="font-bold text-[16px]">{tGlobal('Forlad chat')}</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-20 group-hover:opacity-40" />
            </button>
          </div>
        </div>
      </FullscreenSheet>

      <FullscreenSheet
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        title={tGlobal('Tilføj medlem')}
        rightSlot={
          <button onClick={() => setIsAddMemberOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X className="h-6 w-6 opacity-40" />
          </button>
        }
      >
        <div className="p-6 pb-24 space-y-6">
          <div className="section-label">{tGlobal('Søg brugere...')}</div>
          <UserSearch 
            users={searchableUsers}
            onSelectUser={(u) => {
              handleAddMember(u.uid);
              setIsAddMemberOpen(false);
            }} 
          />
        </div>
      </FullscreenSheet>

      <FullscreenSheet
        open={isMediaOpen}
        onOpenChange={setIsMediaOpen}
        title={tGlobal('Delt indhold')}
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

      <div className={cn('fixed inset-0 z-[50] flex flex-col bg-transparent overflow-hidden', isDM && 'chat--dm')}>
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
              <div className="flex items-center justify-between px-3 py-3 gap-2 bg-background/60 backdrop-blur-3xl border border-white/20 dark:border-white/5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.08)] pointer-events-auto">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      await safelyExitChatView();
                    }}
                    aria-label={tGlobal('Annuller')}
                    className="rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </Button>
                </div>

                <button
                  onClick={() => setIsInfoOpen(true)}
                  className="flex-1 flex items-center justify-center gap-3 min-w-0 px-3 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0 shadow-sm border border-border">
                    <AvatarImage src={channelPhoto} className="object-cover" />
                    <AvatarFallback className="text-xs bg-muted font-bold font-headline">{getInitials(title)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 text-left">
                    <div className="truncate text-base font-bold text-foreground font-headline leading-tight">{title}</div>
                    {isDM ? (
                      <div
                        className={cn(
                          'text-[10px] font-black uppercase tracking-widest leading-none mt-0.5',
                          other?.online ? 'text-[#2E9D63]' : 'text-muted-foreground'
                        )}
                      >
                        {other?.online ? tGlobal('Online') : tGlobal('Offline')}
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-0.5">
                        {memberCount} {tGlobal('medlemmer')}
                      </div>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCall('audio')}
                    className={cn(
                      "rounded-full h-10 w-10 transition-colors",
                      activeChannelCall?.type === 'audio' 
                        ? "bg-[#E24B4B] text-white hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/30" 
                        : "text-primary hover:text-primary/80 hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCall('video')}
                    className={cn(
                      "rounded-full h-10 w-10 transition-colors",
                      activeChannelCall?.type === 'video' 
                        ? "bg-[#E24B4B] text-white hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/30" 
                        : "text-primary hover:text-primary/80 hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <VideoIcon className="h-6 w-6 relative top-[1px]" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="chat-pattern flex-1 min-h-0 flex flex-col relative z-10 -mt-[72px]">
              <div className="h-full w-full flex flex-col pt-[80px] pb-[96px]">
                <MessageList />
              </div>
            </div>

            {/* Premium Floating Input Block */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-2 pb-[max(12px,env(safe-area-inset-bottom,12px))] pointer-events-none">
              <div className="mx-auto w-full max-w-3xl pointer-events-auto">
                <div className="bg-background/80 backdrop-blur-3xl border border-white/20 dark:border-white/5 rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.06)] overflow-hidden">
                  <MessageInput grow />
                </div>
              </div>
            </div>
          </Window>
          <Thread />
        </Channel>
      </div>
    </>
  );
}