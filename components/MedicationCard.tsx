import { View, StyleSheet, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";
import { format, isToday, isYesterday } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ThemedText } from "@/components/Themed";
import { useCooldownStatus, CooldownStatus } from "@/hooks/useCooldownStatus";
import { colors } from "@/lib/constants";

interface MedicationCardProps {
  medication: {
    id: number;
    name: string;
    cooldownMin: number;
    cooldownMax: number;
    notes: string | null;
    notifyEnabled: number;
  };
  lastDoseAt: string | null;
  onLogDose: (medicationId: number) => void;
  onPress: (medicationId: number) => void;
}

function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatLastTaken(dateStr: string): string {
  const date = new Date(dateStr);
  const timeStr = format(date, "h:mm a");
  if (isToday(date)) {
    return `Today ${timeStr}`;
  }
  if (isYesterday(date)) {
    return `Yesterday ${timeStr}`;
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

export function MedicationCard({
  medication,
  lastDoseAt,
  onLogDose,
  onPress,
}: MedicationCardProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const { status, remainingSeconds } = useCooldownStatus(
    lastDoseAt,
    medication.cooldownMin,
    medication.cooldownMax
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

  const lastTakenText = lastDoseAt
    ? t("dose.lastTaken", { time: formatLastTaken(lastDoseAt) })
    : t("dose.neverTaken");

  // Descriptive label for VoiceOver: e.g. "Ibuprofen: red, wait 2h 15m"
  const trafficAccessibilityLabel =
    status === "green"
      ? `${medication.name}: ${t("status.safe")}`
      : status === "red"
        ? `${medication.name}: ${t("status.wait", { time: formatCountdown(remainingSeconds) })}`
        : `${medication.name}: ${t("status.approachingTime", { time: formatCountdown(remainingSeconds) })}`;

  return (
    <Card
      onPress={() => onPress(medication.id)}
      style={[styles.card, { backgroundColor: bgColor }]}
      accessibilityLabel={`${medication.name}, ${statusText}`}
      accessibilityHint={t("dose.tapToViewDetails")}
    >
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <ThemedText
            style={styles.name}
            accessibilityRole="header"
          >
            {medication.name}
          </ThemedText>
          {medication.notes ? (
            <ThemedText variant="secondary" style={styles.notes}>
              {medication.notes}
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
        title={t("dose.logDose")}
        variant={status === "green" ? "primary" : "secondary"}
        onPress={() => onLogDose(medication.id)}
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
