'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useState, useMemo, useRef } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Loader2, 
  Plus, 
  Megaphone, 
  Calendar, 
  BarChart2, 
  Video, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Search, 
  X, 
  Image as ImageIconLucide, 
  PlusCircle,
  Type as TypeIcon,
  ListFilter,
  Users as UsersIcon,
  ChevronRight,
  BarChart2 as BarChart2Icon,
  User as UserIcon,
  Mail,
  Link as LinkIcon,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { Progress } from '@/components/ui/progress';
import RichTextarea from '@/components/ui/rich-textarea';
import RichRender from '@/components/ui/rich-render';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn, getInitials } from '@/lib/utils';
import { useAnnouncementsFeed } from '@/hooks/use-announcements-feed';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { useHaptic } from 'use-haptic';
import { useMembersData, type CombinedUser } from '@/hooks/use-members-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import AdminEventCard from '@/components/admin/AdminEventCard';
import AdminLivestreamCard from '@/components/livestream/AdminLivestreamCard';
import type { SurveyQuestion } from '@/types';
import { sendPostNotifications } from '@/lib/send-post-notifications';

const translations: Record<string, Record<Language, string>> = {
  admin: { da: 'Admin', en: 'Admin', ar: 'مسؤول' , so: "Maamule"},
  posts: { da: 'Opslag', en: 'Posts', ar: 'المنشورات' , so: "Qoraalo"},
  newAnnouncement: { da: 'Ny Meddelelse', en: 'New Announcement', ar: 'إعلان جديد' , so: "Ogaysiis Cusub"},
  newEvent: { da: 'Ny Begivenhed', en: 'New Event', ar: 'حدث جديد' , so: "Dhacdo Cusub"},
  newSurvey: { da: 'Ny Undersøgelse', en: 'New Survey', ar: 'استبيan جديد' , so: "Sahan Cusub"},
  newMeeting: { da: 'Nyt Møde', en: 'New Meeting', ar: 'اجتماع جديد' , so: "Kulan Cusub"},
  noActivePosts: { da: 'Ingen aktive opslag.', en: 'No active posts.', ar: 'لا توجد منشورات نشطة.' , so: "Qoraalo firfircoon majiraan."},
  announcementLabel: { da: 'Meddelelse', en: 'Announcement', ar: 'إعلان' , so: "Ogaysiis"},
  eventLabel: { da: 'Begivenhed', en: 'Event', ar: 'حدث' , so: "Dhacdo"},
  surveyLabel: { da: 'Undersøgelse', en: 'Survey', ar: 'استبيان' , so: "Sahan"},
  meetingLabel: { da: 'Møde', en: 'Meeting', ar: 'اجتماع' , so: "Kulan"},
  createAnnouncement: { da: 'Opret Meddelelse', en: 'Create Announcement', ar: 'إنشاء إعلان' , so: "Abuur Ogaysiis"},
  editAnnouncement: { da: 'Rediger Meddelelse', en: 'Edit Announcement', ar: 'تعديل الإعلان' , so: "Wax Ka Beddel Ogaysiis"},
  headline: { da: 'Overskrift', en: 'Headline', ar: 'العنوان' , so: "Cwaan"},
  headlinePlaceholder: { da: 'Fx: Vigtig information', en: 'E.g.: Important information', ar: 'مثال: معلومات هامة' , so: "Tusaale: Macluumaad Muhiim ah"},
  targetAudience: { da: 'Målgruppe', en: 'Target Audience', ar: 'الجمهور المستهدف' , so: "Daawadayaasha Bartilmaameedka"},
  targetAll: { da: 'Alle', en: 'All', ar: 'الكل' , so: "Dhammaan"},
  targetTeachers: { da: 'Lærere', en: 'Teachers', ar: 'المعلمون' , so: "Macallimiinta"},
  targetStudents: { da: 'Elever', en: 'Students', ar: 'الطلاب' , so: "Ardayda"},
  targetSpecific: { da: 'Specifikke Brugere', en: 'Specific Users', ar: 'مستخدمون محددون' , so: "Isticmaalayaal U Gaar Ah"},
  targetGender: { da: 'Køn (Målgruppe)', en: 'Gender (Target)', ar: 'الجنس (المستهدف)' , so: "Jinsi (Bartilmaameed)"},
  allGenders: { da: 'Alle', en: 'All', ar: 'الكل' , so: "Dhammaan"},
  menOnly: { da: 'Kun Mænd', en: 'Men only', ar: 'الرجال فقط' , so: "Ragga oo kaliya"},
  womenOnly: { da: 'Kun Kvinder', en: 'Women only', ar: 'النساء فقط' , so: "Dumarka oo kaliya"},
  searchRecipients: { da: 'Søg efter modtagere', en: 'Search for recipients', ar: 'البحث عن مستلمين' , so: "Raadi dadka loo dirayo"},
  selectedRecipients: { da: 'Valgte modtagere', en: 'Selected recipients', ar: 'المستلمون المختارون' , so: "Loo dirayaal la xushay"},
  content: { da: 'Indhold', en: 'Content', ar: 'المحتوى' , so: "Tusmada"},
  sendAnnouncement: { da: 'Send Meddelelse', en: 'Send Announcement', ar: 'إرسال الإعلان' , so: "Dir Ogaysiiska"},
  saveAnnouncement: { da: 'Gem Ændringer', en: 'Save Changes', ar: 'حفظ التغييرات' , so: "Kaydi Isbedelada"},
  title: { da: 'Titel', en: 'Title', ar: 'العنوان' , so: "Cinwaan"},
  eventTitlePlaceholder: { da: 'Begivenhedens navn', en: 'Event name', ar: 'اسم الحدث' , so: "Magaca Dhacdada"},
  meetingTitlePlaceholder: { da: 'Mødets navn', en: 'Meeting name', ar: 'اسم الاجتماع' , so: "Magaca Kulanka"},
  meetingTime: { da: 'Mødetidspunkt', en: 'Meeting Time', ar: 'موعد الاجتماع' , so: "Waqtiga Kulanka"},
  registrationDeadline: { da: 'Tilmeldingsfrist', en: 'Registration Deadline', ar: 'موعد التسجيل النهائي' , so: "Xilliga isqorista dhacayso"},
  surveyDeadline: { da: 'Udløbsfrist', en: 'Expiry Deadline', ar: 'موعد الانتهاء' , so: "Xilliga dhicitaanka"},
  capacity: { da: 'Kapacitet (0 for ubegrænset)', en: 'Capacity (0 for unlimited)', ar: 'السعة (0 لغير محدود)' , so: "Awooda (0 ee aan xad lahayn)"},
  allowExternal: { da: 'Tillad eksterne tilmeldinger', en: 'Allow external registrations', ar: 'السماح بالتسجيل الخارجي' , so: "Oggolow isdiiwaangelinta dibadda"},
  description: { da: 'Beskrivelse', en: 'Description', ar: 'الوصف' , so: "Sharaxaad"},
  createEvent: { da: 'Opret Begivenhed', en: 'Create Event', ar: 'إنشاء الحدث' , so: "Abuur Dhacdo"},
  createSurvey: { da: 'Opret Undersøgelse', en: 'Create Survey', ar: 'إنشاء استبيان' , so: "Abuur Sahan"},
  createMeeting: { da: 'Opret Møde', en: 'Create Meeting', ar: 'إنشاء الاجتماع' , so: "Abuur Kulan"},
  editEvent: { da: 'Rediger Begivenhed', en: 'Edit Event', ar: 'تعديل الحدث' , so: "Wax ka beddel Dhacdo"},
  editSurvey: { da: 'Rediger Undersøgelse', en: 'Edit Survey', ar: 'تعديل الاستبيان' , so: "Wax ka beddel Sahan"},
  editMeeting: { da: 'Rediger Møde', en: 'Edit Meeting', ar: 'تعديل الاجتماع' , so: "Wax ka beddel Kulan"},
  saveEvent: { da: 'Gem Ændringer', en: 'Save Changes', ar: 'حفظ التغييرات' , so: "Kaydi Isbedelada"},
  saveSurvey: { da: 'Gem Ændringer', en: 'Save Changes', ar: 'حفظ التغييرات' , so: "Kaydi Isbedelada"},
  saveMeeting: { da: 'Gem Ændringer', en: 'Save Changes', ar: 'حفظ التغييرات' , so: "Kaydi Isbedelada"},
  postDeleted: { da: 'Opslag slettet', en: 'Post deleted', ar: 'تم حذف المنشور' , so: "Qoraal la tirtiray"},
  deleteError: { da: 'Kunne ikke slette', en: 'Could not delete', ar: 'تعذر الحذف' , so: "Lama tirtiri karin"},
  postSaved: { da: 'Meddelelse sendt', en: 'Announcement sent', ar: 'تم إرسال الإعلان' , so: "Ogaysiiska waa la diray"},
  postUpdated: { da: 'Opslag opdateret', en: 'Post updated', ar: 'تم تحديث المنشور' , so: "Qoraal la cusboonaysiiyay"},
  eventSaved: { da: 'Begivenhed oprettet', en: 'Event created', ar: 'تم إنشاء الحدث' , so: "Dhacdo la abuuray"},
  surveySaved: { da: 'Undersøgelse oprettet', en: 'Survey created', ar: 'تم إنشاء الاستبيان' , so: "Sahan la abuuray"},
  meetingSaved: { da: 'Møde oprettet', en: 'Meeting created', ar: 'تم إنشاء الاجتماع' , so: "Kulan la abuuray"},
  by: { da: 'Af', en: 'By', ar: 'بواسطة' , so: "Waxaa Kordhiyay"},
  bannerImage: { da: 'Banner Billede', en: 'Banner Image', ar: 'صورة الشعار' , so: "Sawirka Boodhka"},
  uploadBanner: { da: 'Upload Banner', en: 'Upload Banner', ar: 'تحميل الشعار' , so: "Soo Rar Boodhka"},
  formBuilder: { da: 'Formular Bygger', en: 'Form Builder', ar: 'منشئ النماذج' , so: "Dhisaha Foomka"},
  textField: { da: 'Tekst', en: 'Text', ar: 'نص' , so: "Qoraal"},
  choiceField: { da: 'Valg', en: 'Choice', ar: 'خيار' , so: "Dooq"},
  scaleField: { da: 'Skala (1-5)', en: 'Scale (1-5)', ar: 'مقياس (١-٥)' , so: "Qiyaas (1-5)"},
  isRequired: { da: 'Påkrævet', en: 'Required', ar: 'مطلوب' , so: "Loo baahan yahay"},
  allowMultiple: { da: 'Tillad flere valg', en: 'Allow multiple', ar: 'خيارات متعددة' , so: "Oggoloow in ka badan hal"},
  addOption: { da: 'Tilføj Mulighed', en: 'Add Option', ar: 'إضافة خيار' , so: "Kudar Dooq"},
  eventOverview: { da: 'Begivenhedsoversigt', en: 'Event Overview', ar: 'نظرة عامة على الحدث' , so: "Dulmarka Dhacdada"},
  surveyOverview: { da: 'Undersøgelsesresultater', en: 'Survey Results', ar: 'نتائج الاستبيان' , so: "Natiijada Sahanka"},
  averageScore: { da: 'Gennemsnit', en: 'Average', ar: 'المعدل' , so: "Iskucelcelis"},
  noResponses: { da: 'Ingen besvarelser endnu.', en: 'No responses yet.', ar: 'لا توجد ردود بعد.' , so: "Wali jawaabo majiraan."},
  noRegistrations: { da: 'Ingen tilmeldinger endnu.', en: 'No registrations yet.', ar: 'لا توجد تسجيلات بعد.' , so: "Wali isdiiwaangelin majirto."},
  searchRegistrations: { da: 'Søg efter deltagere...', en: 'Search for participants...', ar: 'البحث عن مشاركين...' , so: "Raadi ka qaybgalayaasha..."},
  viewAnswers: { da: 'Se svar', en: 'View answers', ar: 'عرض الإجابات' , so: "Eeg jawaabaha"},
  totalParticipants: { da: 'Tilmeldte i alt', en: 'Total sign-ups', ar: 'إجمالي المسجلين' , so: "Wadarta isdiiwaangelinta"},
  totalResponses: { da: 'Total deltagelse', en: 'Total participation', ar: 'إجمالي المشاركة' , so: "Wadarta ka qaybgalka"},
  responsesCount: { da: '{count} besvarelser', en: '{count} responses', ar: '{count} ردود' , so: "{count} jawaabood"},
};

const getScoreColor = (score: number) => {
  if (score < 2.5) return 'text-red-500';
  if (score < 3.5) return 'text-amber-500';
  if (score < 4.5) return 'text-lime-600';
  return 'text-primary';
};

const getBarColor = (val: number) => {
  switch (val) {
    case 1: return 'bg-red-500';
    case 2: return 'bg-orange-400';
    case 3: return 'bg-amber-400';
    case 4: return 'bg-lime-500';
    case 5: return 'bg-green-600';
    default: return 'bg-muted';
  }
};

type TargetType = 'all' | 'teachers' | 'students' | 'specific' | 'man' | 'woman';

const TargetAudienceFields = ({
  targetAudience,
  setTargetAudience,
  targetGender,
  setTargetGender,
  recipientSearch,
  setRecipientSearch,
  selectedRecipients,
  setSelectedRecipients,
  allMembers,
  triggerHaptic,
  t
}: {
  targetAudience: TargetType;
  setTargetAudience: (v: TargetType) => void;
  targetGender: 'all' | 'man' | 'woman';
  setTargetGender: (v: 'all' | 'man' | 'woman') => void;
  recipientSearch: string;
  setRecipientSearch: (v: string) => void;
  selectedRecipients: CombinedUser[];
  setSelectedRecipients: (v: CombinedUser[]) => void;
  allMembers: CombinedUser[];
  triggerHaptic: () => void;
  t: (key: string) => string;
}) => {
  const { tGlobal } = useGlobalTranslation();
  
  return (
  <div className="space-y-6">
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('targetAudience')}</Label>
      <Select onValueChange={(v: any) => { triggerHaptic(); setTargetAudience(v); }} value={targetAudience}>
        <SelectTrigger className="h-12 rounded-xl border-border bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('targetAll')}</SelectItem>
          <SelectItem value="teachers">{t('targetTeachers')}</SelectItem>
          <SelectItem value="students">{t('targetStudents')}</SelectItem>
          <SelectItem value="man">{t('menOnly')}</SelectItem>
          <SelectItem value="woman">{t('womenOnly')}</SelectItem>
          <SelectItem value="specific">{t('targetSpecific')}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {(targetAudience === 'teachers' || targetAudience === 'students') && (
      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
        <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('targetGender')}</Label>
        <Select onValueChange={(v: any) => { triggerHaptic(); setTargetGender(v); }} value={targetGender}>
          <SelectTrigger className="h-12 rounded-xl border-border bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allGenders')}</SelectItem>
            <SelectItem value="man">{t('menOnly')}</SelectItem>
            <SelectItem value="woman">{t('womenOnly')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )}

    {targetAudience === 'specific' && (
      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('searchRecipients')}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={recipientSearch} 
              onChange={(e) => setRecipientSearch(e.target.value)} 
              className="h-12 rounded-xl pl-10 border-border bg-card text-base" 
              placeholder={tGlobal("Navn, email eller elevnummer...")} 
            />
          </div>
          {allMembers.filter(m => {
            const term = recipientSearch.toLowerCase().trim();
            if (!term) return false;
            if (/^\d+$/.test(term)) return m.studentNumber?.includes(term);
            return (m.displayName?.toLowerCase().includes(term) || m.email?.toLowerCase().includes(term));
          }).slice(0, 5).map(m => (
            <button key={m.uid} onClick={() => { triggerHaptic(); setSelectedRecipients([...selectedRecipients, m]); setRecipientSearch(''); }} className="w-full flex items-center gap-3 p-3 hover:bg-muted border-b border-black/[0.04] bg-card rounded-xl mb-1 text-left min-w-0">
              <Avatar className="h-8 w-8"><AvatarImage src={m.photoURL || undefined} /><AvatarFallback>{getInitials(m.displayName)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{m.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              <PlusCircle className="h-4 w-4 text-primary shrink-0" />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedRecipients.map(r => (
            <Badge key={r.uid} variant="secondary" className="pl-1 pr-2 py-1 h-8 rounded-full flex items-center gap-2 max-w-full">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={r.photoURL || undefined} />
                <AvatarFallback>{getInitials(r.displayName)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold truncate">{r.displayName}</span>
              <button onClick={() => { triggerHaptic(); setSelectedRecipients(selectedRecipients.filter(x => x.uid !== r.uid)); }} className="shrink-0"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      </div>
    )}
  </div>
  );
};

const FormBuilderUI = ({
  fields,
  type,
  addField,
  removeField,
  updateField,
  triggerHaptic,
  t
}: {
  fields: any[];
  type: 'event' | 'survey';
  addField: (category: 'text' | 'choice' | 'scale') => void;
  removeField: (id: string) => void;
  updateField: (id: string, updates: any) => void;
  triggerHaptic: () => void;
  t: (key: string) => string;
}) => {
  const { tGlobal } = useGlobalTranslation();
  
  return (
  <div className="space-y-6 pt-4">
    <div className="flex items-center justify-between px-1">
      <h3 className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">{t('formBuilder')}</h3>
    </div>

    <div className="flex gap-2 flex-wrap px-1">
      <Button variant="ghost" size="sm" onClick={() => addField('text')} className="h-10 rounded-xl bg-muted hover:bg-black/[0.08] font-bold text-xs"><TypeIcon className="h-4 w-4 mr-2" />{t('textField')}</Button>
      <Button variant="ghost" size="sm" onClick={() => addField('choice')} className="h-10 rounded-xl bg-muted hover:bg-black/[0.08] font-bold text-xs"><ListFilter className="h-4 w-4 mr-2" />{t('choiceField')}</Button>
      {type === 'survey' && (
        <Button variant="ghost" size="sm" onClick={() => addField('scale')} className="h-10 rounded-xl bg-muted hover:bg-black/[0.08] font-bold text-xs"><BarChart2 className="h-4 w-4 mr-2" />{t('scaleField')}</Button>
      )}
    </div>

    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="relative rounded-3xl border border-border bg-card p-5 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground shrink-0">
              {field.type === 'text' ? <TypeIcon className="h-4 w-4" /> : field.type === 'scale' ? <BarChart2 className="h-4 w-4" /> : <ListFilter className="h-4 w-4" />}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              {field.type === 'text' ? t('textField') : field.type === 'scale' ? t('scaleField') : t('choiceField')}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-black/20 uppercase">{t('isRequired')}</span>
                <Switch checked={field.required} onCheckedChange={(v) => { triggerHaptic(); updateField(field.id, { required: v }); }} className="scale-75" />
              </div>
              <button onClick={() => removeField(field.id)} className="h-8 w-8 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>

          <Input 
            value={field.label || field.text} 
            onChange={(e) => updateField(field.id, type === 'survey' ? { text: e.target.value } : { label: e.target.value })} 
            className="h-12 rounded-xl border-border mb-4 font-bold text-[16px]" 
            placeholder={tGlobal("Dit spørgsmål her...")} 
          />

          {(field.type === 'radio' || field.type === 'checkbox') && (
            <div className="space-y-4 mt-4 pl-4 border-l-2 border-black/[0.04]">
              <div className="flex items-center justify-between py-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">{t('allowMultiple')}</span>
                <Switch 
                  checked={field.type === 'checkbox'} 
                  onCheckedChange={(v) => { 
                    triggerHaptic(); 
                    updateField(field.id, { type: v ? 'checkbox' : 'radio' }); 
                  }} 
                  className="scale-75" 
                />
              </div>

              <div className="space-y-2">
                {(field.options || []).map((opt: string, oIdx: number) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <Input 
                      value={opt} 
                      onChange={(e) => { 
                        const next = [...field.options]; 
                        next[oIdx] = e.target.value; 
                        updateField(field.id, { options: next }); 
                      }} 
                      className="h-10 rounded-lg border-border bg-muted text-base" 
                      placeholder={`Valgmulighed ${oIdx + 1}`} 
                    />
                    <button onClick={() => { 
                      const next = field.options.filter((_: any, i: number) => i !== oIdx); 
                      updateField(field.id, { options: next }); 
                    }} className="h-10 w-10 flex items-center justify-center text-black/20 hover:text-red-500 shrink-0"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => updateField(field.id, { options: [...(field.options || []), ''] })} className="h-10 px-4 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl mt-2"><Plus className="h-3 w-3 mr-2" />{t('addOption')}</Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
  );
};

export default function AdminPosts() {
  const { tGlobal } = useGlobalTranslation();

  const { firestore, firebaseApp } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const { language } = useLanguage();
  const { triggerHaptic } = useHaptic();
  const t = (key: string, params?: Record<string, string>) => {
    let text = translations[key]?.[language] || translations[key]?.['en'];
    if (params) {
      Object.keys(params).forEach(p => text = text.replace(`{${p}}`, params[p]));
    }
    return text;
  };

  const { members: allMembers } = useMembersData();
  const { feedItems, isLoading: isFeedLoading } = useAnnouncementsFeed();

  const [isAnnounceOpen, setIsAnnounceOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [regSearchTerm, setRegSearchTerm] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Common UI State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [overviewItem, setOverviewItem] = useState<any>(null);
  const [selectedResultForDetail, setSelectedResultForAnswers] = useState<any>(null);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Target State
  const [targetAudience, setTargetAudience] = useState<TargetType>('all');
  const [targetGender, setTargetGender] = useState<'all' | 'man' | 'woman'>('all');
  const [selectedRecipients, setSelectedRecipients] = useState<CombinedUser[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');

  // Announcement State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // Event State
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtDeadline, setEvtDeadline] = useState('');
  const [evtCapacity, setEvtCapacity] = useState<string>(''); 
  const [evtExternal, setEvtExternal] = useState(false);
  const [evtFormFields, setEvtFormFields] = useState<any[]>([]);

  // Survey State
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDesc, setSurveyDesc] = useState('');
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [surveyDeadline, setSurveyDeadline] = useState('');

  // Meeting State
  const [mtTitle, setMtTitle] = useState('');
  const [mtDesc, setMtDesc] = useState('');
  const [mtTime, setMtTime] = useState('');

  const resetForms = () => {
    setAnnTitle(''); setAnnContent('');
    setEvtTitle(''); setEvtDesc(''); setEvtDeadline(''); setEvtCapacity(''); setEvtExternal(false); setEvtFormFields([]);
    setSurveyTitle(''); setSurveyDesc(''); setSurveyQuestions([]); setSurveyDeadline('');
    setMtTitle(''); setMtDesc(''); setMtTime('');
    setTargetAudience('all'); setTargetGender('all'); setSelectedRecipients([]); setRecipientSearch('');
    setBannerImage(null); setBannerImagePreview(null); setEditingItem(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadBanner = async () => {
    if (!bannerImage) return bannerImagePreview;
    const storage = getStorage(firebaseApp);
    const storageRef = ref(storage, `announcements/${Date.now()}_${bannerImage.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
    const uploadResult = await uploadBytes(storageRef, bannerImage, { contentType: bannerImage.type });
    return await getDownloadURL(uploadResult.ref);
  };

  const buildTargetData = () => {
    return {
      targetAudience,
      targetGender,
      specificRecipients: targetAudience === 'specific' ? selectedRecipients.map(r => r.uid) : [],
    };
  };

  const triggerLocalizedNotifications = async (type: any, title: string) => {
    try {
      const target = buildTargetData();
      await sendPostNotifications({
        targetAudience: target.targetAudience,
        targetGender: target.targetGender,
        specificRecipients: target.specificRecipients,
        type,
        title
      });
    } catch (err) {
      console.error("Notification trigger failed:", err);
    }
  };

  const handleCreateOrUpdateAnnounce = async () => {
    if (!annTitle.trim() || !annContent.trim()) return;
    setIsSubmitting(true);
    try {
      const imageUrl = await uploadBanner();
      const annData = {
        ...buildTargetData(),
        title: annTitle,
        content: annContent,
        authorId: user?.uid,
        authorName: "Ibn Amer Instituttet",
        imageUrl: imageUrl || null,
      };

      if (editingItem) {
        await updateDoc(doc(firestore, 'announcements', editingItem.id), annData);
        toast({ variant: 'primary', title: t('postUpdated') });
      } else {
        await addDoc(collection(firestore, 'announcements'), {
          ...annData,
          createdAt: serverTimestamp(),
        });
        await triggerLocalizedNotifications('announcement', annTitle);
        toast({ variant: 'primary', title: t('postSaved') });
      }
      setIsAnnounceOpen(false);
      resetForms();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke gemme.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrUpdateEvent = async () => {
    if (!evtTitle.trim() || !evtDesc.trim() || !evtDeadline) return;
    setIsSubmitting(true);
    try {
      const imageUrl = await uploadBanner();
      const evtData = {
        ...buildTargetData(),
        title: evtTitle,
        description: evtDesc,
        registrationDeadline: new Date(evtDeadline),
        capacity: parseInt(evtCapacity, 10) || 0,
        allowExternalRegistrations: evtExternal,
        authorId: user?.uid,
        authorName: "Ibn Amer Instituttet",
        imageUrl: imageUrl || null,
        formFields: evtFormFields,
      };

      if (editingItem) {
        await updateDoc(doc(firestore, 'events', editingItem.id), evtData);
        toast({ variant: 'primary', title: t('postUpdated') });
      } else {
        await addDoc(collection(firestore, 'events'), {
          ...evtData,
          registrationCount: 0,
          createdAt: serverTimestamp(),
        });
        await triggerLocalizedNotifications('event', evtTitle);
        toast({ variant: 'primary', title: t('eventSaved') });
      }
      setIsEventOpen(false);
      resetForms();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke gemme.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrUpdateSurvey = async () => {
    if (!surveyTitle.trim() || surveyQuestions.length === 0) return;
    setIsSubmitting(true);
    try {
      const imageUrl = await uploadBanner();
      const surveyData = {
        ...buildTargetData(),
        title: surveyTitle,
        description: surveyDesc,
        authorId: user?.uid,
        authorName: "Ibn Amer Instituttet",
        imageUrl: imageUrl || null,
        deadline: surveyDeadline ? new Date(surveyDeadline) : null,
        questions: surveyQuestions,
        active: true,
      };

      if (editingItem) {
        await updateDoc(doc(firestore, 'surveys', editingItem.id), surveyData);
        toast({ variant: 'primary', title: t('postUpdated') });
      } else {
        await addDoc(collection(firestore, 'surveys'), {
          ...surveyData,
          createdAt: serverTimestamp(),
        });
        await triggerLocalizedNotifications('survey', surveyTitle);
        toast({ variant: 'primary', title: t('surveySaved') });
      }
      setIsSurveyOpen(false);
      resetForms();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke gemme.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrUpdateMeeting = async () => {
    if (!mtTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const imageUrl = await uploadBanner();
      const mtData = {
        ...buildTargetData(),
        title: mtTitle,
        description: mtDesc,
        scheduledAt: mtTime ? new Date(mtTime) : null,
        authorId: user?.uid,
        authorName: "Ibn Amer Instituttet",
        imageUrl: imageUrl || null,
        isActive: false,
        callId: `meeting-${Date.now()}`,
      };

      if (editingItem) {
        await updateDoc(doc(firestore, 'livestreams', editingItem.id), mtData);
        toast({ variant: 'primary', title: t('postUpdated') });
      } else {
        await addDoc(collection(firestore, 'livestreams'), {
          ...mtData,
          createdAt: serverTimestamp(),
        });
        await triggerLocalizedNotifications('livestream', mtTitle);
        toast({ variant: 'primary', title: t('meetingSaved') });
      }
      setIsMeetingOpen(false);
      resetForms();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke gemme.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Ugyldig fil', description: 'Vælg venligst et billede.' });
        return;
      }
      setBannerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setBannerImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setBannerImage(null);
    setBannerImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenEdit = (item: any) => {
    setTimeout(() => {
      triggerHaptic();
      setEditingItem(item);
      setBannerImagePreview(item.imageUrl || null);
      setTargetAudience(item.targetAudience || 'all');
      setTargetGender(item.targetGender || 'all');
      
      if (item.targetAudience === 'specific' && item.specificRecipients) {
        setSelectedRecipients(allMembers.filter(m => item.specificRecipients.includes(m.uid)));
      } else {
        setSelectedRecipients([]);
      }

      if (item.type === 'announcement') {
        setAnnTitle(item.title);
        setAnnContent(item.content);
        setIsAnnounceOpen(true);
      } else if (item.type === 'event') {
        setEvtTitle(item.title);
        setEvtDesc(item.description);
        setEvtDeadline(item.registrationDeadline?.toDate ? item.registrationDeadline.toDate().toISOString().slice(0, 16) : '');
        setEvtCapacity(String(item.capacity || ''));
        setEvtExternal(item.allowExternalRegistrations || false);
        setEvtFormFields(item.formFields || []);
        setIsEventOpen(true);
      } else if (item.type === 'survey') {
        setSurveyTitle(item.title);
        setSurveyDesc(item.description);
        setSurveyQuestions(item.questions || []);
        setSurveyDeadline(item.deadline?.toDate ? item.deadline.toDate().toISOString().slice(0, 16) : '');
        setIsSurveyOpen(true);
      } else if (item.type === 'livestream') {
        setMtTitle(item.title);
        setMtDesc(item.description);
        setMtTime(item.scheduledAt?.toDate ? item.scheduledAt.toDate().toISOString().slice(0, 16) : '');
        setIsMeetingOpen(true);
      }
    }, 100);
  };

  const addField = (category: 'text' | 'choice' | 'scale') => {
    triggerHaptic();
    const newField: any = {
      id: crypto.randomUUID(),
      label: '',
      text: '',
      type: category === 'choice' ? 'radio' : category,
      required: true,
      options: category === 'choice' ? [''] : [],
    };
    if (isSurveyOpen) {
      setSurveyQuestions([...surveyQuestions, { ...newField, text: '' }]);
    } else {
      setEvtFormFields([...evtFormFields, newField]);
    }
  };

  const removeField = (id: string) => {
    triggerHaptic();
    if (isSurveyOpen) {
      setSurveyQuestions(surveyQuestions.filter(f => f.id !== id));
    } else {
      setEvtFormFields(evtFormFields.filter(f => f.id !== id));
    }
  };

  const updateField = (id: string, updates: any) => {
    if (isSurveyOpen) {
      setSurveyQuestions(surveyQuestions.map(f => f.id === id ? { ...f, ...updates } : f));
    } else {
      setEvtFormFields(evtFormFields.map(f => f.id === id ? { ...f, ...updates } : f));
    }
  };

  const handleDelete = async (item: any) => {
    triggerHaptic();
    try {
      const colMap: any = { announcement: 'announcements', event: 'events', survey: 'surveys', livestream: 'livestreams' };
      const col = colMap[item.type];
      if (col) {
        await deleteDoc(doc(firestore, col, item.id));
        toast({ variant: 'primary', title: t('postDeleted') });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke slette.' });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-10 pb-32 sm:px-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-10">
          <p className="text-lg text-muted-foreground">{t('admin')}</p>
          <h1 className="text-[38px] leading-[1.05] font-semibold tracking-tight text-foreground">{t('posts')}</h1>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-10">
          <button onClick={() => { triggerHaptic(); resetForms(); setIsAnnounceOpen(true); }} className="h-24 flex flex-col items-center justify-center gap-2 rounded-[24px] bg-card border border-border shadow-sm text-foreground hover:bg-muted transition-all active:scale-[0.98]">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Megaphone className="h-4 w-4" /></div>
            <span className="font-bold text-[9px] uppercase tracking-wider">{t('announcementLabel')}</span>
          </button>
          <button onClick={() => { triggerHaptic(); resetForms(); setIsEventOpen(true); }} className="h-24 flex flex-col items-center justify-center gap-2 rounded-[24px] bg-card border border-border shadow-sm text-foreground hover:bg-muted transition-all active:scale-[0.98]">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><Calendar className="h-4 w-4" /></div>
            <span className="font-bold text-[9px] uppercase tracking-wider">{t('eventLabel')}</span>
          </button>
          <button onClick={() => { triggerHaptic(); resetForms(); setIsSurveyOpen(true); }} className="h-24 flex flex-col items-center justify-center gap-2 rounded-[24px] bg-card border border-border shadow-sm text-foreground hover:bg-muted transition-all active:scale-[0.98]">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600"><BarChart2 className="h-4 w-4" /></div>
            <span className="font-bold text-[9px] uppercase tracking-wider">{t('surveyLabel')}</span>
          </button>
          <button onClick={() => { triggerHaptic(); resetForms(); setIsMeetingOpen(true); }} className="h-24 flex flex-col items-center justify-center gap-2 rounded-[24px] bg-card border border-border shadow-sm text-foreground hover:bg-muted transition-all active:scale-[0.98]">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-600"><Video className="h-4 w-4" /></div>
            <span className="font-bold text-[9px] uppercase tracking-wider">{t('meetingLabel')}</span>
          </button>
        </div>

        <div className="space-y-4">
          {isFeedLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary/20" /></div>
          ) : feedItems.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">{t('noActivePosts')}</div>
          ) : (
            feedItems.map(item => (
              <div key={item.id} className="relative group">
                {item.type === 'event' ? (
                  <AdminEventCard event={item as any} onEdit={handleOpenEdit} onViewOverview={() => {}} />
                ) : item.type === 'livestream' ? (
                  <AdminLivestreamCard livestream={item as any} onEdit={handleOpenEdit} />
                ) : (
                  <Card className="rounded-[28px] border border-border bg-card shadow-sm overflow-hidden">
                    {item.imageUrl && (
                      <div className="relative w-full overflow-hidden bg-muted">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-auto object-contain block" />
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className={cn(
                              "px-3 h-6 border-none font-bold uppercase tracking-wider text-[10px]",
                              item.type === 'survey' ? "bg-amber-50 text-amber-600" : "bg-primary/10 text-primary"
                            )}>
                              {item.type === 'survey' ? t('surveyLabel') : t('announcementLabel')}
                            </Badge>
                          </div>
                          <CardTitle className="text-xl font-bold leading-tight truncate">{item.title}</CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted">
                              <MoreVertical className="h-5 w-5 opacity-40" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border-border shadow-xl">
                            <DropdownMenuItem onSelect={() => handleOpenEdit(item)} className="rounded-xl h-11 font-bold gap-3">
                              <Pencil className="h-4 w-4" /> Rediger
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDelete(item)} className="rounded-xl h-11 font-bold text-red-500 gap-3">
                              <Trash2 className="h-4 w-4" /> Slet
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className={cn("text-sm text-muted-foreground leading-relaxed relative cursor-pointer transition-all break-words", !expandedIds.has(item.id) ? "max-h-40 overflow-hidden" : "")} onClick={() => toggleExpand(item.id)}>
                      <RichRender value={item.content || item.description} />
                      {!expandedIds.has(item.id) && <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />}
                    </CardContent>
                    <CardFooter className="pt-2 pb-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {item.createdAt?.toDate?.().toLocaleDateString(language, { day: 'numeric', month: 'short' })} • {t('by')} {item.authorName}
                    </CardFooter>
                  </Card>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ANNOUNCEMENT SHEET */}
      <FullscreenSheet open={isAnnounceOpen} onOpenChange={setIsAnnounceOpen} title={editingItem ? t('editAnnouncement') : t('createAnnouncement')} rightSlot={<button onClick={() => setIsAnnounceOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X className="h-6 w-6 opacity-40" /></button>}>
        <div className="p-6 space-y-8 pb-32 max-w-full">
          <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('headline')}</Label><Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="h-12 rounded-xl border-border bg-card text-base" placeholder={t('headlinePlaceholder')} /></div>
          
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('bannerImage')}</Label>
            <div className="relative group overflow-hidden rounded-3xl border border-border bg-card">
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              {bannerImagePreview ? (
                <div className="relative w-full aspect-video cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Image src={bannerImagePreview} alt="Preview" fill className="object-cover" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(); }} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-50 transition-colors z-10"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full aspect-video border-2 border-dashed border-border bg-card hover:bg-muted transition-all flex flex-col items-center justify-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ImageIconLucide className="h-6 w-6" /></div>
                  <span className="text-sm font-bold text-muted-foreground">{t('uploadBanner')}</span>
                </button>
              )}
            </div>
          </div>

          <TargetAudienceFields 
            targetAudience={targetAudience}
            setTargetAudience={setTargetAudience}
            targetGender={targetGender}
            setTargetGender={setTargetGender}
            recipientSearch={recipientSearch}
            setRecipientSearch={setRecipientSearch}
            selectedRecipients={selectedRecipients}
            setSelectedRecipients={setSelectedRecipients}
            allMembers={allMembers}
            triggerHaptic={triggerHaptic}
            t={t}
          />
          <RichTextarea value={annContent} onChange={setAnnContent} label={t('content')} />
          <Button onClick={handleCreateOrUpdateAnnounce} disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-[#2E9D63] text-white font-bold text-lg shadow-lg shadow-green-500/20">{isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Megaphone className="mr-2 h-5 w-5" />} {editingItem ? t('saveAnnouncement') : t('sendAnnouncement')}</Button>
        </div>
      </FullscreenSheet>

      {/* EVENT SHEET */}
      <FullscreenSheet open={isEventOpen} onOpenChange={setIsEventOpen} title={editingItem ? t('editEvent') : t('newEvent')} rightSlot={<button onClick={() => setIsEventOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X className="h-6 w-6 opacity-40" /></button>}>
        <div className="p-6 space-y-8 pb-32 max-w-full">
          <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('title')}</Label><Input value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} className="h-12 rounded-xl border-border bg-card text-base" placeholder={t('eventTitlePlaceholder')} /></div>
          
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('bannerImage')}</Label>
            <div className="relative group overflow-hidden rounded-3xl border border-border bg-card">
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              {bannerImagePreview ? (
                <div className="relative w-full aspect-video cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Image src={bannerImagePreview} alt="Preview" fill className="object-cover" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(); }} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-50 transition-colors z-10"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full aspect-video border-2 border-dashed border-border bg-card hover:bg-muted transition-all flex flex-col items-center justify-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ImageIconLucide className="h-6 w-6" /></div>
                  <span className="text-sm font-bold text-muted-foreground">{t('uploadBanner')}</span>
                </button>
              )}
            </div>
          </div>

          <TargetAudienceFields 
            targetAudience={targetAudience}
            setTargetAudience={setTargetAudience}
            targetGender={targetGender}
            setTargetGender={setTargetGender}
            recipientSearch={recipientSearch}
            setRecipientSearch={setRecipientSearch}
            selectedRecipients={selectedRecipients}
            setSelectedRecipients={setSelectedRecipients}
            allMembers={allMembers}
            triggerHaptic={triggerHaptic}
            t={t}
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('registrationDeadline')}</Label><Input type="datetime-local" value={evtDeadline} onChange={(e) => setEvtDeadline(e.target.value)} className="h-12 rounded-xl border-border bg-card text-base" /></div>
            <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('capacity')}</Label><Input value={evtCapacity} onChange={(e) => setEvtCapacity(e.target.value)} className="h-12 rounded-xl border-border bg-card text-base" /></div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card shadow-sm">
            <Label htmlFor="evt-ext" className="text-sm font-bold text-foreground">{t('allowExternal')}</Label>
            <Switch id="evt-ext" checked={evtExternal} onCheckedChange={(v) => { triggerHaptic(); setEvtExternal(v); }} />
          </div>

          <RichTextarea value={evtDesc} onChange={setEvtDesc} label={t('description')} />
          <FormBuilderUI 
            fields={evtFormFields} 
            type="event" 
            addField={addField} 
            removeField={removeField} 
            updateField={updateField} 
            triggerHaptic={triggerHaptic} 
            t={t}
          />
          <Button onClick={handleCreateOrUpdateEvent} disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-500/20">{isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Calendar className="mr-2 h-5 w-5" />} {editingItem ? t('saveEvent') : t('createEvent')}</Button>
        </div>
      </FullscreenSheet>

      {/* SURVEY SHEET */}
      <FullscreenSheet open={isSurveyOpen} onOpenChange={setIsSurveyOpen} title={editingItem ? t('editSurvey') : t('newSurvey')} rightSlot={<button onClick={() => setIsSurveyOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X className="h-6 w-6 opacity-40" /></button>}>
        <div className="p-6 space-y-8 pb-32 max-w-full">
          <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('title')}</Label><Input value={surveyTitle} onChange={(e) => setSurveyTitle(e.target.value)} className="h-12 rounded-xl border-border bg-card text-base" placeholder={tGlobal("Fx: Trivselsmåling Marts")} /></div>
          
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('bannerImage')}</Label>
            <div className="relative group overflow-hidden rounded-3xl border border-border bg-card">
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              {bannerImagePreview ? (
                <div className="relative w-full aspect-video cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Image src={bannerImagePreview} alt="Preview" fill className="object-cover" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(); }} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-50 transition-colors z-10"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full aspect-video border-2 border-dashed border-border bg-card hover:bg-muted transition-all flex flex-col items-center justify-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ImageIconLucide className="h-6 w-6" /></div>
                  <span className="text-sm font-bold text-muted-foreground">{t('uploadBanner')}</span>
                </button>
              )}
            </div>
          </div>

          <TargetAudienceFields 
            targetAudience={targetAudience}
            setTargetAudience={setTargetAudience}
            targetGender={targetGender}
            setTargetGender={setTargetGender}
            recipientSearch={recipientSearch}
            setRecipientSearch={setRecipientSearch}
            selectedRecipients={selectedRecipients}
            setSelectedRecipients={setSelectedRecipients}
            allMembers={allMembers}
            triggerHaptic={triggerHaptic}
            t={t}
          />

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('surveyDeadline')}</Label>
            <Input 
              type="datetime-local" 
              value={surveyDeadline} 
              onChange={(e) => setSurveyDeadline(e.target.value)} 
              className="h-12 rounded-xl border-border bg-card text-base" 
            />
          </div>

          <RichTextarea value={surveyDesc} onChange={setSurveyDesc} label={t('description')} />
          <FormBuilderUI 
            fields={surveyQuestions} 
            type="survey" 
            addField={addField} 
            removeField={removeField} 
            updateField={updateField} 
            triggerHaptic={triggerHaptic} 
            t={t}
          />
          <Button onClick={handleCreateOrUpdateSurvey} disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-amber-600 text-white font-bold text-lg shadow-lg shadow-amber-500/20">{isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <BarChart2Icon className="mr-2 h-5 w-5" />} {editingItem ? t('saveSurvey') : t('createSurvey')}</Button>
        </div>
      </FullscreenSheet>

      {/* MEETING SHEET */}
      <FullscreenSheet open={isMeetingOpen} onOpenChange={setIsMeetingOpen} title={editingItem ? t('editMeeting') : t('newMeeting')} rightSlot={<button onClick={() => setIsMeetingOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X className="h-6 w-6 opacity-40" /></button>}>
        <div className="p-6 space-y-8 pb-32 max-w-full">
          <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('title')}</Label><Input value={mtTitle} onChange={(e) => setMtTitle(e.target.value)} className="h-12 rounded-xl border-border bg-card text-base" placeholder={t('meetingTitlePlaceholder')} /></div>
          
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('bannerImage')}</Label>
            <div className="relative group overflow-hidden rounded-3xl border border-border bg-card">
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              {bannerImagePreview ? (
                <div className="relative w-full aspect-video cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Image src={bannerImagePreview} alt="Preview" fill className="object-cover" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(); }} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-50 transition-colors z-10"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full aspect-video border-2 border-dashed border-border bg-card hover:bg-muted transition-all flex flex-col items-center justify-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ImageIconLucide className="h-6 w-6" /></div>
                  <span className="text-sm font-bold text-muted-foreground">{t('uploadBanner')}</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('meetingTime')}</Label>
            <Input 
              type="datetime-local" 
              value={mtTime} 
              onChange={(e) => setMtTime(e.target.value)} 
              className="h-12 rounded-xl border-border bg-card text-base" 
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{t('description')}</Label>
            <Input value={mtDesc} onChange={(e) => setMtDesc(e.target.value)} className="h-12 rounded-xl border-border bg-card text-base" placeholder={tGlobal("Kort beskrivelse af mødets indhold...")} />
          </div>

          <TargetAudienceFields 
            targetAudience={targetAudience}
            setTargetAudience={setTargetAudience}
            targetGender={targetGender}
            setTargetGender={setTargetGender}
            recipientSearch={recipientSearch}
            setRecipientSearch={setRecipientSearch}
            selectedRecipients={selectedRecipients}
            setSelectedRecipients={setSelectedRecipients}
            allMembers={allMembers}
            triggerHaptic={triggerHaptic}
            t={t}
          />

          <Button onClick={handleCreateOrUpdateMeeting} disabled={isSubmitting} className="w-full h-16 rounded-2xl bg-purple-600 text-white font-bold text-lg shadow-lg shadow-purple-500/20">{isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Video className="mr-2 h-5 w-5" />} {editingItem ? t('saveMeeting') : t('createMeeting')}</Button>
        </div>
      </FullscreenSheet>
    </div>
  );
}
