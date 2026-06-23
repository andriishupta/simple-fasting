import { useLocalSearchParams } from 'expo-router';

import { GoalEditorScreen } from '@/components/goal-editor-screen';

export default function EditGoalRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <GoalEditorScreen goalId={id ?? null} />;
}
