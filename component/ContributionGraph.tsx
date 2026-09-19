import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useThemeColors } from "../hooks/useTheme";
import { useStatsStore } from "../store/statsStore";
import { useUserStore } from "../store/userStore";
import { useAuth } from "../contexts/AuthContext";

type Range = "day" | "week" | "month" | "year";

const RANGE_CONFIG: Record<Range, { cols: number; square: number; gap: number; label: string }> = {
  day: { cols: 7, square: 24, gap: 4, label: "Day" },
  week: { cols: 14, square: 18, gap: 3, label: "Week" },
  month: { cols: 30, square: 12, gap: 3, label: "Month" },
  year: { cols: 53, square: 12, gap: 3, label: "Year" },
};

const ROWS = 7;
const LABEL_WIDTH = 28;

function getColor(count: number, base: string) {
  if (count === 0) return base + "1A";
  if (count <= 2) return base + "40";
  if (count <= 5) return base + "70";
  if (count <= 10) return base + "B0";
  return base;
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

interface TooltipData {
  date: string;
  count: number;
  x: number;
  y: number;
}

export default function ContributionGraph() {
  const theme = useThemeColors();
  const [range, setRange] = useState<Range>("year");
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const days = useStatsStore((s) => s.days);
  const loaded = useStatsStore((s) => s.loaded);
  const loadDays = useStatsStore((s) => s.loadDays);
  const profile = useUserStore((s) => s.profile);
  const { getToken } = useAuth();

  useEffect(() => {
    if (!loaded && profile?.uid) loadDays(profile.uid, getToken);
  }, [loaded, loadDays, profile?.uid, getToken]);

  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((d) => {
      map.set(d.date, d.count);
    });
    return map;
  }, [days]);

  const config = RANGE_CONFIG[range];
  const { cols, square, gap } = config;
  const totalDays = cols * ROWS;
  const today = new Date();
  const baseColor = theme.tabInactive;

  const cells = useMemo(() => {
    const result: { x: number; y: number; color: string; date: string; count: number }[] = [];
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < ROWS; row++) {
        const d = new Date(today);
        d.setDate(d.getDate() - (totalDays - (col * ROWS + row) - 1));
        const dateStr = d.toISOString().slice(0, 10);
        const count = activityMap.get(dateStr) || 0;
        result.push({
          x: col * (square + gap),
          y: row * (square + gap),
          color: getColor(count, baseColor),
          date: dateStr,
          count,
        });
      }
    }
    return result;
  }, [activityMap, cols, square, gap, baseColor]);

  const height = ROWS * (square + gap);
  const width = cols * (square + gap);
  const needsScroll = width > 250;

  const monthLabels = useMemo(() => {
    if (cols < 20) return [];
    const labels: { x: number; label: string }[] = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const added = new Set<number>();
    for (let col = 0; col < cols; col++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (totalDays - (col * ROWS) - 1));
      const m = d.getMonth();
      if (!added.has(m)) {
        labels.push({ x: col * (square + gap), label: months[m] });
        added.add(m);
      }
    }
    return labels;
  }, [cols, square, gap]);

  const handleCellPress = useCallback((cell: typeof cells[0]) => {
    const dateObj = new Date(cell.date + "T00:00:00");
    const formatted = dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    setTooltip({
      date: formatted,
      count: cell.count,
      x: cell.x,
      y: cell.y,
    });
  }, []);

  const dismissTooltip = useCallback(() => setTooltip(null), []);

  const renderGrid = () => (
    <Svg width={width} height={height}>
      {cells.map((cell, i) => (
        <Rect
          key={i}
          x={cell.x}
          y={cell.y}
          width={square}
          height={square}
          rx={3}
          ry={3}
          fill={cell.color}
          onPress={() => handleCellPress(cell)}
        />
      ))}
    </Svg>
  );

  return (
    <Pressable onPress={dismissTooltip}>
      <View style={[styles.card, { backgroundColor: theme.surface, marginTop: 8 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Activity</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your learning consistency
        </Text>

        <View style={styles.rangeRow}>
          {(Object.entries(RANGE_CONFIG) as [Range, typeof config][]).map(([key, cfg]) => {
            const active = range === key;
            return (
              <Pressable
                key={key}
                onPress={() => { setRange(key); dismissTooltip(); }}
                style={[
                  styles.pill,
                  { borderColor: theme.border },
                  active && { backgroundColor: theme.tabActive, borderColor: theme.tabActive },
                ]}
              >
                <Text
                  style={[styles.pillText, { color: active ? "#FFFFFF" : theme.tabInactive }]}
                >
                  {cfg.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tooltip && (
          <View
            style={[
              styles.tooltip,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.tooltipDate, { color: theme.text }]}>{tooltip.date}</Text>
            <Text style={[styles.tooltipCount, { color: theme.primary }]}>
              {tooltip.count} {tooltip.count === 1 ? "activity" : "activities"}
            </Text>
          </View>
        )}

        <View style={styles.graphRow}>
          <View style={styles.labelsCol}>
            {DAY_LABELS.map((l, i) => (
              <Text
                key={i}
                style={[styles.dayLabel, { color: theme.textMuted, height: square + gap }]}
              >
                {l}
              </Text>
            ))}
          </View>

          {needsScroll ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {monthLabels.length > 0 && (
                  <View style={styles.monthRow}>
                    {monthLabels.map((m, i) => (
                      <Text
                        key={i}
                        style={[styles.monthLabel, { color: theme.textMuted, position: "absolute", left: m.x }]}
                      >
                        {m.label}
                      </Text>
                    ))}
                  </View>
                )}
                {renderGrid()}
              </View>
            </ScrollView>
          ) : (
            <View>
              {renderGrid()}
            </View>
          )}
        </View>

        <View style={styles.legend}>
          <Text style={[styles.legendLabel, { color: theme.textMuted }]}>Less</Text>
          {[0, 2, 5, 10, 15].map((c) => (
            <View
              key={c}
              style={[styles.legendSquare, { backgroundColor: getColor(c, baseColor) }]}
            />
          ))}
          <Text style={[styles.legendLabel, { color: theme.textMuted }]}>More</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 12,
  },
  rangeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  tooltip: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 2,
  },
  tooltipDate: {
    fontSize: 12,
    fontWeight: "700",
  },
  tooltipCount: {
    fontSize: 11,
    fontWeight: "600",
  },
  graphRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  labelsCol: {
    width: LABEL_WIDTH,
    marginRight: 4,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 15,
  },
  monthRow: {
    flexDirection: "row",
    height: 16,
  },
  monthLabel: {
    fontSize: 9,
    fontWeight: "500",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 12,
  },
  legendLabel: { fontSize: 10, marginHorizontal: 4 },
  legendSquare: { width: 10, height: 10, borderRadius: 2 },
});
