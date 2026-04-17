'use client';

import { useUnread } from "@/context/UnreadContext";
import { cn } from "@/lib/utils";

/**
 * MessageBadge læser nu udelukkende fra den globale Unread store.
 * Dette gør den 100% persistent under navigation.
 */
export default function MessageBadge({ className }: { className?: string }) {
  const { totalUnread } = useUnread();
  
  const visible = totalUnread > 0;
  const text = totalUnread > 99 ? "99+" : totalUnread > 9 ? "9+" : String(totalUnread);

  return (
    <span
      className={cn(
        "absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1",
        "rounded-full bg-[#E24B4B] text-white text-[10px] font-extrabold",
        "flex items-center justify-center ring-2 ring-white shadow-sm",
        "transition-opacity duration-150 pointer-events-none",
        visible ? "opacity-100" : "opacity-0",
        className
      )}
      aria-label={visible ? `${totalUnread} ulæste beskeder` : "Ingen ulæste beskeder"}
    >
      {text}
    </span>
  );
}
