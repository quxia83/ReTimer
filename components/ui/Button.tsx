import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/lib/constants";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
}: ButtonProps) {
  const isDark = useColorScheme() === "dark";

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const containerStyle = getContainerStyle(variant, isDark, disabled);
  const labelStyle = getLabelStyle(variant, isDark, disabled);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        containerStyle,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.label, labelStyle]}>{title}</Text>
    </Pressable>
  );
}

function getContainerStyle(
  variant: ButtonVariant,
  isDark: boolean,
  disabled: boolean
): ViewStyle {
  if (disabled) {
    return {
      backgroundColor: isDark ? "#3a3a3c" : "#dee2e6",
      borderWidth: 0,
    };
  }

  switch (variant) {
    case "primary":
      return {
        backgroundColor: colors.accent,
        borderWidth: 0,
      };
    case "secondary":
      return {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: isDark ? colors.accent : colors.accent,
      };
    case "danger":
      return {
        backgroundColor: colors.destructive,
        borderWidth: 0,
      };
  }
}

function getLabelStyle(
  variant: ButtonVariant,
  isDark: boolean,
  disabled: boolean
) {
  if (disabled) {
    return { color: isDark ? "#636366" : "#adb5bd" };
  }

  switch (variant) {
    case "primary":
      return { color: "#ffffff" };
    case "secondary":
      return { color: colors.accent };
    case "danger":
      return { color: "#ffffff" };
  }
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
