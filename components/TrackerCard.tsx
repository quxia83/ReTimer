import { View, StyleSheet, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";
import { format, isToday, isYesterday } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ThemedText } from "@/components/Themed";
import { useCooldownStatus, CooldownStatus } from "@/hooks/useCooldownStatus";
import { colors } from "@/lib/constants";
import { formatCountdown } from "@/lib/duration";

const BUILT_IN_CATS = ["health", "vehicle", "home", "personal", "other"];

interface TrackerCardProps {
  tracker: {
    id: number;
    name: string;
    cooldownMin: number;
    cooldownMax: number;
    notes: string | null;
    notifyEnabled: number;
    category: string | null;
  };
  lastEntryAt: string | null;
  onLogEntry: (trackerId: number) => void;
  onPress: (trackerId: number) => void;
}

function formatLastTaken(
  dateStr: string,
  t: (key: string, opts?: Record<string, string>) => string
): string {
  const date = new Date(dateStr);
  const timeStr = format(date, "h:mm a");
  if (isToday(date)) {
    return `${t("history.today")} ${timeStr}`;
  }
  if (isYesterday(date)) {
    return `${t("history.yesterday")} ${timeStr}`;
  }
  return format(date, "MMM d h:mm a");
}

function getTrafficColor(status: CooldownStatus): string {
  switch (status) {
    case "red":
      return colors.red;
    case "yellow":
      return colors.yellow;
    case "green":
      return colors.green;
  }
}

function getBgColor(status: CooldownStatus, isDark: boolean): string {
  switch (status) {
    case "red":
      return isDark ? colors.redBgDark : colors.redBg;
    case "yellow":
      return isDark ? colors.yellowBgDark : colors.yellowBg;
    case "green":
      return isDark ? colors.greenBgDark : colors.greenBg;
  }
}

export function TrackerCard({
  tracker,
  lastEntryAt,
  onLogEntry,
  onPress,
}: TrackerCardProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const { status, remainingSeconds } = useCooldownStatus(
    lastEntryAt,
    tracker.cooldownMin,
    tracker.cooldownMax
  );

  const trafficColor = getTrafficColor(status);
  const bgColor = getBgColor(status, isDark);

  const statusText =
    status === "green"
      ? t("status.safe")
      : status === "red"
        ? t("status.wait", { time: formatCountdown(remainingSeconds) })
        : t("status.approachingTime", {
            time: formatCountdown(remainingSeconds),
          });

  const lastTakenText = lastEntryAt
    ? t("entry.lastLogged", { time: formatLastTaken(lastEntryAt, t) })
    : t("entry.neverLogged");

  // Descriptive label for VoiceOver
  const trafficAccessibilityLabel =
    status === "green"
      ? `${tracker.name}: ${t("status.safe")}`
      : status === "red"
        ? `${tracker.name}: ${t("status.wait", { time: formatCountdown(remainingSeconds) })}`
        : `${tracker.name}: ${t("status.approachingTime", { time: formatCountdown(remainingSeconds) })}`;

  return (
    <Card
      onPress={() => onPress(tracker.id)}
      style={[styles.card, { backgroundColor: bgColor }]}
      accessibilityLabel={`${tracker.name}, ${statusText}`}
      accessibilityHint={t("entry.tapToViewDetails")}
    >
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <ThemedText
            style={styles.name}
            accessibilityRole="header"
          >
            {tracker.name}
          </ThemedText>
          {tracker.category && tracker.category !== "other" ? (
            <ThemedText variant="secondary" style={styles.category}>
              {BUILT_IN_CATS.includes(tracker.category)
                ? t(`categories.${tracker.category}`)
                : tracker.category}
            </ThemedText>
          ) : null}
          {tracker.notes ? (
            <ThemedText variant="secondary" style={styles.notes}>
              {tracker.notes}
            </ThemedText>
          ) : null}
        </View>
        <View
          style={[styles.trafficLight, { backgroundColor: trafficColor }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={trafficAccessibilityLabel}
        />
      </View>

      <ThemedText style={[styles.statusText, { color: trafficColor }]}>
        {statusText}
      </ThemedText>

      <ThemedText variant="secondary" style={styles.lastTaken}>
        {lastTakenText}
      </ThemedText>

      <Button
        title={t("entry.log")}
        variant={status === "green" ? "primary" : "secondary"}
        onPress={() => onLogEntry(tracker.id)}
        style={styles.logButton}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleArea: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  category: {
    marginTop: 2,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notes: {
    marginTop: 2,
  },
  trafficLight: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
  },
  lastTaken: {
    marginTop: 4,
  },
  logButton: {
    marginTop: 14,
  },
});
