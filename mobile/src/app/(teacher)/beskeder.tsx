import { Redirect } from 'expo-router';

export default function TeacherBeskederTab() {
  return <Redirect href={'/chat' as any} />;
}
