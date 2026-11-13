import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { coachColors, coachFont } from "../../constants/coachTheme";
import { api, friendlyError } from "../../lib/api";
import type {
  AgentIntegrationToolkit,
  AgentIntegrationsResponse,
} from "../../types/agent";
import CoachSheet from "./CoachSheet";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface AgentToolsSheetProps {
  visible: boolean;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onPrompt: (prompt: string) => void;
}

const BUILT_IN: {
  icon: IconName;
  label: string;
  prompt: string;
  tint: string;
  color: string;
}[] = [
  {
    icon: "calendar-check-outline",
    label: "Study schedule",
    prompt: "Build a study schedule for this week.",
    tint: "#EAF4FC",
    color: "#5B9BD5",
  },
  {
    icon: "brain",
    label: "Memory",
    prompt: "What do you remember about how I like to study?",
    tint: "#EFECFC",
    color: coachColors.accent,
  },
  {
    icon: "bookshelf",
    label: "Materials",
    prompt: "Search my notes for the topic I studied most recently.",
    tint: "#FFF3DE",
    color: "#E0A34A",
  },
  {
    icon: "chart-line",
    label: "Progress",
    prompt: "Show my study progress and what I should improve.",
    tint: "#E7F6ED",
    color: "#5BB98C",
  },
  {
    icon: "file-document-outline",
    label: "Past papers",
    prompt: "Find past papers I can practice with.",
    tint: "#FDECEC",
    color: "#E07A7A",
  },
];

const TOOLKIT_ICONS: Record<string, IconName> = {
  google_calendar: "calendar-month-outline",
  todoist: "checkbox-marked-circle-outline",
  notion: "notebook-outline",
  slack: "slack",
  gmail: "email-outline",
  github: "github",
  reddit: "reddit",
};

const STATUS_LABELS: Record<string, string> = {
  connected: "Connected",
  pending: "Pending",
  error: "Needs attention",
  disconnected: "Not connected",
};

function statusColor(status: AgentIntegrationToolkit["status"]) {
  if (status === "connected") return "#3F9B6D";
  if (status === "pending") return "#B7791F";
  if (status === "error") return "#C05656";
  return coachColors.textMuted;
}

function statusTint(status: AgentIntegrationToolkit["status"]) {
  if (status === "connected") return "#E7F6ED";
  if (status === "pending") return "#FFF3DE";
  if (status === "error") return "#FDECEC";
  return coachColors.background;
}

async function openExternal(url: string) {
  if (Platform.OS === "web") {
    await Linking.openURL(url);
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}

export default function AgentToolsSheet({
  visible,
  getToken,
  onClose,
  onPrompt,
}: AgentToolsSheetProps) {
  const [data, setData] = useState<AgentIntegrationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const response = await api.agent.integrations.list(token);
      setData(response);
    } catch (err) {
      setError(
        friendlyError(err, "Could not load your connectors. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const connect = async (toolkit: AgentIntegrationToolkit) => {
    if (busy) return;
    setBusy(`${toolkit.id}:connect`);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const response = await api.agent.integrations.connect(toolkit.id, token);
      await openExternal(response.redirectUrl);
      if (Platform.OS !== "web") {
        await api.agent.integrations.sync(toolkit.id, token);
        await load();
      }
    } catch (err) {
      setError(
        friendlyError(err, "Could not start that connection. Please try again."),
      );
    } finally {
      setBusy(null);
    }
  };

  const sync = async (toolkit: AgentIntegrationToolkit) => {
    if (busy) return;
    setBusy(`${toolkit.id}:sync`);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const response = await api.agent.integrations.sync(toolkit.id, token);
      setData((current) =>
        current
          ? {
              ...current,
              toolkits: current.toolkits.map((item) =>
                item.id === toolkit.id ? response.toolkit : item,
              ),
            }
          : current,
      );
    } catch (err) {
      setError(
        friendlyError(err, "Could not check that connection. Please try again."),
      );
    } finally {
      setBusy(null);
    }
  };

  const disconnect = (toolkit: AgentIntegrationToolkit) => {
    Alert.alert(
      `Disconnect ${toolkit.name}?`,
      "Your coach will stop using this account until you connect it again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            void (async () => {
              if (busy) return;
              setBusy(`${toolkit.id}:disconnect`);
              setError(null);
              try {
                const token = await getToken();
                if (!token) {
                  throw new Error("Your session expired. Please sign in again.");
                }
                await api.agent.integrations.disconnect(toolkit.id, token);
                await load();
              } catch (err) {
                setError(
                  friendlyError(
                    err,
                    "Could not disconnect that account. Please try again.",
                  ),
                );
              } finally {
                setBusy(null);
              }
            })();
          },
        },
      ],
    );
  };

  const usePrompt = (prompt: string) => {
    onPrompt(prompt);
    onClose();
  };

  return (
    <CoachSheet
      visible={visible}
      title="Agent connectors"
      subtitle="Let your coach use the tools you already work in."
      onClose={onClose}
      headerAction={
        <Pressable
          onPress={() => void load()}
          style={styles.refresh}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Refresh connectors"
        >
          <MaterialCommunityIcons
            name="refresh"
            size={18}
            color={coachColors.textSecondary}
          />
        </Pressable>
      }
    >
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="small" color={coachColors.accent} />
          <Text style={styles.stateText}>Checking your connections...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={16}
            color="#B45309"
          />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} hitSlop={8}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>BUILT-IN TOOLS</Text>
      <View style={styles.builtIns}>
        {BUILT_IN.map((tool) => (
          <Pressable
            key={tool.label}
            onPress={() => usePrompt(tool.prompt)}
            style={styles.builtIn}
            accessibilityRole="button"
            accessibilityLabel={`Ask the coach to use ${tool.label}`}
          >
            <View style={[styles.builtInIcon, { backgroundColor: tool.tint }]}>
              <MaterialCommunityIcons
                name={tool.icon}
                size={17}
                color={tool.color}
              />
            </View>
            <Text style={styles.builtInLabel}>{tool.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>CONNECTED ACCOUNTS</Text>

      {!loading && data && !data.configured ? (
        <View style={styles.notice}>
          <MaterialCommunityIcons
            name="information-outline"
            size={16}
            color={coachColors.textSecondary}
          />
          <Text style={styles.noticeText}>
            Connectors are not configured on this server yet. The built-in tools
            above still work.
          </Text>
        </View>
      ) : null}

      {!loading && data?.configured
        ? data.toolkits.map((toolkit) => {
            const connecting = busy === `${toolkit.id}:connect`;
            const syncing = busy === `${toolkit.id}:sync`;
            const disconnecting = busy === `${toolkit.id}:disconnect`;
            const working = connecting || syncing || disconnecting;
            const installed = toolkit.status === "connected";
            const icon = TOOLKIT_ICONS[toolkit.id] ?? "connection";

            return (
              <View key={toolkit.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.cardIcon}>
                    <MaterialCommunityIcons
                      name={icon}
                      size={19}
                      color={coachColors.textSecondary}
                    />
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{toolkit.name}</Text>
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {toolkit.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.status,
                      { backgroundColor: statusTint(toolkit.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColor(toolkit.status) },
                      ]}
                    >
                      {STATUS_LABELS[toolkit.status]}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  {installed ? (
                    <>
                      <Pressable
                        onPress={() =>
                          usePrompt(
                            `Use my ${toolkit.name} connection to help me with my studies.`,
                          )
                        }
                        style={styles.secondaryAction}
                        accessibilityRole="button"
                        accessibilityLabel={`Use ${toolkit.name} with the coach`}
                      >
                        <MaterialCommunityIcons
                          name="creation"
                          size={14}
                          color={coachColors.accent}
                        />
                        <Text style={styles.secondaryText}>Use in chat</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => disconnect(toolkit)}
                        disabled={working}
                        style={styles.dangerAction}
                        accessibilityRole="button"
                        accessibilityLabel={`Disconnect ${toolkit.name}`}
                      >
                        {disconnecting ? (
                          <ActivityIndicator
                            size="small"
                            color="#C05656"
                          />
                        ) : (
                          <Text style={styles.dangerText}>Disconnect</Text>
                        )}
                      </Pressable>
                    </>
                  ) : toolkit.status === "pending" ? (
                    <Pressable
                      onPress={() => void sync(toolkit)}
                      disabled={working}
                      style={styles.primaryAction}
                      accessibilityRole="button"
                      accessibilityLabel={`Check ${toolkit.name} connection`}
                    >
                      {syncing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryText}>Check connection</Text>
                      )}
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => void connect(toolkit)}
                      disabled={working}
                      style={styles.primaryAction}
                      accessibilityRole="button"
                      accessibilityLabel={`Connect ${toolkit.name}`}
                    >
                      {connecting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryText}>Connect</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        : null}
    </CoachSheet>
  );
}

const styles = StyleSheet.create({
  refresh: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: coachColors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  state: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 6,
  },
  stateText: {
    fontFamily: coachFont.regular,
    fontSize: 12,
    color: coachColors.textMuted,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontFamily: coachFont.regular,
    fontSize: 12,
    lineHeight: 17,
    color: "#92400E",
  },
  retry: {
    fontFamily: coachFont.semibold,
    fontSize: 12,
    color: "#92400E",
  },
  sectionLabel: {
    marginTop: 6,
    marginBottom: 2,
    fontFamily: coachFont.semibold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: coachColors.textMuted,
  },
  builtIns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  builtIn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: coachColors.border,
    backgroundColor: coachColors.surface,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  builtInIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  builtInLabel: {
    fontFamily: coachFont.medium,
    fontSize: 11,
    color: coachColors.textSecondary,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    backgroundColor: coachColors.background,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontFamily: coachFont.regular,
    fontSize: 11,
    lineHeight: 17,
    color: coachColors.textSecondary,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: coachColors.border,
    backgroundColor: coachColors.surface,
    padding: 12,
    gap: 10,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: coachColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: coachFont.semibold,
    fontSize: 13,
    color: coachColors.text,
  },
  cardDescription: {
    fontFamily: coachFont.regular,
    fontSize: 11,
    lineHeight: 16,
    color: coachColors.textMuted,
  },
  status: {
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: coachFont.semibold,
    fontSize: 9,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  primaryAction: {
    minWidth: 116,
    height: 34,
    borderRadius: 12,
    backgroundColor: coachColors.dark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryText: {
    fontFamily: coachFont.semibold,
    fontSize: 11,
    color: coachColors.white,
  },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 34,
    borderRadius: 12,
    backgroundColor: coachColors.accentSoft,
    paddingHorizontal: 12,
  },
  secondaryText: {
    fontFamily: coachFont.semibold,
    fontSize: 11,
    color: coachColors.accent,
  },
  dangerAction: {
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  dangerText: {
    fontFamily: coachFont.medium,
    fontSize: 11,
    color: "#C05656",
  },
});
