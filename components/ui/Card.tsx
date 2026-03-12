import {
  View,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ViewProps,
  useColorScheme,
} from "react-native";
import { colors } from "@/lib/constants";

interface CardProps extends Pick<ViewProps, "accessibilityLabel" | "accessibilityHint"> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function Card({ children, style, onPress, accessibilityLabel, accessibilityHint }: CardProps) {
  const isDark = useColorScheme() === "dark";

  const cardStyle: ViewStyle = {
    backgroundColor: isDark ? colors.surfaceDark : colors.surface,
    borderColor: isDark ? colors.borderDark : colors.border,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          cardStyle,
          !isDark && styles.shadow,
          pressed && styles.pressed,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.card, cardStyle, !isDark && styles.shadow, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
