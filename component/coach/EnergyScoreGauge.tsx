import { useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, Line, Path, Pattern } from "react-native-svg";
import { coachColors, coachFont } from "../../constants/coachTheme";

interface EnergyScoreGaugeProps {
  score: number;
  max?: number;
  label?: string;
}

const WIDTH = 220;
const HEIGHT = 122;
const CENTER_X = WIDTH / 2;
const CENTER_Y = 94;
const RADIUS = 78;
const START_ANGLE = 170;
const SWEEP = 200;

function polar(angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: CENTER_X + RADIUS * Math.cos(radians),
    y: CENTER_Y + RADIUS * Math.sin(radians),
  };
}

function arcPath(sweep: number) {
  const start = polar(START_ANGLE);
  const end = polar(START_ANGLE + Math.max(0.01, sweep));
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function EnergyScoreGauge({
  score,
  max = 100,
  label = "Daily energy",
}: EnergyScoreGaugeProps) {
  const reactId = useId();
  const hatchId = `energyHatch${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(score, 0), safeMax);
  const progressSweep = (clamped / safeMax) * SWEEP;

  return (
    <View style={styles.wrap}>
      <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Defs>
          <Pattern
            id={hatchId}
            width={7}
            height={7}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <Line
              x1={0}
              y1={0}
              x2={0}
              y2={7}
              stroke="#E1E4E8"
              strokeWidth={2}
            />
          </Pattern>
        </Defs>

        <Path
          d={arcPath(SWEEP)}
          stroke={`url(#${hatchId})`}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
        />
        {progressSweep > 0 ? (
          <Path
            d={arcPath(progressSweep)}
            stroke={coachColors.energyFill}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
      </Svg>

      <View style={styles.valueWrap} pointerEvents="none">
        <View style={styles.scoreRow}>
          <Text style={styles.score}>{Math.round(clamped)}</Text>
          <Text style={styles.max}>/{Math.round(safeMax)}</Text>
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: WIDTH,
    height: HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  valueWrap: {
    position: "absolute",
    top: 36,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  score: {
    fontFamily: coachFont.bold,
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -0.5,
    color: coachColors.text,
  },
  max: {
    fontFamily: coachFont.medium,
    fontSize: 12,
    lineHeight: 24,
    color: coachColors.textMuted,
    marginBottom: 1,
  },
  label: {
    marginTop: 1,
    fontFamily: coachFont.medium,
    fontSize: 11,
    color: coachColors.textMuted,
  },
});
