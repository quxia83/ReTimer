import Svg, { Circle } from "react-native-svg";
import { View, StyleSheet, useColorScheme } from "react-native";
import { ThemedText } from "@/components/Themed";

interface CooldownRingProps {
  progress: number;
  color: string;
  isOverdue?: boolean;
  size?: number;
  strokeWidth?: number;
}

export function CooldownRing({
  progress,
  color,
  isOverdue = false,
  size = 52,
  strokeWidth = 5,
}: CooldownRingProps) {
  const isDark = useColorScheme() === "dark";
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const trackColor = isDark
    ? "rgba(255,255,255,0.12)"
    : "rgba(0,0,0,0.08)";

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      {isOverdue && (
        <View style={styles.badge}>
          <ThemedText style={[styles.badgeText, { color }]}>!</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 14,
  },
});
