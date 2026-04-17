'use client';

// All data is fetched client-side. Force static = serve from CDN, no cold starts.
export const dynamic = 'force-static';

import { useState, useEffect, Suspense } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useView } from '@/context/ViewContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useMembersData } from '@/hooks/use-members-data';
import { useAnnouncementsFeed } from '@/hooks/use-announcements-feed';
import { useAbsenceReport } from '@/hooks/use-absence-report';
import { useAdminMail } from '@/hooks/use-admin-mail';

// Admin Components
import AdminHome from '@/components/admin/AdminHome';
import AdminMembers from '@/components/admin/AdminMembers';
import AdminPosts from '@/components/admin/AdminPosts';
import AdminAbsence from '@/components/admin/AdminAbsence';
import AdminWaitingList from '@/components/admin/AdminWaitingList';
import AdminMail from '@/components/admin/AdminMail';

/**
 * Pre-warms member profile pictures AND announcement banners in the browser cache.
 */
function AdminImagePrewarmer() {
  const { members } = useMembersData();
  const { feedItems } = useAnnouncementsFeed();
  
  const memberPhotoUrls = members
    ?.map(m => m.photoURL)
    .filter((url): url is string => !!url) || [];

  const bannerUrls = feedItems
    ?.map(item => item.imageUrl)
    .filter((url): url is string => !!url) || [];

  // Combine and remove duplicates
  const allUrls = Array.from(new Set([...memberPhotoUrls, ...bannerUrls]));

  if (allUrls.length === 0) return null;

  return (
    <div 
      style={{ display: 'none', visibility: 'hidden', width: 0, height: 0, position: 'absolute' }} 
      aria-hidden="true"
    >
      {allUrls.map(url => (
        <img key={url} src={url} alt="" />
      ))}
    </div>
  );
}

function AdminDashboard() {
  const { user, loading: isUserLoading } = useUser();
  const { profile } = useUserProfile();
  const router = useRouter();
  const { view, setIsSubView } = useView();
  
  // Start background fetching for all admin modules
  useMembersData();
  useAnnouncementsFeed();
  useAbsenceReport();
  useAdminMail();

  useEffect(() => {
    const topLevelViews = ['overview', 'admin-members', 'admin-absence', 'admin-posts', 'admin-mail'];
    setIsSubView(!topLevelViews.includes(view));
  }, [view, setIsSubView]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/');
    } else if (!isUserLoading && profile && profile.role !== 'admin') {
      // Redirect non-admins away from admin area
      router.replace(profile.role === 'teacher' ? '/teacher-dashboard' : '/student');
    }
  }, [user, isUserLoading, profile, router]);

  if (isUserLoading || !user || !profile || profile.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case 'admin-members':
        return <AdminMembers />;
      case 'admin-absence':
        return <AdminAbsence />;
      case 'admin-posts':
        return <AdminPosts />;
      case 'admin-waiting-list':
        return <AdminWaitingList />;
      case 'admin-mail':
        return <AdminMail />;
      case 'overview':
      default:
        return <AdminHome />;
    }
  };

  return (
    <Suspense fallback={null}>
      <AdminImagePrewarmer />
      <main className="min-h-screen bg-background">
        {renderContent()}
      </main>
    </Suspense>
  );
}

export default function AdminPage() {
  return <AdminDashboard />;
}
