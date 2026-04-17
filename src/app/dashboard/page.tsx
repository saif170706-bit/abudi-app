'use client';

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { useRouter } from "next/navigation";
import { VideoIcon, LogOutIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import {
  Channel,
  ChannelHeader,
  MessageInput,
  MessageList,
  Thread,
  Window,
  useChatContext,
} from "stream-chat-react";

export default function Dashboard() {
  const router = useRouter();
  const { channel, setActiveChannel } = useChatContext();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const handleCall = async () => {
    if (!channel || !user?.uid) return;

    // callId MUST be same for both users; using channel.id is perfect
    const callId = channel.id;

    // Get other members in this channel
    const memberIds = Object.keys(channel.state.members || {});
    const otherUserIds = memberIds.filter((id) => id !== user.uid);

    // Send an invite event to the channel (Stream Chat)
    await channel.sendEvent({
      type: "call.invite",
      callId,
      fromUserId: user.uid,
      toUserIds: otherUserIds,
      channelType: channel.type,
      channelId: channel.id,
      isGroup: memberIds.length > 2,
      createdAt: Date.now(),
    });

    // Navigate caller into the call room
    router.push(`/video/${callId}`);
  };

  const handleLeaveChat = async () => {
    if (!channel || !user?.uid) return;

    const confirm = window.confirm("Are you sure you want to leave the chat?");
    if (!confirm) return;

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/stream/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          channelId: channel.id,
          channelType: channel.type,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Could not leave chat");
      }
      
      setActiveChannel(undefined);
      router.push("/dashboard");
       toast({
        title: "Chat forladt",
        description: "Du er blevet fjernet fra samtalen.",
      });
    } catch (error: any) {
      console.error("Error leaving chat:", error);
      toast({
        variant: "destructive",
        title: "Fejl",
        description: error.message || "Kunne ikke forlade chatten.",
      });
    }
  };

  return (
    <div className="flex flex-col w-full">
      {channel ? (
        <Channel>
          <Window>
            <div className="flex items-center justify-between gap-2 p-4 border-b">
              {channel.data?.member_count === 1 ? (
                <ChannelHeader title="Everyone else has left this chat!" />
              ) : (
                <ChannelHeader />
              )}

              <div className="flex items-center gap-2">
                <button
                  className="border rounded-xl px-3 py-2 text-sm flex items-center gap-2"
                  onClick={handleCall}
                >
                  <VideoIcon className="w-4 h-4" />
                  Video Call
                </button>

                <button
                  className="border rounded-xl px-3 py-2 text-sm flex items-center gap-2 text-red-600"
                  onClick={handleLeaveChat}
                >
                  <LogOutIcon className="w-4 h-4" />
                  Leave Chat
                </button>
              </div>
            </div>

            <MessageList />
            <div className="sticky bottom-0">
              <MessageInput />
            </div>
          </Window>

          <Thread />
        </Channel>
      ) : (
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <h2 className="text-xl font-semibold text-gray-500 mb-2">No chat selected</h2>
          <p className="text-gray-500">Select a chat from the sidebar.</p>
        </div>
      )}
    </div>
  );
}
