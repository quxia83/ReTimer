import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { colors } from "../../lib/constants";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

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
          tabBarIcon: ({ color }) => <TabBarIcon name="repeat" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("tabs.history"),
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="clock-o" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
      <Tabs.Screen name="tracker/add" options={{ href: null }} />
      <Tabs.Screen name="tracker/[id]" options={{ href: null }} />
    </Tabs>
  );
}
