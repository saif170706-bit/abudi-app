import { ChatUnavailableOnWeb } from '@/components/ui/chat-unavailable-web';

// @stream-io/video-react-native-sdk (native WebRTC) can't bundle for web —
// same story as chat-list-screen.web.tsx. Reuses the same "only in the app"
// fallback UI rather than a near-duplicate component.
export function AudioCallScreen() {
  return <ChatUnavailableOnWeb />;
}
