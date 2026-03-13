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
  // For entries older than 7 days, omit the time
  const daysDiff = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (daysDiff >= 7) {
    return format(date, "MMM d, yyyy");
  }
  return format(date, "MMM d h:mm a");
}

function getTrafficColor(status: CooldownStatus): string {
  switch (status) {
    case "red":
      return colors.red;
    case "yellow":
      return colors.yellow;
    case "overdue":
      return colors.red;
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
    case "overdue":
      return isDark ? colors.redBgDark : colors.redBg;
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
  const { status, remainingSeconds, overdueSeconds } = useCooldownStatus(
    lastEntryAt,
    tracker.cooldownMin,
    tracker.cooldownMax
  );

  const trafficColor = getTrafficColor(status);
  const bgColor = getBgColor(status, isDark);

  // Use "Due in" instead of "Wait" for long intervals (> 1 day remaining)
  const usesDueIn = remainingSeconds > 86400;

  let statusText: string;
  if (status === "overdue") {
    statusText = t("status.overdue", { time: formatCountdown(overdueSeconds) });
  } else if (status === "green") {
    statusText = t("status.safe");
  } else if (status === "red") {
    statusText = usesDueIn
      ? t("status.dueIn", { time: formatCountdown(remainingSeconds) })
      : t("status.wait", { time: formatCountdown(remainingSeconds) });
  } else {
    statusText = t("status.approachingTime", {
      time: formatCountdown(remainingSeconds),
    });
  }

  const lastTakenText = lastEntryAt
    ? t("entry.lastLogged", { time: formatLastTaken(lastEntryAt, t) })
    : t("entry.neverLogged");

  const trafficAccessibilityLabel = `${tracker.name}: ${statusText}`;

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
        variant={status === "green" || status === "overdue" ? "primary" : "secondary"}
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
