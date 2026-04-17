
// All data is fetched client-side (Firebase/Stream). Force static so this page
// is pre-rendered at build time and served from CDN — no serverless cold starts.
export const dynamic = 'force-static';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
