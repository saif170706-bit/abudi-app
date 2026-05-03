'use client';

import React from 'react';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useUserProfile } from '@/hooks/use-user-profile';
import AvatarUploader from '@/components/profile/AvatarUploader';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera } from 'lucide-react';
import { IslamicDivider } from '@/components/ui/primitives';
import { usePathname } from 'next/navigation';

export default function MandatoryPhotoSetup() {
  const { tGlobal } = useGlobalTranslation();
  const { profile, isLoading } = useUserProfile();
  const pathname = usePathname();

  const isAuthPage = ['/', '/forgot-password', '/privacy', '/terms'].includes(pathname);

  // If profile is still loading, we are on an auth page, or user already has a photo, don't show anything
  if (isLoading || isAuthPage || !profile || profile.photoURL) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] flex items-center justify-center bg-background/80 backdrop-blur-xl p-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card overflow-hidden shadow-2xl"
        >
          <div className="glass-card-inner !p-10 flex flex-col items-center text-center space-y-8">
            <div className="space-y-3">
              <h1 className="text-3xl font-display text-primary tracking-tight">
                {tGlobal('Tilføj profilbillede')}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                {tGlobal('Hjælp os med at genkende dig')}
              </p>
            </div>

            <IslamicDivider />

            <div className="relative">
              <AvatarUploader label={tGlobal('Vælg Billede')} />
              {!profile.photoURL && (
                <div className="absolute -top-2 -right-2 bg-accent text-white p-2 rounded-xl shadow-lg border-2 border-white animate-bounce">
                  <Camera className="h-4 w-4" />
                </div>
              )}
            </div>

            <p className="text-sm font-medium text-primary/60 leading-relaxed max-w-[280px]">
              {tGlobal('Et profilbillede gør det lettere for dine lærere og medstuderende at identificere dig. Dette trin er påkrævet for at fortsætte.')}
            </p>

            <div className="w-full pt-4">
               {/* 
                  We don't need a "Continue" button because the profile.photoURL 
                  will automatically become truthy once the upload finishes, 
                  and this component will unmount itself.
               */}
               <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/20" />
                  {tGlobal('Venter på billede')}
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/20" />
               </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
