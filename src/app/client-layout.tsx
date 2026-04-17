'use client';

import { Toaster } from "@/components/ui/toaster";
import { useAuth } from '@/hooks/use-auth';
import { AuthProvider } from "@/context/auth-context";
import { Navbar } from '@/components/Navbar';
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { ViewProvider, useView } from '@/context/ViewContext';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SWRConfig } from "swr";
import { FirebaseClientProvider } from "@/firebase";
import { useUserProfile } from "@/hooks/use-user-profile";
import Image from "next/image";
import { LanguageProvider } from "@/context/LanguageContext";
import StreamVideoProvider from "@/components/StreamVideoProvider";
import StreamUserProvider from "@/components/StreamUserProvider";
import IncomingCallListener from "@/components/calls/IncomingCallListener";
import { QuranQuoteModal } from "@/components/QuranQuoteModal";
import { UnreadProvider } from "@/context/UnreadContext";
import { useUnreadSync } from "@/hooks/use-unread-sync";
import { useChatContext } from "stream-chat-react";
import { ensureWebPushToken, bindForegroundMessaging } from "@/lib/fcm";
import AppWarmer from "@/components/AppWarmer";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";

/**
 * Initial synkronisering af ulæste beskeder ved opstart og ved events.
 */
function UnreadSyncManager() {
  const { client } = useChatContext();
  const syncUnread = useUnreadSync();

  useEffect(() => {
    // SIKRING: Vent til klienten er klar og har et userID (forbundet)
    if (!client || !client.userID) return;

    // Første sync
    syncUnread();

    // Lyt på events der ændrer unread globalt
    const handler = () => syncUnread();
    const events = [
      "notification.message_new",
      "message.new",
      "notification.mark_unread",
      "notification.mark_read",
      "message.read",
      "connection.recovered",
      "user.updated"
    ];

    events.forEach(e => client.on(e, handler));
    return () => events.forEach(e => client.off(e, handler));
  }, [client, client?.userID, syncUnread]);

  return null;
}

/**
 * A component that pre-warm the user's profile picture in the browser cache.
 */
function ProfilePrewarmer() {
  const { profile } = useUserProfile();
  const [prewarmUrl, setPrewarmUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        const profileKey = keys.find(k => k.startsWith('ibnamer_profile_v1:'));
        if (profileKey) {
          const cached = JSON.parse(localStorage.getItem(profileKey) || '{}');
          if (cached.photoURL) setPrewarmUrl(cached.photoURL);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (profile?.photoURL) {
      setPrewarmUrl(profile.photoURL);
    }
  }, [profile?.photoURL]);

  if (!prewarmUrl) return null;

  return (
    <div 
      style={{ display: 'none', visibility: 'hidden', width: 0, height: 0, position: 'absolute' }} 
      aria-hidden="true"
    >
      <img src={prewarmUrl} alt="" />
    </div>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { user, loading: isUserLoading } = useAuth();
  const { profile } = useUserProfile();
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const hasModalBeenShown = useRef(false);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { view, setView, isSubView } = useView();

  // 1. Get initial role from user-specific cache first, then general cache
  const [cachedRole, setCachedRole] = React.useState<string | null>(() => {
    if (typeof window === 'undefined' || !user?.uid) return null;
    return localStorage.getItem(`cachedRole:${user.uid}`) || localStorage.getItem('cachedRole');
  });

  useEffect(() => {
    if (user?.uid) {
      const specific = localStorage.getItem(`cachedRole:${user.uid}`);
      if (specific) setCachedRole(specific);
    }
  }, [user?.uid]);

  const isAuthPage =
    ['/', '/forgot-password', '/privacy', '/terms'].includes(pathname);

  const isFullScreenView =
    view === 'quran-reader' ||
    pathname.startsWith('/video/') ||
    pathname.startsWith('/audio/');

  // Show navbar optimistically if we have a cached role (user was logged in before)
  // This prevents the "background → navbar → content" staggered loading sequence.
  const likelySigned = !!user || (isUserLoading && !!cachedRole);
  const showNavbar = !isAuthPage && likelySigned && !isFullScreenView && !isSubView;

  function roleToPath(role: string) {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'teacher':
        return '/teacher-dashboard';
      case 'student':
        return '/student';
      default:
        return '/student';
    }
  }

  useEffect(() => {
    // Detection of entry intent (e.g. from a push notification call)
    const viewIntent = searchParams.get('view');
    const source = searchParams.get('source');
    const cid = searchParams.get('cid');
    
    // Suppress reminder if entering from a push notification or a specific chat
    const isSpecialEntry = 
      viewIntent === 'homework-reading' || 
      viewIntent === 'announcements' || 
      viewIntent === 'chat' ||
      source === 'push' ||
      !!cid;

    if (user && !isUserLoading && profile?.role) {
      // Register token for push notifications across all roles
      ensureWebPushToken(profile.role);
      bindForegroundMessaging();
      hasModalBeenShown.current = true;
    }

    // Standardized intent handling
    if (viewIntent && user && !isUserLoading) {
      const allowedViews = ['announcements', 'chat', 'homework-reading'];
      if (allowedViews.includes(viewIntent)) {
        setView(viewIntent as any);
        
        // Clean up basic view intent, but keep 'cid' for ChatView to handle
        if (viewIntent !== 'chat' || !cid) {
          const params = new URLSearchParams(searchParams.toString());
          params.delete('view');
          params.delete('source');
          const newQuery = params.toString() ? `?${params.toString()}` : '';
          router.replace(`${pathname}${newQuery}`);
        }
      }
    }
  }, [user, isUserLoading, profile, searchParams, setView, router, pathname]);

  // Sync internal state with external storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (profile?.role) {
      localStorage.setItem(`cachedRole:${user?.uid}`, profile.role);
      localStorage.setItem('cachedRole', profile.role);
      setCachedRole(profile.role);
    }
  }, [profile?.role, user?.uid]);

  const resolvedRole = profile?.role ?? cachedRole;

  useEffect(() => {
    // 1. Global Auth Guard
    if (!isUserLoading && !user && !isAuthPage && !pathname.startsWith('/events/')) {
      router.replace('/');
      return;
    }

    // 2. Auth Page Guard (Redirect away from login/landing when signed in)
    if (!isUserLoading && user && isAuthPage) {
      if (resolvedRole) {
        router.replace(roleToPath(resolvedRole));
      }
      return;
    }

    // 3. Strict Role-Based Protection
    if (!isUserLoading && user && resolvedRole) {
      const currentPath = pathname;
      
      // Admin dashboard protection
      if (currentPath.startsWith('/admin') && resolvedRole !== 'admin') {
        router.replace(roleToPath(resolvedRole));
        return;
      }

      // Teacher dashboard protection
      if (currentPath.startsWith('/teacher-dashboard') && resolvedRole !== 'teacher') {
        router.replace(roleToPath(resolvedRole));
        return;
      }

      // Student dashboard protection
      if (currentPath.startsWith('/student') && resolvedRole !== 'student') {
        router.replace(roleToPath(resolvedRole));
        return;
      }
    }
  }, [user, isUserLoading, isAuthPage, resolvedRole, router, pathname]);

  // Only hard-block if loading AND no cached role (fresh install / logged out).
  // If we have a cached role, render optimistically and let auth confirm in background.
  if (!isUserLoading && !user && !isAuthPage && !pathname.startsWith('/events/')) {
    return null;
  }

  if (!isUserLoading && user && isAuthPage) {
    // If we have a role, we're already replacing the route, so we return null to avoid flicker
    if (resolvedRole) return null;

    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png"
            alt="Ibn Amer"
            width={64}
            height={64}
            className="h-16 w-16 rounded-2xl"
          />
          <div className="text-center">
            <div className="text-2xl font-semibold">Ibn Amer</div>
          </div>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-transparent">
      <OfflineIndicator />
      <AppWarmer />
      <UnreadSyncManager />
      <ProfilePrewarmer />
      
      {showNavbar && <Navbar />}

      <main className={`flex-1 flex flex-col ${showNavbar ? 'pb-28' : ''}`}>
        {isFullScreenView ? (
          <div className="flex-1 flex flex-col">{children}</div>
        ) : isAuthPage && !user ? (
          <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
            {children}
          </div>
        ) : (
          children
        )}
      </main>

      {user && <IncomingCallListener />}
      {user && <QuranQuoteModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} />}
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }}
    >
      <LanguageProvider>
        <FirebaseClientProvider>
          <AuthProvider>
            <StreamVideoProvider>
              <StreamUserProvider>
                <UnreadProvider>
                  <ViewProvider>
                    <Suspense fallback={null}>
                      <AppContent>{children}</AppContent>
                    </Suspense>
                  </ViewProvider>
                </UnreadProvider>
              </StreamUserProvider>
            </StreamVideoProvider>
            <Toaster />
          </AuthProvider>
        </FirebaseClientProvider>
      </LanguageProvider>
    </SWRConfig>
  );
}
