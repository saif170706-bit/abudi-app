import { streamClient } from './stream-client';

// The mobile app has no server of its own for Stream — it reuses the web app's
// deployed API routes, which already handle Firebase-auth verification + token
// issuance / user upsert against the same Stream project.
const API_BASE = 'https://ibnamer.dk/api/stream';

/** Fetches a Stream user token for the given Firebase user, via the web app's API. */
export async function fetchStreamToken(idToken: string): Promise<string> {
  const res = await fetch(`${API_BASE}/token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error('Stream token fetch failed');
  const data = await res.json();
  return data.token as string;
}

async function upsertUsersOnServer(
  idToken: string,
  users: { id: string; name?: string; image?: string }[]
) {
  if (users.length === 0) return;
  const res = await fetch(`${API_BASE}/upsert-users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ users }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to upsert users on server');
  }
}

/**
 * Starts (or reuses) a chat with the given members. Mirrors the web app's
 * useCreateNewChat: upserts everyone into Stream first, reuses an existing
 * 1:1 "messaging" channel if one already exists, otherwise creates a new
 * "messaging" (1:1) or "team" (group) channel.
 */
export async function createOrFindChat({
  idToken,
  members,
  createdBy,
  groupName,
  groupImage,
  memberProfiles,
}: {
  idToken: string;
  members: string[];
  createdBy: string;
  groupName?: string;
  groupImage?: string;
  memberProfiles: { id: string; name?: string; image?: string }[];
}) {
  await upsertUsersOnServer(idToken, memberProfiles);

  const isGroupChat = members.length > 2;

  if (!isGroupChat) {
    const existing = await streamClient.queryChannels(
      { type: 'messaging', members: { $eq: members } },
      { created_at: -1 },
      { limit: 1 }
    );
    if (existing.length > 0) {
      const channel = existing[0];
      const channelMembers = Object.keys(channel.state.members || {});
      if (channelMembers.length === 2 && members.length === 2 && members.every((m) => channelMembers.includes(m))) {
        return channel;
      }
    }
  }

  const channelId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  const channelData: { members: string[]; created_by_id: string; name?: string; image?: string } = {
    members,
    created_by_id: createdBy,
  };
  if (isGroupChat) {
    channelData.name = groupName || `Gruppe (${members.length} medlemmer)`;
    if (groupImage) channelData.image = groupImage;
  }

  const channel = streamClient.channel(isGroupChat ? 'team' : 'messaging', channelId, channelData);
  await channel.watch({ presence: true });
  return channel;
}
