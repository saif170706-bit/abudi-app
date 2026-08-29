import { Redirect } from 'expo-router';

// The real chat screen lives at the root /chat stack (shared OverlayProvider/Chat
// context with /chat/[cid] and /chat/new) so it isn't nested inside this tab.
export default function StudentBeskederTab() {
  return <Redirect href={'/chat' as any} />;
}
