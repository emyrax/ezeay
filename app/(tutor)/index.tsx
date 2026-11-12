import { Redirect } from "expo-router";
import AgentChatScreen from "../../component/agent/AgentChatScreen";
import LegacyTutorScreen from "../../component/tutor/LegacyTutorScreen";
import { useFeatureFlags } from "../../hooks/useFeatureFlags";

export default function TutorIndex() {
  const { agent, tutor, legacyTutor } = useFeatureFlags();

  if (agent) {
    return <AgentChatScreen />;
  }

  if (legacyTutor || tutor) {
    return <LegacyTutorScreen />;
  }

  return <Redirect href="/(tabs)" />;
}
