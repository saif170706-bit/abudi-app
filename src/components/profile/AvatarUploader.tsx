'use client';

import * as React from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { getInitials } from '@/lib/utils';
import { Loader2, Camera } from 'lucide-react';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

interface AvatarUploaderProps {
  label?: string;
  onUploadSuccess?: (url: string) => void;
  currentImage?: string;
  displayName?: string;
  isUserAvatar?: boolean;
}

export default function AvatarUploader({ 
  label, 
  onUploadSuccess, 
  currentImage, 
  displayName, 
  isUserAvatar = true 
}: AvatarUploaderProps) {
  const { firestore, firebaseApp, auth } = useFirebase();
  const { user } = useUser();
  const { profile, mutate } = useUserProfile();
  const { toast } = useToast();
  const { tGlobal } = useGlobalTranslation();

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file || !firebaseApp) return;

    if (isUserAvatar && (!user || !firestore || !profile)) return;

    // Validation
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: tGlobal('Forkert filtype'), description: tGlobal('Vælg venligst et billede (png, jpg, etc.).') });
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: tGlobal('For stor fil'), description: tGlobal('Billedet må højst fylde 5MB.') });
      e.target.value = '';
      return;
    }

    setUploading(true);

    try {
      const storage = getStorage(firebaseApp);
      
      const photoToClean = isUserAvatar ? profile?.photoURL : currentImage;

      // Cleanup previous avatar if it exists and is a storage URL
      if (photoToClean && photoToClean.includes('firebasestorage.googleapis.com')) {
        try {
          const oldRef = ref(storage, photoToClean);
          await deleteObject(oldRef).catch((e: any) => console.log("Old avatar delete ignored:", e));
        } catch (err) {
          console.warn("Could not delete old avatar:", err);
        }
      }

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const folder = isUserAvatar ? `avatars/${user?.uid}` : `groups/${Date.now()}`;
      const path = `${folder}/avatar_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);

      // Upload fil
      const result = await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(result.ref);

      if (isUserAvatar && firestore && user && profile) {
        // Opdater Firestore
        const collectionName = `${profile.role}s`;
        const userDocRef = doc(firestore, collectionName, user.uid);

        await updateDoc(userDocRef, {
          photoURL: url,
          photoUpdatedAt: serverTimestamp(),
        });

        // Opdater Firebase Auth
        if (auth?.currentUser) {
          await updateAuthProfile(auth.currentUser, { photoURL: url });
        }

        // Vigtigt: Opdater den globale profil-tilstand og VENT på det
        await mutate();
      }

      if (onUploadSuccess) {
        onUploadSuccess(url);
      }
      
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      toast({
        variant: 'destructive',
        title: tGlobal('Upload fejlede'),
        description: tGlobal('Der opstod en fejl under upload af billedet.'),
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const displayPhoto = isUserAvatar ? profile?.photoURL : currentImage;
  const initials = getInitials(isUserAvatar ? profile?.displayName : displayName);

  return (
    <div className="flex flex-col items-center gap-4">
      <Input
        ref={fileInputRef}
        id="avatar-input"
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />
      
      <div className="relative group">
        <Avatar className="h-28 w-28 border-4 border-white shadow-md transition-transform group-hover:scale-[1.02]">
          <AvatarImage 
            src={displayPhoto || undefined} 
            alt="Profilbillede" 
            className="object-cover" 
          />
          <AvatarFallback className="text-3xl bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-[2px]">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onPickFile}
        disabled={uploading}
        className="rounded-full px-6 font-bold border-border hover:bg-black/5"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {tGlobal('Uploader...')}
          </>
        ) : (
          <>
            <Camera className="mr-2 h-4 w-4" />
            {label || tGlobal('skift billede')}
          </>
        )}
      </Button>
    </div>
  );
}
