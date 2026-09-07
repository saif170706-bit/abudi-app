// @stream-io/video-react-native-sdk pulls in native-only WebRTC bindings that
// Metro can't bundle for web (same issue as stream-chat-expo — see
// chat-list-screen.web.tsx). This stub keeps any plain (non-route) import of
// stream-video-client.ts from ever reaching that native module on web.
export async function fetchStreamVideoToken(): Promise<string> {
  throw new Error('Video calls are not available on web.');
}

export function getStreamVideoClient(): never {
  throw new Error('Video calls are not available on web.');
}

export function getExistingStreamVideoClient(): null {
  return null;
}

export async function disconnectStreamVideoClient() {}
