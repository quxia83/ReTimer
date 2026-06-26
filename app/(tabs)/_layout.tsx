import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "react-native";
import { SymbolView } from "expo-symbols";
import { colors } from "../../lib/constants";

export default function TabLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: isDark ? colors.backgroundDark : colors.background,
          borderTopColor: isDark ? colors.borderDark : colors.border,
        },
        headerStyle: {
          backgroundColor: isDark ? colors.backgroundDark : colors.background,
        },
        headerTintColor: isDark ? colors.textDark : colors.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.trackers"),
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "timer.circle.fill" : "timer"}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("tabs.history"),
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "clock.fill" : "clock"}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "gearshape.fill" : "gearshape"}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="tracker/add" options={{ href: null }} />
      <Tabs.Screen name="tracker/[id]" options={{ href: null }} />
    </Tabs>
  );
}
