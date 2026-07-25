import { useLocalSearchParams } from 'expo-router';
import { QuranScreen } from '@/components/screens/quran-screen';

export default function TeacherQuranRoute() {
  const { page } = useLocalSearchParams<{ page?: string }>();
  return <QuranScreen initialPageOverride={page ? Number(page) : undefined} />;
}
