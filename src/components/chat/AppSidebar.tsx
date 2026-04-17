'use client';

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChannelList } from "stream-chat-react";
import { ChannelFilters, ChannelSort } from "stream-chat";

import { useUser } from "@/firebase";
import NewChatDialog from "@/components/chat/NewChatDialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { useUserProfile } from "@/hooks/use-user-profile";

export function AppSidebar() {
  const { user } = useUser();
  const { profile } = useUserProfile();

  const filters: ChannelFilters = {
    members: { $in: [user?.uid as string] },
    type: { $in: ["messaging", "team"] },
  };

  const sort: ChannelSort = { last_message_at: -1 };
  const options = { presence: true, state: true };

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex h-full w-[var(--sidebar-width)] translate-x-0 flex-col border-r bg-background transition-transform duration-300 ease-in-out md:translate-x-0">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.photoURL || undefined} alt={profile?.displayName} />
              <AvatarFallback>{getInitials(profile?.displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                {profile?.displayName || "Bruger"}
              </span>
              <span className="text-xs text-muted-foreground">
                {user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <NewChatDialog>
          <Button className="w-full" variant="outline">
            Start New Chat
          </Button>
        </NewChatDialog>
      </div>

      <div className="flex-grow overflow-y-auto">
        <ChannelList
          sort={sort}
          filters={filters}
          options={options}
          channelRenderFilterFn={(channels) =>
            channels.filter((ch) => {
              const members = Object.keys(ch.state.members || {});
              return Array.from(new Set(members)).length >= 2; // hide self-only channels
            })
          }
          EmptyStateIndicator={() => (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4">
              <div className="text-6xl mb-6 opacity-20">💬</div>
              <h2 className="text-xl font-medium mb-2">Ready to chat?</h2>
              <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[220px]">
                Dine chats vises her, når du starter en samtale.
              </p>
            </div>
          )}
        />
      </div>
    </aside>
  );
}
