/**
 * Task 22 — Component Deduplication
 *
 * This file was the original IncomingCallListener prototype (Stream-based).
 * The canonical version lives in @/components/calls/IncomingCallListener.tsx
 * and uses Firestore callInvites, proper video/audio type distinction,
 * animated Dialog UI, and error boundary integration.
 *
 * This file is kept as a re-export so any stale imports don't break.
 */
export { default } from '@/components/calls/IncomingCallListener';
