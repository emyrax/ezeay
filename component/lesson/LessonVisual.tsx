import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, G, Line, SvgXml, Text as SvgText } from "react-native-svg";
import { useThemeColors } from "../../hooks/useTheme";
import {
  equationAspectRatio,
  prepareEquationSvg,
} from "../../lib/lesson/player";
import type { LessonDiagramNode, LessonVisual as LessonVisualType } from "../../types/lesson";

interface Props {
  visual: LessonVisualType;
}

const CALLOUT_CONFIG = {
  key: {
    icon: "key-outline",
    label: "Key idea",
  },
  tip: {
    icon: "bulb-outline",
    label: "Good to know",
  },
  warn: {
    icon: "warning-outline",
    label: "Watch out",
  },
} as const;

function shortLabel(label: string): string {
  return label.length > 22 ? `${label.slice(0, 20).trimEnd()}...` : label;
}

function Diagram({
  nodes,
  edges,
  caption,
}: {
  nodes: LessonDiagramNode[];
  edges: [string, string][];
  caption?: string;
}) {
  const theme = useThemeColors();
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
      map.set(node.id, {
        x: 8 + (node.x / 100) * 84,
        y: 7 + (node.y / 100) * 39,
      });
    }
    return map;
  }, [nodes]);

  return (
    <View>
      <Svg width="100%" height={230} viewBox="0 0 100 60">
        {edges.map(([from, to]) => {
          const start = positions.get(from);
          const end = positions.get(to);
          if (!start || !end) return null;
          return (
            <Line
              key={`${from}-${to}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={theme.textMuted}
              strokeWidth={0.5}
              strokeDasharray="1.4 1.1"
            />
          );
        })}
        {nodes.map((node, index) => {
          const position = positions.get(node.id);
          if (!position) return null;
          const labelAnchor: "start" | "end" | "middle" =
            position.x < 24 ? "start" : position.x > 76 ? "end" : "middle";
          return (
            <G key={node.id}>
              <Circle
                cx={position.x}
                cy={position.y}
                r={3.4}
                fill={theme.primary}
                opacity={0.16}
              />
              <Circle
                cx={position.x}
                cy={position.y}
                r={2.3}
                fill={theme.surface}
                stroke={theme.primary}
                strokeWidth={0.55}
              />
              <SvgText
                x={position.x}
                y={position.y + 1.05}
                fontSize={2.3}
                fontWeight="700"
                fill={theme.primary}
                textAnchor="middle"
              >
                {index + 1}
              </SvgText>
              <SvgText
                x={position.x}
                y={position.y + 6.1}
                fontSize={2.55}
                fontWeight="600"
                fill={theme.textSecondary}
                textAnchor={labelAnchor}
              >
                {shortLabel(node.label)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      {caption ? (
        <Text style={[styles.caption, { color: theme.textMuted }]}>{caption}</Text>
      ) : null}
    </View>
  );
}

function Equation({
  svg,
  latex,
  caption,
}: {
  svg?: string;
  latex: string;
  caption?: string;
}) {
  const theme = useThemeColors();
  const prepared = useMemo(
    () => (svg ? prepareEquationSvg(svg, theme.text) : null),
    [svg, theme.text],
  );
  const ratio = useMemo(() => (svg ? equationAspectRatio(svg) : null), [svg]);
  const aspectRatio = ratio ? Math.min(Math.max(ratio, 0.5), 5) : 2.4;

  return (
    <View style={styles.equationWrap}>
      {prepared ? (
        <View style={[styles.equationSvg, { aspectRatio }]}>
          <SvgXml xml={prepared} width="100%" height="100%" />
        </View>
      ) : (
        <View
          style={[
            styles.latexFallback,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.latexText, { color: theme.text }]}>{latex}</Text>
        </View>
      )}
      {caption ? (
        <Text style={[styles.caption, { color: theme.textMuted }]}>{caption}</Text>
      ) : null}
    </View>
  );
}

export default function LessonVisual({ visual }: Props) {
  const theme = useThemeColors();

  switch (visual.kind) {
    case "title":
      return (
        <View style={styles.titleWrap}>
          <View style={[styles.titleRule, { backgroundColor: theme.primary }]} />
          <Text style={[styles.title, { color: theme.text }]}>{visual.text}</Text>
          {visual.subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {visual.subtitle}
            </Text>
          ) : null}
        </View>
      );

    case "bullets":
      return (
        <View style={styles.bulletList}>
          {visual.items.map((item, index) => (
            <View key={`${index}-${item}`} style={styles.bulletRow}>
              <View
                style={[
                  styles.bulletNumber,
                  {
                    backgroundColor: theme.primary + "16",
                    borderColor: theme.primary + "45",
                  },
                ]}
              >
                <Text style={[styles.bulletNumberText, { color: theme.primary }]}>
                  {index + 1}
                </Text>
              </View>
              <Text style={[styles.bulletText, { color: theme.text }]}>{item}</Text>
            </View>
          ))}
        </View>
      );

    case "equation":
      return (
        <Equation
          svg={visual.svg}
          latex={visual.latex}
          caption={visual.caption}
        />
      );

    case "diagram":
      return (
        <Diagram
          nodes={visual.nodes}
          edges={visual.edges}
          caption={visual.caption}
        />
      );

    case "callout": {
      const config = CALLOUT_CONFIG[visual.tone];
      const toneColor =
        visual.tone === "warn"
          ? theme.warning
          : visual.tone === "tip"
            ? theme.success
            : theme.primary;
      return (
        <View
          style={[
            styles.callout,
            {
              backgroundColor: toneColor + "12",
              borderColor: toneColor + "38",
            },
          ]}
        >
          <View style={styles.calloutHeader}>
            <Ionicons name={config.icon} size={18} color={toneColor} />
            <Text style={[styles.calloutLabel, { color: toneColor }]}>
              {config.label}
            </Text>
          </View>
          <Text style={[styles.calloutText, { color: theme.text }]}>
            {visual.text}
          </Text>
        </View>
      );
    }

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 18,
  },
  titleRule: {
    width: 38,
    height: 4,
    borderRadius: 2,
    marginBottom: 18,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 460,
  },
  bulletList: {
    gap: 14,
    paddingVertical: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bulletNumber: {
    width: 27,
    height: 27,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  bulletNumberText: {
    fontSize: 12,
    fontWeight: "800",
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  equationWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  equationSvg: {
    width: "100%",
    maxWidth: 500,
  },
  latexFallback: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  latexText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  caption: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  callout: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  calloutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  calloutLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  calloutText: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "500",
  },
});
