import { Redirect } from 'expo-router';

// Old Phase-1 entry point, kept only so bookmarked/cached links don't 404 —
// the real teacher home now lives at (teacher)/home.
export default function TeacherDashboardRedirect() {
  return <Redirect href={'/(teacher)/home' as any} />;
}
