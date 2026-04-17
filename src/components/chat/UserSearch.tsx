'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, Mail, UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { type PublicUser } from "@/hooks/useUserSearchFirestore";

export default function UserSearch({
  users,
  onSelectUser,
}: {
  users: PublicUser[];
  onSelectUser: (user: PublicUser) => void;
}) {
  const { tGlobal } = useGlobalTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<PublicUser[]>([]);
  const debouncedSearchTerm = useDebounce(searchTerm, 200);

  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      const lowercasedTerm = debouncedSearchTerm.toLowerCase();
      const results = users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(lowercasedTerm) ||
          u.email?.toLowerCase().includes(lowercasedTerm)
      );
      setFilteredUsers(results);
    } else {
      setFilteredUsers([]);
    }
  }, [debouncedSearchTerm, users]);

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={tGlobal("Søg brugere...")}
          className="pl-10 pr-10 h-12"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!!searchTerm.trim() && (
        <div className="mt-2 bg-card border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <UserIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Ingen brugere fundet</p>
            </div>
          ) : (
            <div className="py-2">
              {filteredUsers.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => {
                    onSelectUser(u);
                    setSearchTerm("");
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b border-border last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3">
                     <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={u.photoURL || undefined} alt={u.displayName} />
                            <AvatarFallback>{getInitials(u.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{u.displayName}</p>
                          {u.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{u.email}</span>
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}