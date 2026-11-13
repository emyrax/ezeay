import type { TutorConversation, TutorMode } from "../../types/tutor";

export type HistoryFilter = "all" | TutorMode;

export const HISTORY_FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "materials", label: "Materials" },
];

export function filterConversations(
  conversations: TutorConversation[],
  query: string,
  filter: HistoryFilter,
): TutorConversation[] {
  const needle = query.trim().toLowerCase();
  return conversations.filter((conversation) => {
    if (filter !== "all" && conversation.mode !== filter) return false;
    if (!needle) return true;
    const title = (conversation.title || "Untitled chat").toLowerCase();
    return title.includes(needle);
  });
}
