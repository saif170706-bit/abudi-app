import { useLocalSearchParams } from 'expo-router';
import { EventRegistrationScreen } from '@/components/screens/event-registration-screen';

export default function EventRegistrationRoute() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  return <EventRegistrationScreen eventId={eventId} />;
}
