import { Redirect } from 'expo-router';

// Old Phase-1 entry point, kept only so bookmarked/cached links don't 404 —
// the real admin home now lives at (admin)/home.
export default function AdminDashboardRedirect() {
  return <Redirect href={'/(admin)/home' as any} />;
}
