import { useLocalSearchParams } from 'expo-router';
import { SurveyResponseScreen } from '@/components/screens/survey-response-screen';

export default function SurveyResponseRoute() {
  const { surveyId } = useLocalSearchParams<{ surveyId: string }>();
  return <SurveyResponseScreen surveyId={surveyId} />;
}
