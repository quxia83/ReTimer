import { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  useColorScheme,
} from "react-native";
import { useRouter, useFocusEffect, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemedView } from "@/components/Themed";
import { MedicationCard } from "@/components/MedicationCard";
import { EmptyState } from "@/components/EmptyState";
import { getAllMedications } from "@/db/queries/medications";
import { getLastDose, logDose } from "@/db/queries/doseLogs";
import { scheduleCooldownNotification } from "@/lib/notifications";
import { colors } from "@/lib/constants";

interface MedicationRow {
  id: number;
  name: string;
  cooldownMin: number;
  cooldownMax: number;
  notes: string | null;
  notifyEnabled: number;
}

interface DashboardItem {
  medication: MedicationRow;
  lastDoseAt: string | null;
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const meds = await getAllMedications();
    const results: DashboardItem[] = await Promise.all(
      meds.map(async (med) => {
        const lastDose = await getLastDose(med.id);
        return {
          medication: {
            id: med.id,
            name: med.name,
            cooldownMin: med.cooldownMin,
            cooldownMax: med.cooldownMax,
            notes: med.notes ?? null,
            notifyEnabled: med.notifyEnabled ?? 1,
          },
          lastDoseAt: lastDose?.takenAt ?? null,
        };
      })
    );
    setItems(results);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleLogDose = useCallback(
    async (medicationId: number) => {
      const item = items.find((i) => i.medication.id === medicationId);
      if (!item) return;

      const doLog = async () => {
        await logDose(medicationId);
        if (item.medication.notifyEnabled) {
          await scheduleCooldownNotification(
            item.medication.name,
            item.medication.cooldownMax,
            medicationId
          );
        }
        await loadData();
      };

      // Determine current status to decide whether to confirm
      const status = getCooldownStatus(
        item.lastDoseAt,
        item.medication.cooldownMin,
        item.medication.cooldownMax
      );

      if (status === "green") {
        await doLog();
      } else {
        const elapsed = item.lastDoseAt
          ? formatElapsed(
              Math.floor(
                (Date.now() - new Date(item.lastDoseAt).getTime()) / 1000
              )
            )
          : "";
        const minStr = formatMinutes(item.medication.cooldownMin);
        const maxStr = formatMinutes(item.medication.cooldownMax);

        Alert.alert(
          t("dose.logConfirmTitle"),
          t("dose.logConfirmMessage", {
            elapsed,
            min: minStr,
            max: maxStr,
          }),
          [
            { text: t("dose.cancel"), style: "cancel" },
            {
              text: t("dose.logConfirmOk"),
              style: "destructive",
              onPress: doLog,
            },
          ]
        );
      }
    },
    [items, loadData, t]
  );

  const handleCardPress = useCallback(
    (medicationId: number) => {
      router.push(`/(tabs)/medication/${medicationId}`);
    },
    [router]
  );

  const navigateToAdd = useCallback(() => {
    router.push("/(tabs)/medication/add");
  }, [router]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: t("dashboard.title"),
          headerRight: () => (
            <Pressable
              onPress={navigateToAdd}
              hitSlop={8}
              accessibilityLabel={t("dashboard.addMedication")}
              accessibilityRole="button"
            >
              <FontAwesome
                name="plus"
                size={22}
                color={colors.accent}
                style={styles.headerButton}
              />
            </Pressable>
          ),
        }}
      />
      {items.length === 0 ? (
        <EmptyState onAddFirst={navigateToAdd} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.medication.id)}
          renderItem={({ item }) => (
            <MedicationCard
              medication={item.medication}
              lastDoseAt={item.lastDoseAt}
              onLogDose={handleLogDose}
              onPress={handleCardPress}
            />
          )}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

/** Inline cooldown check for the log-dose confirmation flow */
function getCooldownStatus(
  lastDoseAt: string | null,
  cooldownMin: number,
  cooldownMax: number
): "green" | "yellow" | "red" {
  if (!lastDoseAt) return "green";
  const elapsed = (Date.now() - new Date(lastDoseAt).getTime()) / 1000;
  if (elapsed >= cooldownMax * 60) return "green";
  if (elapsed >= cooldownMin * 60) return "yellow";
  return "red";
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  headerButton: {
    marginRight: 8,
  },
});
