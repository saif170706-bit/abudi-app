'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { doc, writeBatch } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EventCard from '@/components/events/EventCard';
import SurveyCard from '@/components/surveys/SurveyCard';
import LivestreamCard from '@/components/livestream/LivestreamCard';
import RichRender from '@/components/ui/rich-render';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { useAnnouncementsFeed } from '@/hooks/use-announcements-feed';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionLabel, EmptyState, LoadingSpinner } from '@/components/ui/primitives';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Calendar, User, Clock, ChevronRight } from 'lucide-react';

interface AnnouncementsProps {
  BackButton: React.ComponentType;
}

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

// ... (types same) ...

export default function Announcements({ BackButton }: AnnouncementsProps) {
  const { user: authUser } = useUser();
  const { profile: user } = useUserProfile();
  const { firestore } = useFirebase();
  const { language } = useLanguage();
  const { tGlobal } = useGlobalTranslation();
  
  const { feedItems, isLoading } = useAnnouncementsFeed();
  
  const unreadItemsOnLoad = useRef<string[]>([]);
  const hasSetTimer = useRef(false);

  useEffect(() => {
    if (isLoading || hasSetTimer.current || !user || feedItems.length === 0) return;
    
    const unread = feedItems.filter(item => item.isNew).map(item => item.id);
    if (unread.length > 0) {
      unreadItemsOnLoad.current = unread;
      hasSetTimer.current = true;
    }
  }, [feedItems, isLoading, user]);

  useEffect(() => {
    return () => {
      const currentUid = authUser?.uid || user?.id;
      if (unreadItemsOnLoad.current.length > 0 && firestore && currentUid) {
        const batch = writeBatch(firestore);
        unreadItemsOnLoad.current.forEach(id => {
          const userAnnRef = doc(firestore, 'users', currentUid, 'announcements', id);
          batch.set(userAnnRef, { isRead: true });
        });
        batch.commit().catch(err => console.error("Failed to mark items as read:", err));
      }
    };
  }, [firestore, authUser?.uid, user?.id]);
  
  const lastUnreadIndex = React.useMemo(() => {
    return feedItems.map(item => item.isNew).lastIndexOf(true);
  }, [feedItems]);

  const formatDate = (date: any) => {
    if (!date || !date.toDate) return '...';
    return date.toDate().toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (isLoading && feedItems.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-transparent">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  const today = new Date().toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex-1 w-full max-w-lg mx-auto pb-40">
      <div className="w-full px-8 pt-20 pb-10">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-1">
            <p className="text-primary/40 dark:text-white/30 text-xs font-bold uppercase tracking-widest">
              {today}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-display text-primary dark:text-white/90 tracking-tight">
              {tGlobal('Opslag')}
            </h1>
            <div className="flex -space-x-2">
              {/* Optional: Show active users or just a flourish */}
              <div className="h-8 w-8 rounded-full border-2 border-background bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                {feedItems.length}
              </div>
            </div>
          </div>
        </motion.div>

        {feedItems.length === 0 ? (
          <EmptyState 
            title={tGlobal('Ingen Opslag')}
            description={tGlobal('Der er ingen nye opslag i øjeblikket.')}
            icon={<div className="text-3xl">📢</div>}
            className="mt-8 bg-card/50 backdrop-blur-xl border border-border/40 rounded-[32px] p-12"
          />
        ) : (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.12 } }
            }}
            className="space-y-6"
          >
            {feedItems.map((item, index) => {
              const showSeparator = lastUnreadIndex !== -1 && index === lastUnreadIndex && (lastUnreadIndex < feedItems.length - 1);
              
              return (
                <React.Fragment key={item.id}>
                  <motion.div
                    variants={{
                      hidden: { y: 30, opacity: 0, scale: 0.95 },
                      visible: { y: 0, opacity: 1, scale: 1 }
                    }}
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    {item.type === 'event' ? (
                      <EventCard event={item as any} isNew={item.isNew} />
                    ) : item.type === 'survey' ? (
                      <SurveyCard survey={item as any} isNew={item.isNew} />
                    ) : item.type === 'livestream' ? (
                      <LivestreamCard livestream={item as any} isNew={item.isNew} />
                    ) : (
                      <Card className={cn(
                        "group relative border-none bg-card/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden transition-all duration-500",
                        "rounded-[40px] p-1 flex flex-col",
                        item.isNew ? "before:absolute before:inset-0 before:p-[1px] before:rounded-[40px] before:bg-gradient-to-br before:from-accent before:to-transparent before:-z-10" : ""
                      )}>
                        <div className="bg-card dark:bg-zinc-950/40 rounded-[39px] h-full flex flex-col overflow-hidden">
                          
                          {/* Image Section */}
                          {item.imageUrl && (
                            <div className="relative w-full aspect-[16/10] overflow-hidden">
                              <img 
                                src={item.imageUrl} 
                                alt={item.title} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60" />
                              
                              {item.isNew && (
                                <div className="absolute top-6 right-6">
                                  <div className="bg-accent text-primary px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg animate-pulse">
                                    {tGlobal('Ny')}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="p-8 flex flex-col h-full">
                            {/* Author Info Header */}
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-background shadow-md">
                                  <AvatarImage src={undefined} />
                                  <AvatarFallback className="bg-primary text-white text-xs font-bold font-display">
                                    {getInitials(item.authorName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-primary dark:text-white/90 leading-tight">
                                    {item.authorName}
                                  </span>
                                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {formatDate(item.createdAt)}
                                  </span>
                                </div>
                              </div>

                              {!item.imageUrl && item.isNew && (
                                <div className="bg-accent/10 text-accent px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest">
                                  {tGlobal('Ny')}
                                </div>
                              )}
                            </div>

                            <CardTitle className="text-2xl font-display text-primary dark:text-white font-bold tracking-tight mb-4 leading-tight">
                              {item.title}
                            </CardTitle>

                            <CardContent className="p-0 text-base text-foreground/75 dark:text-white/70 leading-relaxed font-medium">
                              <RichRender value={item.content} />
                            </CardContent>

                            <div className="mt-8 pt-6 border-t border-border/10 flex items-center justify-between">
                               <div className="flex items-center gap-1 text-accent text-[11px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                 Læs mere <ChevronRight className="h-3 w-3" />
                               </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}
                  </motion.div>

                  {showSeparator && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      className="py-12"
                    >
                      <SectionLabel className="mb-0 text-center border-none pl-0 flex items-center gap-4 justify-center">
                        <div className="h-px bg-border/20 flex-1" />
                        {tGlobal('Tidligere Læst')}
                        <div className="h-px bg-border/20 flex-1" />
                      </SectionLabel>
                    </motion.div>
                  )}
                </React.Fragment>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
