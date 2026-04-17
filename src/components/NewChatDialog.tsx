/**
 * Task 22 — Component Deduplication
 *
 * This file was the original NewChatDialog prototype.
 * The canonical version lives in @/components/chat/NewChatDialog.tsx
 * and includes:
 *  - Gender-filtered user search (same-gender only)
 *  - Radix Dialog (accessible, keyboard-navigable)
 *  - Avatar display for selected users
 *  - Role-based user list (teacher/student/admin)
 *  - Full memberProfiles support for Stream.io
 *
 * This file is kept as a re-export so any stale imports don't break.
 */
export { default } from '@/components/chat/NewChatDialog';
