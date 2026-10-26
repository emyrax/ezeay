import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, G, Line, SvgXml, Text as SvgText } from "react-native-svg";
import { useThemeColors } from "../../hooks/useTheme";
import {
  equationAspectRatio,
  prepareEquationSvg,
} from "../../lib/lesson/player";
import type { LessonMotionPreset } from "../../lib/lesson/motion";
import type {
  LessonDiagramNode,
  LessonReveal,
  LessonVisual as LessonVisualType,
} from "../../types/lesson";
import AnimatedWords from "./AnimatedWords";
import MotionReveal from "./MotionReveal";

interface Props {
  visual: LessonVisualType;
  preset: LessonMotionPreset;
  reveal: LessonReveal;
}

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

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

interface MotionProps {
  preset: LessonMotionPreset;
  enabled: boolean;
}

function shortLabel(label: string): string {
  return label.length > 22 ? `${label.slice(0, 20).trimEnd()}...` : label;
}

function TitleVisual({
  text,
  subtitle,
  preset,
  enabled,
}: MotionProps & { text: string; subtitle?: string }) {
  const theme = useThemeColors();
  const ruleWidth = useRef(new Animated.Value(enabled ? 0 : 38)).current;

  useEffect(() => {
    ruleWidth.stopAnimation();

    if (!enabled) {
      ruleWidth.setValue(38);
      return;
    }

    ruleWidth.setValue(0);
    const animation = Animated.timing(ruleWidth, {
      toValue: 38,
      duration: Math.max(160, preset.duration * 0.8),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [enabled, preset.duration, ruleWidth]);

  return (
    <View style={styles.titleWrap}>
      <Animated.View
        style={[
          styles.titleRule,
          { backgroundColor: theme.primary, width: ruleWidth },
        ]}
      />
      {enabled && preset.wordReveal ? (
        <AnimatedWords
          text={text}
          preset={preset}
          enabled
          replayKey={text}
          delay={preset.stagger}
          align="center"
          textStyle={[styles.title, { color: theme.text }]}
        />
      ) : (
        <MotionReveal
          preset={preset}
          enabled={enabled}
          delay={preset.stagger}
          style={styles.titleReveal}
        >
          <Text style={[styles.title, { color: theme.text }]}>{text}</Text>
        </MotionReveal>
      )}
      {subtitle ? (
        <MotionReveal
          preset={preset}
          enabled={enabled}
          delay={preset.stagger * 2}
          style={styles.titleReveal}
        >
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        </MotionReveal>
      ) : null}
    </View>
  );
}

function BulletsVisual({
  items,
  preset,
  enabled,
}: MotionProps & { items: string[] }) {
  const theme = useThemeColors();

  return (
    <View style={styles.bulletList}>
      <View
        pointerEvents="none"
        style={[styles.bulletRail, { backgroundColor: theme.border }]}
      />
      {items.map((item, index) => {
        const delay = index * Math.max(35, preset.stagger);
        return (
          <View key={`${index}-${item}`} style={styles.bulletRow}>
            <MotionReveal
              preset={preset}
              enabled={enabled}
              delay={delay}
              direction="none"
              scaleFrom={0.45}
            >
              <View
                style={[
                  styles.bulletNumber,
                  {
                    backgroundColor: theme.primary + "16",
                    borderColor: theme.primary + "45",
                  },
                ]}
              >
                <Text
                  style={[styles.bulletNumberText, { color: theme.primary }]}
                >
                  {index + 1}
                </Text>
              </View>
            </MotionReveal>
            <View style={styles.bulletCopy}>
              <AnimatedWords
                text={item}
                preset={preset}
                enabled={enabled}
                replayKey={`${index}-${item}`}
                delay={delay + preset.stagger * 0.4}
                align="left"
                textStyle={[styles.bulletText, { color: theme.text }]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function EquationVisual({
  svg,
  latex,
  caption,
  preset,
  enabled,
}: MotionProps & { svg?: string; latex: string; caption?: string }) {
  const theme = useThemeColors();
  const prepared = useMemo(
    () => (svg ? prepareEquationSvg(svg, theme.text) : null),
    [svg, theme.text],
  );
  const ratio = useMemo(() => (svg ? equationAspectRatio(svg) : null), [svg]);
  const aspectRatio = ratio ? Math.min(Math.max(ratio, 0.5), 5) : 2.4;
  const glow = useRef(new Animated.Value(0)).current;
  const activeGlow = enabled && preset.sweep;

  useEffect(() => {
    glow.stopAnimation();

    if (!activeGlow) {
      glow.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [activeGlow, glow]);

  return (
    <View style={styles.equationWrap}>
      <MotionReveal
        preset={preset}
        enabled={enabled}
        style={styles.equationReveal}
      >
        <View style={styles.equationFrame}>
          {activeGlow ? (
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.equationGlow,
                {
                  backgroundColor: theme.primary,
                  opacity: glow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.03, 0.09],
                  }),
                },
              ]}
            />
          ) : null}
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
              <Text style={[styles.latexText, { color: theme.text }]}>
                {latex}
              </Text>
            </View>
          )}
        </View>
      </MotionReveal>
      {caption ? (
        <MotionReveal
          preset={preset}
          enabled={enabled}
          delay={preset.stagger * 1.5}
        >
          <Text style={[styles.caption, { color: theme.textMuted }]}>
            {caption}
          </Text>
        </MotionReveal>
      ) : null}
    </View>
  );
}

function AnimatedEdge({
  start,
  end,
  color,
  preset,
  enabled,
  delay,
}: {
  start: { x: number; y: number };
  end: { x: number; y: number };
  color: string;
  preset: LessonMotionPreset;
  enabled: boolean;
  delay: number;
}) {
  const draw = enabled && preset.drawDiagram;
  const progress = useRef(new Animated.Value(draw ? 0 : 1)).current;
  const length = Math.max(
    0.01,
    Math.hypot(end.x - start.x, end.y - start.y),
  );

  useEffect(() => {
    progress.stopAnimation();

    if (!draw) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, {
        toValue: 1,
        duration: preset.duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, draw, preset.duration, progress]);

  return (
    <AnimatedLine
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke={color}
      strokeWidth={0.55}
      strokeDasharray={[length, length]}
      strokeDashoffset={progress.interpolate({
        inputRange: [0, 1],
        outputRange: [length, 0],
      })}
      opacity={progress.interpolate({
        inputRange: [0, 0.2, 1],
        outputRange: [0, 0.35, 0.55],
      })}
      strokeLinecap="round"
    />
  );
}

function AnimatedNode({
  node,
  index,
  preset,
  enabled,
  delay,
}: {
  node: LessonDiagramNode;
  index: number;
  preset: LessonMotionPreset;
  enabled: boolean;
  delay: number;
}) {
  const theme = useThemeColors();
  const progress = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const activePulse = enabled && preset.sweep;

  useEffect(() => {
    progress.stopAnimation();

    if (!enabled) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(delay + index * preset.stagger),
      Animated.timing(progress, {
        toValue: 1,
        duration: Math.max(160, preset.duration * 0.75),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, enabled, index, preset.duration, preset.stagger, progress]);

  useEffect(() => {
    pulse.stopAnimation();

    if (!activePulse) {
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(
          delay +
            index * preset.stagger +
            Math.max(200, preset.duration * 0.8),
        ),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [
    activePulse,
    delay,
    index,
    preset.duration,
    preset.stagger,
    pulse,
  ]);

  const labelAnchor: "start" | "end" | "middle" =
    node.x < 24 ? "start" : node.x > 76 ? "end" : "middle";
  const haloRadius = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3.4],
  });
  const coreRadius = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2.3],
  });

  return (
    <AnimatedG opacity={progress}>
      {activePulse ? (
        <AnimatedCircle
          cx={node.x}
          cy={node.y}
          r={Animated.add(
            haloRadius,
            pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 2.8],
            }),
          )}
          fill={theme.primary}
          opacity={pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.16, 0],
          })}
        />
      ) : null}
      <AnimatedCircle
        cx={node.x}
        cy={node.y}
        r={haloRadius}
        fill={theme.primary}
        opacity={0.16}
      />
      <AnimatedCircle
        cx={node.x}
        cy={node.y}
        r={coreRadius}
        fill={theme.surface}
        stroke={theme.primary}
        strokeWidth={0.55}
      />
      <SvgText
        x={node.x}
        y={node.y + 1.05}
        fontSize={2.3}
        fontWeight="700"
        fill={theme.primary}
        textAnchor="middle"
      >
        {index + 1}
      </SvgText>
      <SvgText
        x={node.x}
        y={node.y + 6.1}
        fontSize={2.55}
        fontWeight="600"
        fill={theme.textSecondary}
        textAnchor={labelAnchor}
      >
        {shortLabel(node.label)}
      </SvgText>
    </AnimatedG>
  );
}

function FlowEdge({
  start,
  end,
  color,
  active,
}: {
  start: { x: number; y: number };
  end: { x: number; y: number };
  color: string;
  active: boolean;
}) {
  const flow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    flow.stopAnimation();

    if (!active) {
      flow.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(flow, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, flow]);

  if (!active) return null;

  return (
    <AnimatedLine
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke={color}
      strokeWidth={0.7}
      strokeDasharray="1.4 1.1"
      strokeDashoffset={flow.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
      })}
      opacity={0.42}
      strokeLinecap="round"
    />
  );
}

function Diagram({
  nodes,
  edges,
  caption,
  preset,
  enabled,
}: MotionProps & {
  nodes: LessonDiagramNode[];
  edges: [string, string][];
  caption?: string;
}) {
  const theme = useThemeColors();
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
      const position = {
        x: 8 + (node.x / 100) * 84,
        y: 7 + (node.y / 100) * 39,
      };
      map.set(node.id, position);
    }
    return map;
  }, [nodes]);

  const nodeDelay = preset.drawDiagram ? preset.duration * 0.55 : 0;

  return (
    <View>
      <Svg width="100%" height={230} viewBox="0 0 100 60">
        {edges.map(([from, to], index) => {
          const start = positions.get(from);
          const end = positions.get(to);
          if (!start || !end) return null;
          return (
            <G key={`${from}-${to}`}>
              <Line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={theme.textMuted}
                strokeWidth={0.35}
                strokeDasharray="1.4 1.1"
                opacity={0.25}
              />
              <AnimatedEdge
                start={start}
                end={end}
                color={theme.primary}
                preset={preset}
                enabled={enabled}
                delay={index * Math.max(35, preset.stagger * 0.55)}
              />
              <FlowEdge
                start={start}
                end={end}
                color={theme.primary}
                active={enabled && preset.sweep}
              />
            </G>
          );
        })}
        {nodes.map((node, index) => {
          const position = positions.get(node.id);
          if (!position) return null;
          const mappedNode = {
            ...node,
            x: position.x,
            y: position.y,
          };
          return (
            <AnimatedNode
              key={node.id}
              node={mappedNode}
              index={index}
              preset={preset}
              enabled={enabled}
              delay={nodeDelay}
            />
          );
        })}
      </Svg>
      {caption ? (
        <MotionReveal
          preset={preset}
          enabled={enabled}
          delay={preset.stagger * 1.5}
        >
          <Text style={[styles.caption, { color: theme.textMuted }]}>
            {caption}
          </Text>
        </MotionReveal>
      ) : null}
    </View>
  );
}

function CalloutVisual({
  tone,
  text,
  preset,
  enabled,
}: MotionProps & { tone: "key" | "tip" | "warn"; text: string }) {
  const theme = useThemeColors();
  const iconScale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const config = CALLOUT_CONFIG[tone];
  const toneColor =
    tone === "warn"
      ? theme.warning
      : tone === "tip"
        ? theme.success
        : theme.primary;
  const shouldPulse = enabled && preset.style !== "calm";

  useEffect(() => {
    iconScale.stopAnimation();

    if (!shouldPulse) {
      iconScale.setValue(1);
      return;
    }

    const animation = Animated.sequence([
      Animated.delay(Math.max(180, preset.duration * 0.5)),
      Animated.timing(iconScale, {
        toValue: 1.14,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(iconScale, {
        toValue: 1,
        duration: 180,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [iconScale, preset.duration, shouldPulse]);

  useEffect(() => {
    glow.stopAnimation();

    if (!shouldPulse) {
      glow.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, shouldPulse]);

  return (
    <MotionReveal
      preset={preset}
      enabled={enabled}
      style={styles.calloutReveal}
    >
      <View
        style={[
          styles.callout,
          {
            backgroundColor: toneColor + "12",
            borderColor: toneColor + "38",
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.calloutGlow,
            {
              borderColor: toneColor,
              opacity: glow.interpolate({
                inputRange: [0, 1],
                outputRange: [0.04, 0.24],
              }),
            },
          ]}
        />
        <View style={styles.calloutHeader}>
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Ionicons name={config.icon} size={18} color={toneColor} />
          </Animated.View>
          <Text style={[styles.calloutLabel, { color: toneColor }]}>
            {config.label}
          </Text>
        </View>
        <AnimatedWords
          text={text}
          preset={preset}
          enabled={enabled}
          replayKey={text}
          delay={preset.stagger}
          align="left"
          textStyle={[styles.calloutText, { color: theme.text }]}
        />
      </View>
    </MotionReveal>
  );
}

function LessonVisual({ visual, preset, reveal }: Props) {
  const enabled = preset.enabled && reveal !== "none";

  switch (visual.kind) {
    case "title":
      return (
        <TitleVisual
          text={visual.text}
          subtitle={visual.subtitle}
          preset={preset}
          enabled={enabled}
        />
      );

    case "bullets":
      return (
        <BulletsVisual
          items={visual.items}
          preset={preset}
          enabled={enabled}
        />
      );

    case "equation":
      return (
        <EquationVisual
          svg={visual.svg}
          latex={visual.latex}
          caption={visual.caption}
          preset={preset}
          enabled={enabled}
        />
      );

    case "diagram":
      return (
        <Diagram
          nodes={visual.nodes}
          edges={visual.edges}
          caption={visual.caption}
          preset={preset}
          enabled={enabled}
        />
      );

    case "callout":
      return (
        <CalloutVisual
          tone={visual.tone}
          text={visual.text}
          preset={preset}
          enabled={enabled}
        />
      );

    default:
      return null;
  }
}

export default React.memo(LessonVisual);

const styles = StyleSheet.create({
  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 18,
  },
  titleReveal: {
    width: "100%",
    alignItems: "center",
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
    position: "relative",
  },
  bulletRail: {
    position: "absolute",
    left: 13,
    top: 22,
    bottom: 22,
    width: 1,
    opacity: 0.55,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bulletCopy: {
    flex: 1,
    paddingTop: 1,
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
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  equationWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  equationReveal: {
    width: "100%",
    alignItems: "center",
  },
  equationFrame: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 20,
    overflow: "hidden",
  },
  equationGlow: {
    borderRadius: 20,
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
  calloutReveal: {
    width: "100%",
  },
  callout: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
  },
  calloutGlow: {
    borderRadius: 16,
    borderWidth: 1,
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
