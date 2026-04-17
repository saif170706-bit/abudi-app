'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, MoreVertical, Pencil, Trash2, Eye } from 'lucide-react';
import type { Event } from '@/types';
import RichRender from '@/components/ui/rich-render';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useFirebase } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useHaptic } from 'use-haptic';

const translations: Record<string, Record<Language, string>> = {
  deadline: { da: 'Frist', en: 'Deadline', ar: 'الموعد النهائي' , so: "Xilliga Kama Danbaysta"},
  enrolled: { da: 'tilmeldt', en: 'enrolled', ar: 'مسجل' , so: "Ladiiwaangeliyay"},
  createdBy: { da: 'Oprettet af', en: 'Created by', ar: 'تم الإنشاء بواسطة' , so: "Abuuray"},
  on: { da: 'den', en: 'on', ar: 'في' , so: "ku"},
  eventLabel: { da: 'Begivenhed', en: 'Event', ar: 'حدث' , so: "Dhacdo"},
  viewOverview: { da: 'Oversigt', en: 'Overview', ar: 'نظرة عامة' , so: "Dulmar"},
  edit: { da: 'Rediger', en: 'Edit', ar: 'تعديل' , so: "Beddel"},
  delete: { da: 'Slet', en: 'Delete', ar: 'حذف' , so: "Tirtir"},
};

interface AdminEventCardProps {
  event: Event;
  onEdit: (item: Event) => void;
  onViewOverview: (event: Event) => void;
}

export default function AdminEventCard({ event, onEdit, onViewOverview }: AdminEventCardProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();
  const { language } = useLanguage();
  const t = (key: string) => translations[key]?.[language] || translations[key]?.['en'];

  const handleDelete = async () => {
    triggerHaptic();
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'events', event.id));
      toast({ variant: 'primary', title: 'Begivenhed slettet' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Kunne ikke slette' });
    }
  };

  return (
    <Card className="overflow-hidden rounded-[28px] border-border bg-card shadow-sm transition-all">
      {event.imageUrl && (
        <div className="relative w-full overflow-hidden bg-muted">
          <img 
            src={event.imageUrl} 
            alt={event.title} 
            className="w-full h-auto object-contain block"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="px-3 h-6 border-none bg-blue-50 text-blue-600">
                {t('eventLabel')}
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold leading-tight break-words">{event.title}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted">
                <MoreVertical className="h-5 w-5 opacity-40" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-border shadow-xl">
              <DropdownMenuItem onSelect={() => onViewOverview(event)} className="rounded-xl h-11 font-bold gap-3">
                <Eye className="h-4 w-4" /> {t('viewOverview')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(event)} className="rounded-xl h-11 font-bold gap-3">
                <Pencil className="h-4 w-4" /> {t('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDelete} className="rounded-xl h-11 font-bold text-red-500 gap-3">
                <Trash2 className="h-4 w-4" /> {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground leading-relaxed line-clamp-3 break-words">
          <RichRender value={event.description} />
        </div>
        <div className="flex flex-wrap gap-4 text-[12px] text-muted-foreground font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {event.registrationDeadline?.toDate ? event.registrationDeadline.toDate().toLocaleDateString(language, { day: 'numeric', month: 'short' }) : '...'}
            </span>
          </div>
          {event.capacity > 0 && (
            <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                <span>{event.registrationCount || 0} / {event.capacity} {t('enrolled')}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {t('createdBy')} {event.authorName}
      </CardFooter>
    </Card>
  );
}