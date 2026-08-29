import { useLocalSearchParams } from 'expo-router';
import { QuranScreen } from '@/components/screens/quran-screen';
import { QuranIndexScreen } from '@/components/screens/quran-index-screen';

export default function StudentQuranRoute() {
  const { page } = useLocalSearchParams<{ page?: string }>();
  if (page) {
    return <QuranScreen initialPageOverride={Number(page)} backHref="/(student)/quran" />;
  }
  return <QuranIndexScreen />;
}
