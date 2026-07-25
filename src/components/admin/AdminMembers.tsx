'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

import { useState, useCallback, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { doc, setDoc, deleteDoc, updateDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Search, 
  Trash2, 
  Pencil, 
  AlertTriangle, 
  RotateCcw, 
  User as UserIcon,
  Mail,
  ShieldCheck,
  GraduationCap,
  X,
  Clock,
  Moon,
  Sun
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { updateUserEmail, deleteUser, restoreAccount } from '@/lib/user';
import type { UserGender } from '@/types';
import { Label } from '@/components/ui/label';
import { getInitials, cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { type CombinedUser } from '@/hooks/use-members-data';
import { useHaptic } from 'use-haptic';
import { useLanguage } from '@/context/LanguageContext';
import { useView } from '@/context/ViewContext';

export default function AdminMembers() {
  const { tGlobal } = useGlobalTranslation();

  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();
  const { setView } = useView();
  
  const [localMembers, setLocalMembers] = useState<CombinedUser[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [limitCount, setLimitCount] = useState<number | 'all'>(10);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  
  // Modals
  const [userToEdit, setUserToEdit] = useState<CombinedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<CombinedUser | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [editEmail, setEditEmail] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editSubAmount, setEditSubAmount] = useState(0);
  const [editGender, setEditGender] = useState<UserGender>('man');
  const [editStudentNumber, setEditStudentNumber] = useState('');
  const [editCourseDuration, setEditCourseDuration] = useState('3 year');

  const fetchUsers = useCallback(async (currentLimit: number | 'all', searchFilter: string) => {
    if (!firestore) return;
    setIsLoadingList(true);
    
    try {
      const collectionsToFetch = ['students', 'teachers', 'admins'];
      const allUsers: CombinedUser[] = [];
      const userEmails = new Set<string>();

      const fetchCollection = async (col: string) => {
        try {
          let q;
          if (currentLimit === 'all' || searchFilter) {
            q = query(collection(firestore, col)); // Fetch all for search or 'show all'
          } else {
            q = query(collection(firestore, col), orderBy('createdAt', 'desc'), limit(currentLimit));
          }
          
          try {
            const snap = await getDocs(q);
            
            if (snap.empty && currentLimit !== 'all' && !searchFilter) {
              throw new Error("Empty snapshot - possibly missing createdAt fields");
            }

            snap.forEach(doc => {
              const data = doc.data() as any;
              if (data && data.email) {
                allUsers.push({
                  ...data,
                  id: doc.id,
                  uid: doc.id,
                  status: data.pendingDeletion ? 'Afventer Sletning' : 'Tilmeldt',
                } as CombinedUser);
                userEmails.add(data.email.toLowerCase());
              }
            });
          } catch (e: any) {
            console.warn(`Fallback fetch for ${col} because: ${e.message}`);
            if (currentLimit !== 'all' && !searchFilter) {
               const fallbackQ = query(collection(firestore, col), limit(currentLimit));
               const snap = await getDocs(fallbackQ);
               snap.forEach(doc => {
                  const data = doc.data() as any;
                  if (data && data.email) {
                    allUsers.push({
                      ...data,
                      id: doc.id,
                      uid: doc.id,
                      status: data.pendingDeletion ? 'Afventer Sletning' : 'Tilmeldt',
                    } as CombinedUser);
                    userEmails.add(data.email.toLowerCase());
                  }
               });
            }
          }
        } catch (outerError: any) {
           console.error(`Failed completely to fetch collection ${col}:`, outerError);
        }
      };

      const fetchPlaceholders = async () => {
        try {
          let q;
          if (currentLimit === 'all' || searchFilter) {
            q = query(collection(firestore, 'placeholders'));
          } else {
            q = query(collection(firestore, 'placeholders'), orderBy('createdAt', 'desc'), limit(currentLimit));
          }
          
          try {
            const snap = await getDocs(q);

            if (snap.empty && currentLimit !== 'all' && !searchFilter) {
              throw new Error("Empty snapshot - possibly missing createdAt fields");
            }

            snap.forEach(doc => {
              const data = doc.data() as any;
              if (data && data.email && !userEmails.has(data.email.toLowerCase())) {
                allUsers.push({
                  ...data,
                  id: doc.id,
                  uid: doc.id,
                  displayName: data.fullName || data.name || 'N/A',
                  status: 'Venter',
                  role: data.role || 'student'
                } as CombinedUser);
                userEmails.add(data.email.toLowerCase());
              }
            });
          } catch (e: any) {
             console.warn(`Fallback fetch for placeholders because: ${e.message}`);
             if (currentLimit !== 'all' && !searchFilter) {
               const fallbackQ = query(collection(firestore, 'placeholders'), limit(currentLimit));
               const snap = await getDocs(fallbackQ);
               snap.forEach(doc => {
                  const data = doc.data() as any;
                  if (data && data.email && !userEmails.has(data.email.toLowerCase())) {
                    allUsers.push({
                      ...data,
                      id: doc.id,
                      uid: doc.id,
                      displayName: data.fullName || data.name || 'N/A',
                      status: 'Venter',
                      role: data.role || 'student'
                    } as CombinedUser);
                    userEmails.add(data.email.toLowerCase());
                  }
               });
             }
          }
        } catch (outerError: any) {
           console.error(`Failed completely to fetch collection placeholders:`, outerError);
        }
      };

      await Promise.all(collectionsToFetch.map(fetchCollection));
      await fetchPlaceholders();

      let finalUsers = allUsers;

      if (searchFilter) {
        const term = searchFilter.toLowerCase().trim();
        finalUsers = allUsers.filter(u => {
          const isNumeric = /^\d+$/.test(term);
          if (isNumeric) return u.studentNumber?.includes(term);
          return u.displayName?.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
        });
      } else {
        // Sort globally by createdAt descending
        finalUsers.sort((a, b) => {
           const tA = a.createdAt?.toMillis?.() || a.createdAt || 0;
           const tB = b.createdAt?.toMillis?.() || b.createdAt || 0;
           return tB - tA;
        });
        
        if (currentLimit !== 'all') {
          finalUsers = finalUsers.slice(0, currentLimit);
        }
      }

      setLocalMembers(finalUsers);

    } catch (e) {
      console.error("Error fetching members:", e);
      toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke hente medlemmer' });
    } finally {
      setIsLoadingList(false);
    }
  }, [firestore, toast]);

  useEffect(() => {
    if (!hasSearched) {
      fetchUsers(limitCount, '');
    }
  }, [limitCount, hasSearched, fetchUsers]);

  const handleSearchClick = () => {
    triggerHaptic();
    if (searchInput.trim() === '') {
       setHasSearched(false);
       setLimitCount(10);
       fetchUsers(10, '');
    } else {
       setHasSearched(true);
       fetchUsers('all', searchInput);
    }
  };

  const handleRefreshData = () => {
     fetchUsers(hasSearched ? 'all' : limitCount, hasSearched ? searchInput : '');
  };

  const handleEditClick = (u: CombinedUser) => {
    setUserToEdit(u);
    setEditEmail(u.email);
    setEditDisplayName(u.displayName || '');
    setEditPhoneNumber(u.phoneNumber || '');
    setEditSubAmount(u.subscriptionAmount || 0);
    setEditGender(u.gender || 'man');
    setEditStudentNumber(u.studentNumber || '');
    setEditCourseDuration(u.courseDuration || '3 year');
  };

  const handleUpdateUser = async () => {
    if (!userToEdit || !firestore) return;
    setIsUpdating(true);
    try {
      const updateData: any = {
        displayName: editDisplayName,
        name: editDisplayName,
        displayNameLower: editDisplayName.toLowerCase(),
        phoneNumber: editPhoneNumber,
        subscriptionAmount: editSubAmount,
        gender: editGender,
      };

      if (userToEdit.role === 'student') {
        updateData.studentNumber = editStudentNumber;
        updateData.courseDuration = editCourseDuration;
      }

      if (userToEdit.status === 'Venter') {
        if (editEmail.toLowerCase() !== userToEdit.email.toLowerCase()) {
          await deleteDoc(doc(firestore, 'placeholders', userToEdit.email.toLowerCase()));
          await setDoc(doc(firestore, 'placeholders', editEmail.toLowerCase()), {
            ...updateData,
            email: editEmail.toLowerCase(),
            role: userToEdit.role,
          });
        } else {
          await updateDoc(doc(firestore, 'placeholders', userToEdit.email.toLowerCase()), updateData);
        }
      } else {
        if (editEmail.toLowerCase() !== userToEdit.email.toLowerCase()) {
          await updateUserEmail({ uid: userToEdit.id, newEmail: editEmail, role: userToEdit.role });
        }
        await updateDoc(doc(firestore, `${userToEdit.role}s`, userToEdit.id), updateData);
      }
      
      toast({ variant: 'primary', title: tGlobal('Bruger Opdateret') });
      setUserToEdit(null);
      handleRefreshData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Fejl', description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !firestore) return;
    setIsDeleting(true);
    try {
      if (userToDelete.status === 'Venter') {
        await deleteDoc(doc(firestore, 'placeholders', userToDelete.id));
      } else {
        await deleteUser(userToDelete.uid);
      }
      toast({ variant: 'primary', title: tGlobal('Bruger Slettet') });
      setUserToDelete(null);
      handleRefreshData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Fejl', description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const RoleIcon = ({ role }: { role: string }) => {
    switch (role) {
      case 'admin': return <ShieldCheck className="h-4 w-4 text-amber-600" />;
      case 'teacher': return <UserIcon className="h-4 w-4 text-blue-600" />;
      default: return <GraduationCap className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="px-4 pt-10 pb-32 sm:px-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-lg text-muted-foreground">{tGlobal('Admin')}</p>
          <h1 className="text-[38px] leading-[1.05] font-semibold tracking-tight text-foreground">
            {tGlobal('Medlemmer')}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { triggerHaptic(); setView('admin-waiting-list'); }}
            className="rounded-full h-12 w-12 bg-card border border-border shadow-sm text-primary hover:bg-muted"
            title={tGlobal('Venteliste')}
          >
            <Clock className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <section className="space-y-6">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder={tGlobal('Søg efter navn eller elevnummer...')} 
              value={searchInput} 
              onChange={(e) => setSearchInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
              className="h-14 rounded-2xl pl-12 border-border bg-card shadow-sm text-base w-full"
            />
          </div>
          <Button 
            onClick={handleSearchClick}
            className="h-14 px-6 rounded-2xl bg-primary text-primary-foreground font-bold shadow-sm"
          >
            {tGlobal('Søg')}
          </Button>
        </div>

        <div className="space-y-3">
          {isLoadingList ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>
          ) : localMembers.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">{tGlobal('Ingen medlemmer fundet.')}</div>
          ) : (
            <>
              {localMembers.map((u) => (
                <Card key={u.uid} className="rounded-[24px] border border-border bg-card shadow-sm hover:shadow-md transition-all">
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar className="h-12 w-12 border border-border">
                        <AvatarImage src={u.photoURL || undefined} />
                        <AvatarFallback className="bg-muted text-xs font-bold">{getInitials(u.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[16px] font-bold text-foreground truncate">{u.displayName}</p>
                          <RoleIcon role={u.role} />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium truncate">
                          <Mail className="h-3 w-3" /> {u.email}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(u)} className="h-10 w-10 rounded-xl hover:bg-muted">
                        <Pencil className="h-4 w-4 opacity-40" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setUserToDelete(u)} className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {!hasSearched && limitCount !== 'all' && localMembers.length === limitCount && (
                <div className="flex flex-col gap-3 pt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => { triggerHaptic(); setLimitCount(prev => typeof prev === 'number' ? prev + 10 : prev); }}
                    className="w-full h-14 rounded-2xl font-bold border-border shadow-sm text-foreground hover:bg-muted"
                  >
                    Vis 10 mere
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => { triggerHaptic(); setLimitCount('all'); }}
                    className="w-full h-14 rounded-2xl font-bold text-muted-foreground hover:text-foreground"
                  >
                    Vis alle
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <FullscreenSheet 
        open={!!userToEdit} 
        onOpenChange={(o) => !o && setUserToEdit(null)} 
        title={tGlobal('Rediger Medlem')} 
        rightSlot={<button onClick={() => setUserToEdit(null)} className="p-2"><X className="h-6 w-6 opacity-40" /></button>}
      >
        <div className="p-6 space-y-8 pb-32">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{tGlobal('Fulde Navn')}</Label>
              <Input 
                value={editDisplayName} 
                onChange={(e) => setEditDisplayName(e.target.value)} 
                className="h-12 rounded-xl"
                placeholder={tGlobal('Fulde Navn')}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{tGlobal('Email')}</Label>
              <Input 
                value={editEmail} 
                onChange={(e) => setEditEmail(e.target.value)} 
                className="h-12 rounded-xl"
                placeholder={tGlobal('Email')}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{tGlobal('Telefonnummer')}</Label>
              <Input 
                value={editPhoneNumber} 
                onChange={(e) => setEditPhoneNumber(e.target.value)} 
                className="h-12 rounded-xl"
                placeholder={tGlobal('Telefonnummer')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{tGlobal('Abonnement (DKK)')}</Label>
                <Input 
                  type="number" 
                  value={editSubAmount} 
                  onChange={(e) => setEditSubAmount(Number(e.target.value))} 
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{tGlobal('Køn')}</Label>
                <div className="h-12 flex items-center px-4 rounded-xl border border-input bg-background">
                  <RadioGroup 
                    value={editGender} 
                    onValueChange={(v) => {
                      triggerHaptic();
                      setEditGender(v as UserGender);
                    }} 
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="man" id="edit-man" />
                      <Label htmlFor="edit-man" className="text-sm">{tGlobal('Mand')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="woman" id="edit-woman" />
                      <Label htmlFor="edit-woman" className="text-sm">{tGlobal('Kvinde')}</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {userToEdit?.role === 'student' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{tGlobal('Elevnummer')}</Label>
                  <Input 
                    value={editStudentNumber} 
                    onChange={(e) => setEditStudentNumber(e.target.value)} 
                    className="h-12 rounded-xl"
                    placeholder={tGlobal("Fx. 12345")}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">{tGlobal('Kursusforløb')}</Label>
                  <Select onValueChange={(v) => { triggerHaptic(); setEditCourseDuration(v); }} value={editCourseDuration}>
                    <SelectTrigger className="h-12 rounded-xl border-input bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.5 year">{tGlobal('1,5 år')}</SelectItem>
                      <SelectItem value="3 year">{tGlobal('3 år')}</SelectItem>
                      <SelectItem value="5 year">{tGlobal('5 år')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={handleUpdateUser} 
            disabled={isUpdating} 
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-[16px] shadow-lg shadow-primary/20"
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {tGlobal('Gem ændringer')}
          </Button>
        </div>
      </FullscreenSheet>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="rounded-[32px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">{tGlobal('Slet medlem permanent?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tGlobal('Slet permanent')} {userToDelete?.email || ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel onClick={() => setUserToDelete(null)} className="rounded-xl h-12">{tGlobal('Annuller')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 rounded-xl h-12">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} {tGlobal('Slet permanent')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
