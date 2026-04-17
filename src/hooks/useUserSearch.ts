import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, startAt, endAt } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { useDebounce } from "./useDebounce";
import { AppUser } from "@/types/user";

export function useUserSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const debounced = useDebounce(searchTerm, 300);

  const [results, setResults] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      const term = debounced.trim().toLowerCase();
      if (!term) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          orderBy("nameLower"),
          startAt(term),
          endAt(term + "\uf8ff"),
          limit(20)
        );
        const snap = await getDocs(q);
        setResults(snap.docs.map((d) => d.data() as AppUser));
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [debounced]);

  return { searchTerm, setSearchTerm, searchResults: results, isLoading };
}
