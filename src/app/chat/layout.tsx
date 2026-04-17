'use client';

/**
 * ChatLayout is now just a pass-through because StreamUserProvider
 * has been moved to the root ClientLayout to support global unread badges.
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
