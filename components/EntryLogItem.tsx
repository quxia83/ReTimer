import { Pressable, StyleSheet, Alert, useColorScheme, View } from "react-native";
import { useTranslation } from "react-i18next";
import { format, isToday, isYesterday } from "date-fns";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/Themed";
import { colors } from "@/lib/constants";

export interface EntryLogItemProps {
  id: number;
  trackerName: string;
  loggedAt: string; // ISO string
  onDelete: (id: number) => void;
}

function formatTimestamp(isoString: string, yesterdayLabel: string): string {
  const date = new Date(isoString);
  const timeStr = format(date, "h:mm a");
  if (isToday(date)) {
    return timeStr;
  }
  if (isYesterday(date)) {
    return `${yesterdayLabel} ${timeStr}`;
  }
  return format(date, "MMM d h:mm a");
}

export function EntryLogItem({
  id,
  trackerName,
  loggedAt,
  onDelete,
}: EntryLogItemProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t("history.deleteConfirm"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => onDelete(id),
      },
    ]);
  };

  return (
    <Pressable
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: isDark ? colors.surfaceDark : colors.surface,
          borderBottomColor: isDark ? colors.borderDark : colors.border,
        },
        pressed && styles.pressed,
      ]}
      accessibilityLabel={`${trackerName}, ${formatTimestamp(loggedAt, t("history.yesterday"))}`}
      accessibilityHint={t("history.deleteConfirm")}
      accessibilityRole="button"
    >
      <View style={styles.dot} />
      <ThemedText style={styles.name} numberOfLines={1}>
        {trackerName}
      </ThemedText>
      <ThemedText variant="secondary" style={styles.time}>
        {formatTimestamp(loggedAt, t("history.yesterday"))}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: 10,
    flexShrink: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  time: {
    fontSize: 14,
    flexShrink: 0,
  },
});
