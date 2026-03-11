import { useState, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  useColorScheme,
} from "react-native";
import { useFocusEffect, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ThemedView, ThemedText } from "@/components/Themed";
import { clearAllDoseLogs } from "@/db/queries/doseLogs";
import { requestNotificationPermissions } from "@/lib/notifications";
import { colors } from "@/lib/constants";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

const NOTIFICATIONS_KEY = "notificationsGlobal";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useFocusEffect(
    useCallback(() => {
      db.select()
        .from(settings)
        .where(eq(settings.key, NOTIFICATIONS_KEY))
        .then((rows) => {
          setNotificationsEnabled(rows[0]?.value === "true");
        });
    }, [])
  );

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          t("settings.notifications"),
          "Notification permission was denied. Please enable it in Settings.",
          [{ text: t("common.ok") }]
        );
        return;
      }
    }
    setNotificationsEnabled(value);
    await db
      .insert(settings)
      .values({ key: NOTIFICATIONS_KEY, value: String(value) })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: String(value) },
      });
  };

  const handleClearHistory = () => {
    Alert.alert(
      t("settings.clearHistory"),
      t("settings.clearHistoryConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await clearAllDoseLogs();
            Alert.alert(t("settings.cleared"));
          },
        },
      ]
    );
  };

  const surfaceColor = isDark ? colors.surfaceDark : colors.surface;
  const borderColor = isDark ? colors.borderDark : colors.border;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: t("settings.title") }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Notifications Section */}
        <ThemedText variant="secondary" style={styles.sectionHeader}>
          {t("settings.notifications").toUpperCase()}
        </ThemedText>
        <ThemedView
          style={[styles.section, { backgroundColor: surfaceColor, borderColor }]}
        >
          <ThemedView
            style={[styles.row, { backgroundColor: surfaceColor }]}
          >
            <ThemedText style={styles.rowLabel}>
              {t("settings.notificationsGlobal")}
            </ThemedText>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: colors.accent }}
              accessibilityLabel={t("settings.notificationsGlobal")}
              accessibilityRole="switch"
            />
          </ThemedView>
        </ThemedView>
        <ThemedText variant="secondary" style={styles.sectionFooter}>
          {t("settings.notificationsDescription")}
        </ThemedText>

        {/* Data Section */}
        <ThemedText variant="secondary" style={styles.sectionHeader}>
          {t("settings.data").toUpperCase()}
        </ThemedText>
        <ThemedView
          style={[styles.section, { backgroundColor: surfaceColor, borderColor }]}
        >
          <Pressable
            onPress={handleClearHistory}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: surfaceColor, opacity: pressed ? 0.6 : 1 },
            ]}
            accessibilityLabel={t("settings.clearHistory")}
            accessibilityRole="button"
            accessibilityHint={t("settings.clearHistoryConfirm")}
          >
            <ThemedText style={[styles.rowLabel, { color: colors.destructive }]}>
              {t("settings.clearHistory")}
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* About Section */}
        <ThemedText variant="secondary" style={styles.sectionHeader}>
          {t("settings.about").toUpperCase()}
        </ThemedText>
        <ThemedView
          style={[styles.section, { backgroundColor: surfaceColor, borderColor }]}
        >
          <ThemedView
            style={[
              styles.row,
              styles.rowBorder,
              { backgroundColor: surfaceColor, borderBottomColor: borderColor },
            ]}
          >
            <ThemedText style={styles.rowLabel}>
              {t("settings.version")}
            </ThemedText>
            <ThemedText variant="secondary">1.0.0</ThemedText>
          </ThemedView>
          <ThemedView
            style={[styles.row, { backgroundColor: surfaceColor }]}
          >
            <ThemedText style={styles.rowLabel}>
              {t("settings.developer")}
            </ThemedText>
            <ThemedText variant="secondary">momodream</ThemedText>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 8,
  },
  sectionFooter: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    minHeight: 44,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 17,
  },
});
