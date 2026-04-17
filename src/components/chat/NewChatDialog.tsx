'use client';

import { useState, useEffect } from "react";
import { useChatContext } from "stream-chat-react";
import { useUser, useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useCreateNewChat } from "@/hooks/useCreateNewChat";
import { useUserProfile } from "@/hooks/use-user-profile";
import UserSearch from "@/components/chat/UserSearch";
import { type PublicUser } from "@/hooks/useUserSearchFirestore";
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { XIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Define local version of PublicUser that includes gender
interface ExtendedPublicUser extends PublicUser {
  gender: 'man' | 'woman';
}

export default function NewChatDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ExtendedPublicUser[]>([]);
  const [groupName, setGroupName] = useState("");

  const { tGlobal } = useGlobalTranslation();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { setActiveChannel } = useChatContext();
  const createNewChat = useCreateNewChat();
  const { profile } = useUserProfile();

  const [searchableUsers, setSearchableUsers] = useState<ExtendedPublicUser[]>([]);

  // Memoize queries
  const teachersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'teachers') : null), [firestore]);
  const studentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'students') : null), [firestore]);
  const adminsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'admins') : null), [firestore]);

  // Fetch data based on role
  const { data: teacherData } = useCollection<ExtendedPublicUser>(teachersQuery);
  const { data: studentData } = useCollection<ExtendedPublicUser>(
    (profile?.role === 'teacher' || profile?.role === 'admin') ? studentsQuery : null
  );
  const { data: adminData } = useCollection<ExtendedPublicUser>(
    (profile?.role === 'admin') ? adminsQuery : null
  );

  useEffect(() => {
    const all = [
        ...(teacherData || []),
        ...(studentData || []),
        ...(adminData || [])
    ];
    const uniqueUsersMap = new Map<string, ExtendedPublicUser>();
    all.forEach(u => {
      // The user object from useCollection has 'id', we need 'uid' for our local type.
      const userWithUid = { ...u, uid: u.id };
      if (!uniqueUsersMap.has(userWithUid.id)) {
        uniqueUsersMap.set(userWithUid.id, userWithUid);
      }
    });

    const uniqueUsers = Array.from(uniqueUsersMap.values());
    
    // Filter by same gender and exclude self
    const filteredUsers = uniqueUsers.filter(u => 
      u.uid !== user?.uid && 
      (!profile || u.gender === profile.gender)
    );
    
    setSearchableUsers(filteredUsers);
  }, [teacherData, studentData, adminData, user?.uid, profile]);


  const addUser = (u: ExtendedPublicUser) => {
    if (!selected.find((x) => x.uid === u.uid)) setSelected((p) => [...p, u]);
  };

  const removeUser = (uid: string) => setSelected((p) => p.filter((u) => u.uid !== uid));

  const handleCreate = async () => {
    if (!user?.uid || !profile) return;

    const members = [user.uid, ...selected.map((u) => u.uid)];
    const isGroup = members.length > 2;

    try {
        const channel = await createNewChat({
            members,
            createdBy: user.uid,
            groupName: isGroup ? groupName.trim() || undefined : undefined,
            memberProfiles: [
                { id: profile.id, name: profile.displayName || "Unknown", image: profile.photoURL || "" },
                ...selected.map((u) => ({ id: u.uid, name: u.displayName, image: u.photoURL || "" })),
            ],
        });

        setActiveChannel(channel);
        setOpen(false);
        setSelected([]);
        setGroupName("");
    } catch (e: any) {
        console.error("Failed to create chat:", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setSelected([]); setGroupName(""); } }}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tGlobal("Start en ny chat")}</DialogTitle>
          <DialogDescription>{tGlobal("Søg efter brugere af samme køn og start en samtale")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <UserSearch users={searchableUsers} onSelectUser={addUser} />

          {selected.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">{tGlobal("Valgte brugere")} ({selected.length})</div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selected.map((u) => (
                  <div key={u.uid} className="flex items-center justify-between p-2 bg-muted/50 border rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={u.photoURL || undefined} alt={u.displayName}/>
                            <AvatarFallback>{getInitials(u.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{u.displayName}</div>
                            {u.email && <div className="text-xs text-muted-foreground truncate">{u.email}</div>}
                        </div>
                    </div>
                    <button onClick={() => removeUser(u.uid)} className="p-1 text-muted-foreground hover:text-destructive">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selected.length > 1 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">{tGlobal("Gruppenavn (valgfrit)")}</div>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={tGlobal("Fx: Lektiegruppe")} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{tGlobal("Annuller")}</Button>
            <Button disabled={selected.length === 0} onClick={handleCreate}>
              {selected.length > 1 ? tGlobal("Opret gruppechat") : tGlobal("Start chat")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
