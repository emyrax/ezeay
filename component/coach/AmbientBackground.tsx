import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

export default function AmbientBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <SvgLinearGradient id="coachBase" x1="0" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor="#EAF7FC" />
            <Stop offset="0.42" stopColor="#F9F8F3" />
            <Stop offset="0.76" stopColor="#FDF1DC" />
            <Stop offset="1" stopColor="#E6F4EA" />
          </SvgLinearGradient>
          <RadialGradient id="coachCool" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#E4F3FA" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#E4F3FA" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="coachPeach" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FDF1DC" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#FDF1DC" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="coachMint" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#E6F4EA" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#E6F4EA" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect width={width} height={height} fill="url(#coachBase)" />
        <Circle
          cx={width * 0.02}
          cy={height * 0.2}
          r={width * 0.78}
          fill="url(#coachCool)"
        />
        <Circle
          cx={width * 0.98}
          cy={height * 0.34}
          r={width * 0.76}
          fill="url(#coachPeach)"
        />
        <Circle
          cx={width * 0.22}
          cy={height * 1.04}
          r={width * 0.82}
          fill="url(#coachMint)"
        />
      </Svg>
    </View>
  );
}
