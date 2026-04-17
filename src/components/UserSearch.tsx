'use client';

import { useUserSearch } from "@/hooks/useUserSearch";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { AppUser } from "@/types/user";
import { Mail, Search, X } from "lucide-react";

export default function UserSearch({
  onSelectUser,
  placeholder = "Search users by name...",
}: {
  onSelectUser: (user: AppUser) => void;
  placeholder?: string;
}) {
  const { searchTerm, setSearchTerm, searchResults, isLoading } = useUserSearch();
  const [me, setMe] = useState<User | null>(null);

  useEffect(() => onAuthStateChanged(auth, setMe), []);

  const filtered = me ? searchResults.filter((u) => u.uid !== me.uid) : searchResults;

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full border rounded-xl h-11 pl-10 pr-10 text-sm"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {searchTerm.trim() && (
        <div className="mt-2 border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Searching...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No users found.</div>
          ) : (
            filtered.map((u) => (
              <button
                key={u.uid}
                onClick={() => {
                  onSelectUser(u);
                  setSearchTerm("");
                }}
                className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
              >
                <div className="font-medium text-sm">{u.name}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {u.email}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
