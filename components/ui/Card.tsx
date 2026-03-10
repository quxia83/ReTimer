import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  useColorScheme,
} from "react-native";
import { colors } from "@/lib/constants";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
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
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, cardStyle, !isDark && styles.shadow, style]}>
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
