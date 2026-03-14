import "../lib/i18n";
import { ActivityIndicator, Text, View, useColorScheme } from "react-native";
import { Stack } from "expo-router";
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { useDatabase } from "../hooks/useDatabase";
import { colors } from "../lib/constants";

export default function RootLayout() {
  const { isReady, error } = useDatabase();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          backgroundColor: isDark ? colors.backgroundDark : colors.background,
        }}
        accessibilityRole="alert"
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: "600",
            color: isDark ? "#fff" : "#000",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Unable to load data
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {error.message}
        </Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        accessibilityLabel="Loading"
        accessibilityRole="progressbar"
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
