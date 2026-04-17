'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Pencil, Trash2, Video, Clock, PlayCircle, RotateCcw } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useFirebase } from '@/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useHaptic } from 'use-haptic';
import LivestreamBroadcastSheet from './LivestreamBroadcastSheet';
import LivestreamPlayerSheet from './LivestreamPlayerSheet';

interface Props {
  livestream: any;
  onEdit: (item: any) => void;
}

export default function AdminLivestreamCard({ livestream, onEdit }: Props) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const handleDelete = async () => {
    triggerHaptic();
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'livestreams', livestream.id));
      toast({ variant: 'primary', title: 'Møde slettet' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Kunne ikke slette' });
    }
  };

  const handleReset = async () => {
    triggerHaptic();
    if (!firestore) return;
    try {
      // Generate a fresh session ID and clear old recording state
      await updateDoc(doc(firestore, 'livestreams', livestream.id), {
        recordingUrl: null,
        isRecordingAvailable: false,
        isActive: false,
        callId: `meeting-${Date.now()}` 
      });
      toast({ variant: 'primary', title: 'Møde nulstillet - klar til start' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Kunne ikke nulstille møde' });
    }
  };

  const displayTime = livestream.scheduledAt?.toDate 
    ? livestream.scheduledAt.toDate().toLocaleDateString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : livestream.createdAt?.toDate?.().toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });

  return (
    <Card className="overflow-hidden rounded-[28px] border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="px-3 h-6 border-none bg-purple-50 text-purple-600 font-bold uppercase text-[10px]">
                Møde
              </Badge>
              {livestream.isActive ? (
                <Badge className="bg-red-600 text-white animate-pulse border-none px-3 h-6 font-bold uppercase text-[10px]">
                  LIVE
                </Badge>
              ) : livestream.isRecordingAvailable && (
                <Badge className="bg-[#2E9D63] text-white border-none px-3 h-6 font-bold uppercase text-[10px]">
                  OPTAGELSE
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl font-bold leading-tight break-words">{livestream.title}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted">
                <MoreVertical className="h-5 w-5 opacity-40" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-border shadow-xl">
              <DropdownMenuItem onSelect={() => onEdit(livestream)} className="rounded-xl h-11 font-bold gap-3">
                <Pencil className="h-4 w-4" /> Rediger
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDelete} className="rounded-xl h-11 font-bold text-red-500 gap-3">
                <Trash2 className="h-4 w-4" /> Slet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {livestream.description}
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">
          <Clock className="h-3.5 w-3.5" />
          <span>{displayTime}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-6 flex flex-col gap-3">
        {livestream.isActive ? (
          <Button 
            onClick={() => setIsBroadcastOpen(true)}
            className="w-full h-12 rounded-2xl font-bold gap-3 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
          >
            <Video className="h-5 w-5" />
            Fortsæt Møde
          </Button>
        ) : livestream.isRecordingAvailable ? (
          <>
            <Button 
              onClick={() => setIsPlayerOpen(true)}
              className="w-full h-12 rounded-2xl font-bold gap-3 bg-[#111214] hover:bg-black text-white shadow-lg shadow-black/10"
            >
              <PlayCircle className="h-5 w-5" />
              Se Optagelse
            </Button>
            <Button 
              variant="outline"
              onClick={handleReset}
              className="w-full h-12 rounded-2xl font-bold gap-3 border-border text-muted-foreground hover:bg-black/5"
            >
              <RotateCcw className="h-4 w-4" />
              Start forfra
            </Button>
          </>
        ) : (
          <Button 
            onClick={() => setIsBroadcastOpen(true)}
            className="w-full h-12 rounded-2xl font-bold gap-3 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-green-500/10"
          >
            <Video className="h-5 w-5" />
            Start Møde
          </Button>
        )}
      </CardFooter>

      <LivestreamBroadcastSheet 
        livestream={livestream} 
        isOpen={isBroadcastOpen} 
        onClose={() => setIsBroadcastOpen(false)} 
      />

      <LivestreamPlayerSheet
        livestream={livestream}
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
      />
    </Card>
  );
}
