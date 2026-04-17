'use client';

import { Chat } from "stream-chat-react";
import streamClient from "@/lib/stream";
import UserSyncWrapper from "@/components/UserSyncWrapper";
import { AppSidebar } from "@/components/chat/AppSidebar";
import IncomingCallListener from "@/components/calls/IncomingCallListener";
import { useTheme } from "next-themes";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <UserSyncWrapper>
      <Chat 
        client={streamClient} 
        theme={resolvedTheme === 'dark' ? 'str-chat__theme-dark' : 'str-chat__theme-light'}
      >
        {/* ✅ Listener is active ONLY in chat area */}
        <IncomingCallListener />

        <div className="flex min-h-screen">
          <div className="w-[19rem] border-r">
            <AppSidebar />
          </div>

          <main className="flex-1 p-4">{children}</main>
        </div>
      </Chat>
    </UserSyncWrapper>
  );
}
