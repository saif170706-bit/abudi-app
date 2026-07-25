import { Stack } from 'expo-router';

export default function StudentsStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[studentId]" options={{ title: 'Elev' }} />
    </Stack>
  );
}
