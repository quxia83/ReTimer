import "../lib/i18n";
import { ActivityIndicator, View, useColorScheme } from "react-native";
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
