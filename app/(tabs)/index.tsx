import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  View,
  useColorScheme,
} from "react-native";
import { useRouter, useFocusEffect, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemedView, ThemedText } from "@/components/Themed";
import { MedicationCard } from "@/components/MedicationCard";
import { EmptyState } from "@/components/EmptyState";
import { getAllMedications } from "@/db/queries/medications";
import { getLastDose, logDose } from "@/db/queries/doseLogs";
import { scheduleCooldownNotification } from "@/lib/notifications";
import { colors } from "@/lib/constants";
import { formatCountdown, formatDuration } from "@/lib/duration";

interface MedicationRow {
  id: number;
  name: string;
  cooldownMin: number;
  cooldownMax: number;
  notes: string | null;
  notifyEnabled: number;
  category: string | null;
}

interface DashboardItem {
  medication: MedicationRow;
  lastDoseAt: string | null;
}

const CATEGORY_I18N: Record<string, string> = {
  health: "categories.health",
  vehicle: "categories.vehicle",
  home: "categories.home",
  personal: "categories.personal",
  other: "categories.other",
};

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
            category: med.category ?? null,
          },
          lastDoseAt: lastDose?.takenAt ?? null,
        };
      })
    );
    setItems(results);
  }, []);

  // Derive unique categories from data
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const item of items) {
      if (item.medication.category) cats.add(item.medication.category);
    }
    return Array.from(cats);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return items;
    return items.filter((i) => i.medication.category === selectedCategory);
  }, [items, selectedCategory]);

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
          ? formatCountdown(
              Math.floor(
                (Date.now() - new Date(item.lastDoseAt).getTime()) / 1000
              )
            )
          : "";
        const minStr = formatDuration(item.medication.cooldownMin);
        const maxStr = formatDuration(item.medication.cooldownMax);

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
        <>
          {categories.length > 1 && (
            <View
              style={[
                styles.filterBar,
                { borderBottomColor: isDark ? colors.borderDark : colors.border },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContent}
              >
                <Pressable
                  onPress={() => setSelectedCategory(null)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedCategory === null
                        ? colors.accent
                        : isDark ? colors.surfaceDark : colors.surface,
                      borderColor: selectedCategory === null
                        ? colors.accent
                        : isDark ? colors.borderDark : colors.border,
                    },
                  ]}
                  accessibilityLabel={t("history.all")}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCategory === null }}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      selectedCategory === null && styles.chipTextSelected,
                    ]}
                  >
                    {t("history.all")}
                  </ThemedText>
                </Pressable>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() =>
                      setSelectedCategory(selectedCategory === cat ? null : cat)
                    }
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedCategory === cat
                          ? colors.accent
                          : isDark ? colors.surfaceDark : colors.surface,
                        borderColor: selectedCategory === cat
                          ? colors.accent
                          : isDark ? colors.borderDark : colors.border,
                      },
                    ]}
                    accessibilityLabel={t(CATEGORY_I18N[cat] ?? cat)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedCategory === cat }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        selectedCategory === cat && styles.chipTextSelected,
                      ]}
                    >
                      {t(CATEGORY_I18N[cat] ?? cat)}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          <FlatList
            data={filteredItems}
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
        </>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  headerButton: {
    marginRight: 8,
  },
});
