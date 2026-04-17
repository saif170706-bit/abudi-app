import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Edit, Trash2, Filter, Users, X, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type FilterGroup = {
  id: string;
  name: string;
  studentIds: string[];
};

interface TeacherFilterGroupManagerProps {
  teacherId: string;
  teacherGender: string;
  savedFilters: FilterGroup[];
  activeFilterId: string | null;
  onFilterChange: (filterId: string | null) => void;
  onSaveFilters: (filters: FilterGroup[]) => void;
  iconOnly?: boolean;
}

export default function TeacherFilterGroupManager({
  teacherGender,
  savedFilters,
  activeFilterId,
  onFilterChange,
  onSaveFilters,
  iconOnly = false,
}: TeacherFilterGroupManagerProps) {
  const { firestore } = useFirebase();
  const [students, setStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [editingGroup, setEditingGroup] = useState<FilterGroup | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenDialog = async () => {
    setIsDialogOpen(true);
    if (students.length === 0 && firestore) {
      setIsLoadingStudents(true);
      try {
        const q = query(
          collection(firestore, 'students'),
          where('gender', '==', teacherGender)
        );
        const snap = await getDocs(q);
        const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loaded.sort((a: any, b: any) =>
          (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '')
        );
        setStudents(loaded);
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setIsLoadingStudents(false);
      }
    }
  };

  const handleStartEdit = (group?: FilterGroup) => {
    if (group) {
        setEditingGroup(group);
        setTempName(group.name);
        setTempSelectedIds(new Set(group.studentIds));
    } else {
        setEditingGroup({ id: crypto.randomUUID(), name: '', studentIds: [] });
        setTempName('');
        setTempSelectedIds(new Set());
    }
  };

  const handleSaveGroup = () => {
      if (!editingGroup || !tempName.trim()) return;
      const updatedGroup: FilterGroup = {
          id: editingGroup.id,
          name: tempName.trim(),
          studentIds: Array.from(tempSelectedIds)
      };

      const existingClassIndex = savedFilters.findIndex(f => f.id === updatedGroup.id);
      let newFilters = [...savedFilters];
      if (existingClassIndex >= 0) {
          newFilters[existingClassIndex] = updatedGroup;
      } else {
          newFilters.push(updatedGroup);
      }

      onSaveFilters(newFilters);
      setEditingGroup(null);
  };

  const handleDeleteGroup = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newFilters = savedFilters.filter(f => f.id !== id);
      onSaveFilters(newFilters);
      if (activeFilterId === id) {
          onFilterChange(null);
      }
  };

  const toggleStudent = (id: string) => {
      const next = new Set(tempSelectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setTempSelectedIds(next);
  };

  const filteredStudents = students.filter(s => 
      (s.displayName || s.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeGroup = savedFilters.find(f => f.id === activeFilterId);

  if (iconOnly) {
      return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleOpenDialog} 
                    className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-all border shadow-sm relative",
                        activeFilterId 
                            ? "bg-[#DEA93E] text-white border-[#DEA93E] shadow-[#DEA93E]/20" 
                            : "bg-white/60 text-[#004D40] border-white/40"
                    )}
                >
                    <Filter className="h-5 w-5" />
                    {activeFilterId && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                    )}
                </motion.button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-[#FDF8F3] border-none rounded-[40px] shadow-2xl overflow-hidden p-0">
                <div className="p-8">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-3xl font-display text-[#004D40]">Elevgrupper</DialogTitle>
                        <p className="text-xs font-bold text-[#004D40]/40 uppercase tracking-widest">Hvem kan se din kø?</p>
                    </DialogHeader>

                    <div className="space-y-6">
                        {!editingGroup ? (
                            <>
                                <div className="space-y-3">
                                    <button 
                                        onClick={() => { onFilterChange(null); setIsDialogOpen(false); }}
                                        className={cn(
                                            "w-full flex items-center justify-between p-5 rounded-[24px] transition-all border text-left",
                                            !activeFilterId ? "bg-[#004D40] text-white border-[#004D40] shadow-xl" : "bg-white border-black/5 text-[#004D40]"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <Users className={cn("h-5 w-5", !activeFilterId ? "text-white/40" : "text-[#004D40]/20")} />
                                            <span className="font-bold">Alle elever</span>
                                        </div>
                                        {!activeFilterId && <Check className="h-5 w-5" />}
                                    </button>

                                    {savedFilters.map(f => (
                                        <div 
                                            key={f.id} 
                                            onClick={() => { onFilterChange(f.id); setIsDialogOpen(false); }}
                                            className={cn(
                                                "w-full flex items-center justify-between p-5 rounded-[24px] cursor-pointer transition-all border text-left",
                                                activeFilterId === f.id ? "bg-[#DEA93E] text-white border-[#DEA93E] shadow-xl" : "bg-white border-black/5 text-[#004D40]"
                                            )}
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={cn("shrink-0 h-10 w-10 flex items-center justify-center rounded-xl", activeFilterId === f.id ? "bg-white/20" : "bg-[#004D40]/5")}>
                                                    <Users className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold truncate">{f.name}</p>
                                                    <p className={cn("text-[10px] uppercase font-black tracking-widest", activeFilterId === f.id ? "text-white/60" : "text-[#004D40]/30")}>
                                                        {f.studentIds.length} elever
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-inherit opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleStartEdit(f); }}><Edit className="h-4 w-4" /></Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-inherit opacity-60 hover:opacity-100" onClick={(e) => handleDeleteGroup(f.id, e)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button onClick={() => handleStartEdit()} className="w-full h-16 rounded-[24px] bg-[#004D40]/5 text-[#004D40] hover:bg-[#004D40]/10 font-black uppercase text-[11px] tracking-[0.2em]">
                                    <Plus className="h-5 w-5 mr-2" /> Opret Ny Gruppe
                                </Button>
                            </>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#004D40]/40 ml-2">Gruppenavn</Label>
                                        <Input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="F.eks. Hold 1" className="h-14 rounded-2xl bg-white/60 border-white shadow-inner font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-[#004D40]/40 ml-2">Søg efter elev</Label>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#004D40]/30" />
                                            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Søg..." className="h-14 rounded-2xl bg-white/60 border-white shadow-inner pl-11 font-bold" />
                                        </div>
                                    </div>
                                    <div className="rounded-3xl border border-black/5 bg-white overflow-hidden shadow-sm">
                                        <ScrollArea className="h-64 p-2">
                                            {isLoadingStudents ? (
                                                <div className="flex flex-col items-center justify-center h-40 text-[#004D40]/30 gap-3">
                                                    <Loader2 className="animate-spin h-8 w-8"/>
                                                    <p className="text-[10px] font-black uppercase tracking-widest">Indlæser elever...</p>
                                                </div>
                                            ) : filteredStudents.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-40 text-[#004D40]/20 gap-2">
                                                    <Users className="h-8 w-8" />
                                                    <p className="text-xs font-bold">Ingen elever fundet</p>
                                                </div>
                                            ) : (
                                                <div className="grid gap-1">
                                                    {filteredStudents.map(s => (
                                                        <div 
                                                            key={s.id} 
                                                            className={cn(
                                                                "flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors",
                                                                tempSelectedIds.has(s.id) ? "bg-emerald-50" : "hover:bg-gray-50"
                                                            )} 
                                                            onClick={() => toggleStudent(s.id)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Checkbox checked={tempSelectedIds.has(s.id)} className="rounded-md border-emerald-200 data-[state=checked]:bg-emerald-500" />
                                                                <span className={cn("text-sm font-bold", tempSelectedIds.has(s.id) ? "text-emerald-700" : "text-[#004D40]")}>
                                                                    {s.displayName || s.name}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </div>
                                    <div className="flex justify-center">
                                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#DEA93E]">{tempSelectedIds.size} valgte elever</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold text-[#004D40]/40" onClick={() => setEditingGroup(null)}>Annuller</Button>
                                    <Button className="flex-1 h-14 rounded-2xl bg-[#004D40] hover:bg-[#00332B] text-white font-bold" disabled={!tempName.trim()} onClick={handleSaveGroup}>Gem Gruppe</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      );
  }

  return (
    <div className="w-full space-y-3">
        <Label className="text-[11px] font-black uppercase tracking-widest text-[#004D40]/40 ml-1">Hvem kan se dig?</Label>
        <div className="flex gap-2">
            <Select 
                value={activeFilterId || 'all'} 
                onValueChange={(v) => onFilterChange(v === 'all' ? null : v)}
            >
                <SelectTrigger className="flex-1 h-16 rounded-2xl border-white bg-white/60 shadow-inner text-lg px-6 font-display">
                    <SelectValue placeholder="Vælg gruppe..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Alle elever (Standard)</SelectItem>
                    {savedFilters.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name} ({f.studentIds.length})</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={handleOpenDialog} variant="outline" className="h-16 w-16 rounded-2xl border-white bg-white/60 shadow-inner">
                        <Edit className="h-5 w-5 text-[#004D40]" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-[#FDF8F3] border-[#004D40]/10 rounded-[32px] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-display text-[#004D40]">Håndter Elevgrupper</DialogTitle>
                    </DialogHeader>
                    
                    <div className="mt-4 space-y-4">
                        {!editingGroup ? (
                            <>
                                <div className="space-y-2">
                                    {savedFilters.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic text-center py-4">Ingen gemte grupper endnu.</p>
                                    ) : (
                                        savedFilters.map(f => (
                                            <div key={f.id} className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-black/5">
                                                <div>
                                                    <p className="font-bold text-[#004D40]">{f.name}</p>
                                                    <p className="text-xs font-bold uppercase tracking-widest text-[#DEA93E]">{f.studentIds.length} elever</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="icon" variant="ghost" onClick={() => handleStartEdit(f)}><Edit className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleDeleteGroup(f.id, e)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <Button onClick={() => handleStartEdit()} className="w-full h-14 rounded-2xl bg-[#004D40]/10 text-[#004D40] hover:bg-[#004D40]/20 font-bold">
                                    <Plus className="h-5 w-5 mr-2" /> Opret Ny Gruppe
                                </Button>
                            </>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[#004D40] font-bold">Gruppenavn</Label>
                                        <Input 
                                            value={tempName} 
                                            onChange={(e) => setTempName(e.target.value)} 
                                            placeholder="F.eks. Hold 1" 
                                            className="h-12 rounded-xl bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[#004D40] font-bold">Søg efter elev</Label>
                                        <Input 
                                            value={searchQuery} 
                                            onChange={(e) => setSearchQuery(e.target.value)} 
                                            placeholder="Søg..." 
                                            className="h-12 rounded-xl bg-white"
                                        />
                                    </div>
                                    <ScrollArea className="h-64 rounded-xl border bg-white p-2">
                                        {isLoadingStudents ? (
                                            <div className="flex justify-center items-center h-full text-[#004D40]/30"><Loader2 className="animate-spin h-6 w-6"/></div>
                                        ) : filteredStudents.length === 0 ? (
                                            <div className="flex justify-center items-center h-full text-sm text-gray-500">Ingen valgte elever fundet.</div>
                                        ) : (
                                            filteredStudents.map(s => (
                                                <div key={s.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => toggleStudent(s.id)}>
                                                    <Checkbox checked={tempSelectedIds.has(s.id)} />
                                                    <div className="leading-none">
                                                        <p className="text-sm font-medium">{s.displayName || s.name}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </ScrollArea>
                                    <div className="flex justify-between items-center text-sm font-bold text-[#DEA93E]">
                                        <span>{tempSelectedIds.size} valgte elever</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setEditingGroup(null)}>Annuller</Button>
                                    <Button className="flex-1 h-12 rounded-xl bg-[#004D40] hover:bg-[#00332B] text-white" disabled={!tempName.trim()} onClick={handleSaveGroup}>Gem Gruppe</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    </div>
  );
}
