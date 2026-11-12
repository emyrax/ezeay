import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import type { AgentPendingAction } from "../../types/agent";

interface AgentActionCardProps {
  action: AgentPendingAction;
  onApprove: (action: AgentPendingAction) => Promise<void>;
  onReject: (action: AgentPendingAction) => Promise<void>;
}

type CardStatus = "pending" | "working" | "approved" | "dismissed" | "error";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function detailsFor(action: AgentPendingAction): string[] {
  const details: string[] = [];
  if (action.tool === "save_plan" && Array.isArray(action.args.tasks)) {
    for (const item of action.args.tasks.slice(0, 4)) {
      const task = asRecord(item);
      if (!task) continue;
      const date = typeof task.date === "string" ? task.date : "";
      const time = typeof task.time === "string" ? `${task.time} · ` : "";
      const title = typeof task.title === "string" ? task.title : "Study session";
      details.push(`${date} · ${time}${title}`);
    }
    if (action.args.tasks.length > 4) {
      details.push(`+${action.args.tasks.length - 4} more sessions`);
    }
  } else if (action.tool === "update_schedule_task") {
    const title =
      typeof action.args.title === "string" ? action.args.title : "Schedule task";
    details.push(title);
  } else if (
    action.tool === "cancel_schedule_task" &&
    Array.isArray(action.args.taskIds)
  ) {
    const count = action.args.taskIds.length;
    details.push(`${count} task${count === 1 ? "" : "s"} will be removed`);
  }
  return details;
}

export default function AgentActionCard({
  action,
  onApprove,
  onReject,
}: AgentActionCardProps) {
  const theme = useThemeColors();
  const [status, setStatus] = useState<CardStatus>("pending");
  const [message, setMessage] = useState<string | null>(null);
  const details = detailsFor(action);
  const busy = status === "working";
  const resolved = status === "approved" || status === "dismissed";

  const approve = async () => {
    if (busy || resolved) return;
    setStatus("working");
    setMessage(null);
    try {
      await onApprove(action);
      setStatus("approved");
      setMessage("Applied to your Schedule.");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Could not apply this action.",
      );
    }
  };

  const reject = async () => {
    if (busy || resolved) return;
    setStatus("working");
    setMessage(null);
    try {
      await onReject(action);
      setStatus("dismissed");
      setMessage("Dismissed.");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Could not dismiss this action.",
      );
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceAlt,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: theme.primary + "22" }]}>
          <MaterialCommunityIcons
            name="calendar-check-outline"
            size={18}
            color={theme.primary}
          />
        </View>
        <View style={styles.headingCopy}>
          <Text style={[styles.title, { color: theme.text }]}>{action.label}</Text>
          <Text style={[styles.summary, { color: theme.textSecondary }]}>
            {action.summary}
          </Text>
        </View>
      </View>

      {details.length > 0 ? (
        <View style={styles.detailList}>
          {details.map((detail, index) => (
            <Text
              key={`${action.id}_detail_${index}`}
              style={[styles.detail, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {detail}
            </Text>
          ))}
        </View>
      ) : null}

      {resolved ? (
        <Text
          style={[
            styles.result,
            { color: status === "approved" ? theme.success : theme.textMuted },
          ]}
        >
          {message ?? (status === "approved" ? "Applied." : "Dismissed.")}
        </Text>
      ) : (
        <View style={styles.actions}>
          <Pressable
            onPress={reject}
            disabled={busy}
            style={[styles.secondary, { borderColor: theme.border }]}
            accessibilityRole="button"
            accessibilityLabel="Dismiss this action"
          >
            <Text style={[styles.secondaryText, { color: theme.textMuted }]}>
              Dismiss
            </Text>
          </Pressable>
          <Pressable
            onPress={approve}
            disabled={busy}
            style={[styles.primary, { backgroundColor: theme.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Approve this action"
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={15} color="#FFFFFF" />
                <Text style={styles.primaryText}>Approve</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {status === "error" && message ? (
        <Text style={[styles.error, { color: theme.warning }]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginTop: 10,
  },
  heading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headingCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  summary: {
    fontFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  detailList: {
    gap: 3,
    paddingLeft: 2,
  },
  detail: {
    fontFamily,
    fontSize: 11,
    lineHeight: 15,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  secondary: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryText: {
    fontFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  primary: {
    minWidth: 96,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  primaryText: {
    color: "#FFFFFF",
    fontFamily,
    fontSize: 12,
    fontWeight: "700",
  },
  result: {
    fontFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  error: {
    fontFamily,
    fontSize: 11,
    lineHeight: 15,
  },
});
