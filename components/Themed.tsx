import { Text as DefaultText, View as DefaultView, StyleSheet } from "react-native";
import { useColorScheme } from "react-native";
import { colors } from "@/lib/constants";

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type ThemedTextProps = ThemeProps &
  DefaultText["props"] & {
    variant?: "default" | "secondary" | "title";
  };

export type ThemedViewProps = ThemeProps & DefaultView["props"];

function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: "text" | "background" | "surface" | "border"
) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  if (isDark && props.dark) return props.dark;
  if (!isDark && props.light) return props.light;

  switch (colorName) {
    case "text":
      return isDark ? colors.textDark : colors.text;
    case "background":
      return isDark ? colors.backgroundDark : colors.background;
    case "surface":
      return isDark ? colors.surfaceDark : colors.surface;
    case "border":
      return isDark ? colors.borderDark : colors.border;
  }
}

export function ThemedText(props: ThemedTextProps) {
  const {
    style,
    lightColor,
    darkColor,
    variant = "default",
    ...rest
  } = props;

  const color = useThemeColor(
    { light: lightColor, dark: darkColor },
    "text"
  );

  const variantStyle =
    variant === "title"
      ? styles.title
      : variant === "secondary"
        ? styles.secondary
        : undefined;

  const variantColor =
    variant === "secondary" ? colors.textSecondary : color;

  return (
    <DefaultText
      style={[{ color: variantColor }, variantStyle, style]}
      {...rest}
    />
  );
}

export function ThemedView(props: ThemedViewProps) {
  const { style, lightColor, darkColor, ...rest } = props;

  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background"
  );

  return <DefaultView style={[{ backgroundColor }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.35,
  },
  secondary: {
    fontSize: 14,
    lineHeight: 20,
  },
});
