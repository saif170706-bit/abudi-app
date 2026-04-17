'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Users, Clock, ArrowRight, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from 'use-haptic';
import LivestreamViewSheet from './LivestreamViewSheet';
import LivestreamPlayerSheet from './LivestreamPlayerSheet';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useLanguage, type Language } from '@/context/LanguageContext';

interface Props {
  livestream: any;
  isNew?: boolean;
}

export default function LivestreamCard({ livestream, isNew }: Props) {
  const { triggerHaptic } = useHaptic();
  const [isOpen, setIsOpen] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const { language } = useLanguage();
  const { tGlobal } = useGlobalTranslation();

  const handleOpen = () => {
    triggerHaptic();
    setIsOpen(true);
  };

  const handleOpenPlayer = () => {
    triggerHaptic();
    setIsPlayerOpen(true);
  };

  const displayTime = livestream.scheduledAt?.toDate 
    ? livestream.scheduledAt.toDate().toLocaleDateString(language === 'ar' ? 'ar-SA' : language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : livestream.createdAt?.toDate?.().toLocaleDateString(language === 'ar' ? 'ar-SA' : language, { day: 'numeric', month: 'short' });

  return (
    <>
      <Card className={cn(
        "group relative border-none bg-card/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden transition-all duration-500",
        "rounded-[40px] p-1 flex flex-col active:scale-[0.98]",
        isNew ? "before:absolute before:inset-0 before:p-[1px] before:rounded-[40px] before:bg-gradient-to-br before:from-purple-500 before:to-transparent before:-z-10" : ""
      )}>
        <div className="bg-card dark:bg-zinc-950/40 rounded-[39px] h-full flex flex-col overflow-hidden">
        {livestream.imageUrl && (
          <div className="relative w-full overflow-hidden bg-purple-50/30">
            <img src={livestream.imageUrl} alt={livestream.title} className="w-full h-auto object-contain block" />
          </div>
        )}

        <CardHeader className="pb-2 pt-8 px-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-none font-black px-3 h-6 uppercase tracking-wider text-[9px]">
                {tGlobal('Møde')}
              </Badge>
              {livestream.isActive ? (
                <Badge className="bg-red-500 text-white animate-pulse border-none px-3 h-6 font-black uppercase tracking-wider text-[9px]">
                   ● {tGlobal('LIVE NU')}
                </Badge>
              ) : livestream.isRecordingAvailable ? (
                <Badge className="bg-[#2E9D63]/10 text-[#2E9D63] border-none px-3 h-6 font-black uppercase tracking-wider text-[9px]">
                  {tGlobal('OPTAGELSE')}
                </Badge>
              ) : isNew && (
                <Badge className="bg-purple-500 text-white border-none font-black px-3 h-6 uppercase tracking-wider text-[9px]">
                  {tGlobal('Ny')}
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl font-display font-bold leading-tight text-foreground dark:text-white pt-1 break-words">
              {livestream.title}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pb-6 px-8">
          <div className="text-base text-foreground/75 dark:text-white/70 leading-relaxed font-medium line-clamp-3 break-words">
            {livestream.description}
          </div>
          
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
            <Clock className="h-4 w-4 opacity-40" />
            <span>{displayTime}</span>
          </div>
        </CardContent>

        <CardFooter className="px-8 pb-8 pt-0">
          {livestream.isActive ? (
            <Button 
              onClick={handleOpen}
              className={cn(
                "w-full h-14 rounded-2xl font-black text-[15px] shadow-lg flex items-center justify-between px-6 transition-all",
                "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20"
              )}
            >
              <div className="flex items-center gap-3">
                <PlayCircle className="h-6 w-6" />
                <span>{tGlobal('Join møde')}</span>
              </div>
              <ArrowRight className="h-5 w-5 opacity-40" />
            </Button>
          ) : livestream.isRecordingAvailable ? (
            <Button 
              onClick={handleOpenPlayer}
              className="w-full h-14 rounded-2xl bg-foreground/90 dark:bg-white dark:hover:bg-white/90 text-background dark:text-black font-black text-[15px] shadow-lg shadow-black/10 flex items-center justify-between px-6 transition-all"
            >
              <div className="flex items-center gap-3">
                <Video className="h-6 w-6" />
                <span>{tGlobal('Se møde')}</span>
              </div>
              <ArrowRight className="h-5 w-5 opacity-40" />
            </Button>
          ) : (
            <Button 
              disabled
              className="w-full h-14 rounded-2xl font-black text-[15px] bg-muted/40 text-muted-foreground/40 border-none shadow-none flex items-center justify-center px-6"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 opacity-40" />
                <span>{tGlobal('Møde ikke startet')}</span>
              </div>
            </Button>
          )}
        </CardFooter>
      </div>
    </Card>

      <LivestreamViewSheet 
        livestream={livestream} 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />

      <LivestreamPlayerSheet
        livestream={livestream}
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
      />
    </>
  );
}
