'use client';

import { useMemo } from 'react';
import { LayoutList } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAnnouncementsFeed } from '@/hooks/use-announcements-feed';

export default function AnnouncementIcon() {
  const { language } = useLanguage();
  
  // Brug den samme centraliserede hook som siden bruger
  const { feedItems, isLoading } = useAnnouncementsFeed();

  const text: Record<string, Record<string, string>> = {
    notifications: { da: 'Opslag', en: 'Posts', ar: 'الإعلانات' , so: "Qoraalo"},
  };

  const t = (key: string) => text[key]?.[language] || text[key]?.['en'];

  // Tæl alle nye elementer (meddelelser, begivenheder, undersøgelser, møder)
  const unreadCount = useMemo(() => {
    if (!feedItems) return 0;
    return feedItems.filter(item => item.isNew).length;
  }, [feedItems]);

  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div
      aria-label={t('notifications')}
      className="relative grid h-7 w-7 place-items-center"
    >
      <LayoutList className="h-6 w-6" />

      {!isLoading && unreadCount > 0 && (
        <span
          className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#E24B4B] px-1 text-[10px] font-bold leading-none text-white"
        >
          {badgeText}
        </span>
      )}

      <span className="sr-only">{t('notifications')}</span>
    </div>
  );
}
