import { StreamVideoClient } from '@stream-io/video-react-native-sdk';

// Same public key as chat — safe client-side, matches web app's NEXT_PUBLIC_STREAM_API_KEY.
const STREAM_API_KEY = 'y6fwhwm7qv3y';

// Reuses the web app's deployed /api/stream/video-token route (see
// src/app/api/stream/video-token/route.ts) — no server of its own for Stream,
// same pattern as stream-chat-actions.ts.
const API_BASE = 'https://ibnamer.dk/api/stream';

export async function fetchStreamVideoToken(idToken: string): Promise<string> {
  const res = await fetch(`${API_BASE}/video-token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error('Stream video token fetch failed');
  const data = await res.json();
  return data.token as string;
}

let clientInstance: StreamVideoClient | null = null;

/**
 * Lazily creates the singleton StreamVideoClient, mirroring stream-client.ts's
 * chat singleton. Created on first connect rather than at module load, since
 * the RN SDK's client constructor touches native WebRTC bindings that don't
 * exist on web.
 */
export function getStreamVideoClient(
  user: { id: string; name?: string; image?: string },
  tokenProvider: () => Promise<string>
): StreamVideoClient {
  if (clientInstance) return clientInstance;
  clientInstance = new StreamVideoClient({ apiKey: STREAM_API_KEY, user, tokenProvider });
  return clientInstance;
}

export function getExistingStreamVideoClient(): StreamVideoClient | null {
  return clientInstance;
}

export async function disconnectStreamVideoClient() {
  if (clientInstance) {
    await clientInstance.disconnectUser().catch(() => {});
    clientInstance = null;
  }
}
