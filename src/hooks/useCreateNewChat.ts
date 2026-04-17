import streamClient from "@/lib/stream";
import { useFirebase } from "@/firebase";

export const useCreateNewChat = () => {
  const { auth } = useFirebase();

  // Helper function to call the API with Auth token
  const upsertUsersOnServer = async (users: { id: string; name?: string; image?: string }[]) => {
    if (!users || users.length === 0) return;
    
    if (!auth?.currentUser) {
      throw new Error("Du skal være logget ind for at starte en chat.");
    }

    const token = await auth.currentUser.getIdToken();

    const res = await fetch("/api/stream/upsert-users", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ users }),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || "Failed to upsert users on server");
    }
  };

  const createNewChat = async ({
    members,
    createdBy,
    groupName,
    memberProfiles,
  }: {
    members: string[];
    createdBy: string;
    groupName?: string;
    memberProfiles: { id: string; name?: string; image?: string }[];
  }) => {
    // Ensure all users exist in Stream before creating the channel
    // by calling our new server endpoint.
    await upsertUsersOnServer(memberProfiles);

    const isGroupChat = members.length > 2;

    if (!isGroupChat) {
      const existingChannel = await streamClient.queryChannels(
        { type: "messaging", members: { $eq: members } },
        { created_at: -1 },
        { limit: 1 }
      );

      if (existingChannel.length > 0) {
        const channel = existingChannel[0];
        const channelMembers = Object.keys(channel.state.members || {});

        if (
          channelMembers.length === 2 &&
          members.length === 2 &&
          members.every((m) => channelMembers.includes(m))
        ) {
          return channel;
        }
      }
    }

    const channelId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    const channelData: { members: string[]; created_by_id: string; name?: string } = {
      members,
      created_by_id: createdBy,
    };

    if (isGroupChat) {
      channelData.name = groupName || `Group chat (${members.length} members)`;
    }

    const channel = streamClient.channel(isGroupChat ? "team" : "messaging", channelId, channelData);
    await channel.watch({ presence: true });
    return channel;
  };

  return createNewChat;
};
