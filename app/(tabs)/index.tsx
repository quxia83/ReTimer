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
import { SymbolView } from "expo-symbols";
import { ThemedView, ThemedText } from "@/components/Themed";
import { TrackerCard } from "@/components/TrackerCard";
import { EmptyState } from "@/components/EmptyState";
import { getAllTrackers, getArchivedTrackers } from "@/db/queries/trackers";
import { getLastEntry, logEntry } from "@/db/queries/entries";
import { scheduleCooldownNotification } from "@/lib/notifications";
import { colors } from "@/lib/constants";
import { formatCountdown, formatDuration } from "@/lib/duration";

interface TrackerRow {
  id: number;
  name: string;
  cooldownMin: number;
  cooldownMax: number;
  notes: string | null;
  notifyEnabled: number;
  category: string | null;
}

interface DashboardItem {
  tracker: TrackerRow;
  lastEntryAt: string | null;
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
  const [archivedItems, setArchivedItems] = useState<DashboardItem[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const trackers = await getAllTrackers();
    const results: DashboardItem[] = await Promise.all(
      trackers.map(async (tracker) => {
        const lastEntry = await getLastEntry(tracker.id);
        return {
          tracker: {
            id: tracker.id,
            name: tracker.name,
            cooldownMin: tracker.cooldownMin,
            cooldownMax: tracker.cooldownMax,
            notes: tracker.notes ?? null,
            notifyEnabled: tracker.notifyEnabled ?? 1,
            category: tracker.category ?? null,
          },
          lastEntryAt: lastEntry?.loggedAt ?? null,
        };
      })
    );
    setItems(results);

    const archived = await getArchivedTrackers();
    const archivedResults: DashboardItem[] = await Promise.all(
      archived.map(async (tracker) => {
        const lastEntry = await getLastEntry(tracker.id);
        return {
          tracker: {
            id: tracker.id,
            name: tracker.name,
            cooldownMin: tracker.cooldownMin,
            cooldownMax: tracker.cooldownMax,
            notes: tracker.notes ?? null,
            notifyEnabled: tracker.notifyEnabled ?? 1,
            category: tracker.category ?? null,
          },
          lastEntryAt: lastEntry?.loggedAt ?? null,
        };
      })
    );
    setArchivedItems(archivedResults);
  }, []);

  // Derive unique categories from data
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const item of items) {
      if (item.tracker.category) cats.add(item.tracker.category);
    }
    return Array.from(cats);
  }, [items]);

  const filteredItems = useMemo(() => {
    const base = selectedCategory
      ? items.filter((i) => i.tracker.category === selectedCategory)
      : items;

    // Sort by urgency: overdue > red > yellow > green
    return [...base].sort((a, b) => {
      const priorityA = getItemPriority(a);
      const priorityB = getItemPriority(b);
      return priorityA - priorityB;
    });
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

  const handleLogEntry = useCallback(
    async (trackerId: number) => {
      const item = items.find((i) => i.tracker.id === trackerId);
      if (!item) return;

      const doLog = async () => {
        await logEntry(trackerId);
        if (item.tracker.notifyEnabled) {
          await scheduleCooldownNotification(
            item.tracker.name,
            item.tracker.cooldownMax,
            trackerId
          );
        }
        await loadData();
      };

      // Determine current status to decide whether to confirm
      const status = getCooldownStatus(
        item.lastEntryAt,
        item.tracker.cooldownMin,
        item.tracker.cooldownMax
      );

      if (status === "green") {
        await doLog();
      } else {
        const elapsed = item.lastEntryAt
          ? formatCountdown(
              Math.floor(
                (Date.now() - new Date(item.lastEntryAt).getTime()) / 1000
              )
            )
          : "";
        const minStr = formatDuration(item.tracker.cooldownMin);
        const maxStr = formatDuration(item.tracker.cooldownMax);

        Alert.alert(
          t("entry.logConfirmTitle"),
          t("entry.logConfirmMessage", {
            elapsed,
            min: minStr,
            max: maxStr,
          }),
          [
            { text: t("entry.cancel"), style: "cancel" },
            {
              text: t("entry.logConfirmOk"),
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
    (trackerId: number) => {
      router.push(`/(tabs)/tracker/${trackerId}`);
    },
    [router]
  );

  const navigateToAdd = useCallback(() => {
    router.push("/(tabs)/tracker/add");
  }, [router]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: t("dashboard.title"),
          headerLargeTitle: true,
          headerRight: () => (
            <Pressable
              onPress={navigateToAdd}
              hitSlop={8}
              accessibilityLabel={t("dashboard.addTracker")}
              accessibilityRole="button"
            >
              <SymbolView
                name="plus.circle"
                size={26}
                tintColor={colors.accent}
                style={styles.headerButton}
              />
            </Pressable>
          ),
        }}
      />
      {items.length === 0 && !showArchived ? (
        <EmptyState onAddFirst={navigateToAdd} />
      ) : (
        <>
          {showArchived && (
            <View
              style={[
                styles.filterBar,
                { borderBottomColor: isDark ? colors.borderDark : colors.border },
              ]}
            >
              <Pressable
                onPress={() => setShowArchived(false)}
                style={styles.backToActive}
                accessibilityRole="button"
              >
                <SymbolView name="chevron.left" size={14} tintColor={colors.accent} />
                <ThemedText style={styles.backToActiveText}>
                  {t("dashboard.title")}
                </ThemedText>
              </Pressable>
            </View>
          )}
          {!showArchived && categories.length > 1 && (
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
                    accessibilityLabel={CATEGORY_I18N[cat] ? t(CATEGORY_I18N[cat]) : cat}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedCategory === cat }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        selectedCategory === cat && styles.chipTextSelected,
                      ]}
                    >
                      {CATEGORY_I18N[cat] ? t(CATEGORY_I18N[cat]) : cat}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          <FlatList
            data={showArchived ? archivedItems : filteredItems}
            keyExtractor={(item) => String(item.tracker.id)}
            renderItem={({ item }) => (
              <TrackerCard
                tracker={item.tracker}
                lastEntryAt={item.lastEntryAt}
                onLogEntry={handleLogEntry}
                onPress={handleCardPress}
              />
            )}
            ListHeaderComponent={
              showArchived ? (
                <View style={styles.archivedHeader}>
                  <ThemedText style={styles.archivedTitle}>
                    {t("tracker.archived")}
                  </ThemedText>
                  <ThemedText variant="secondary" style={styles.archivedHint}>
                    {t("tracker.archivedHint")}
                  </ThemedText>
                </View>
              ) : null
            }
            ListEmptyComponent={
              showArchived ? (
                <View style={styles.emptyArchived}>
                  <ThemedText variant="secondary">
                    {t("tracker.archivedEmpty")}
                  </ThemedText>
                </View>
              ) : null
            }
            ListFooterComponent={
              !showArchived && archivedItems.length > 0 ? (
                <Pressable
                  onPress={() => setShowArchived(true)}
                  style={styles.showArchivedButton}
                  accessibilityRole="button"
                  accessibilityLabel={t("tracker.archived")}
                >
                  <SymbolView
                    name="archivebox"
                    size={14}
                    tintColor={colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <ThemedText variant="secondary" style={styles.showArchivedText}>
                    {t("tracker.archived")} ({archivedItems.length})
                  </ThemedText>
                </Pressable>
              ) : null
            }
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

/** Inline cooldown check for the log-entry confirmation flow */
function getCooldownStatus(
  lastEntryAt: string | null,
  cooldownMin: number,
  cooldownMax: number
): "green" | "yellow" | "red" {
  if (!lastEntryAt) return "green";
  const elapsed = (Date.now() - new Date(lastEntryAt).getTime()) / 1000;
  if (elapsed >= cooldownMax * 60) return "green";
  if (elapsed >= cooldownMin * 60) return "yellow";
  return "red";
}

/** Priority for dashboard sorting (lower = more urgent, shown first) */
function getItemPriority(item: DashboardItem): number {
  if (!item.lastEntryAt) return 3; // never logged = green
  const elapsed = (Date.now() - new Date(item.lastEntryAt).getTime()) / 1000;
  const minSec = item.tracker.cooldownMin * 60;
  const maxSec = item.tracker.cooldownMax * 60;
  const overdueThreshold = maxSec + (maxSec - minSec) * 0.5;
  if (elapsed >= overdueThreshold && maxSec > 0) return 0; // overdue
  if (elapsed < minSec) return 1; // red (too soon)
  if (elapsed < maxSec) return 2; // yellow (approaching)
  return 3; // green (ready)
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
  backToActive: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  backToActiveText: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: "500",
  },
  archivedHeader: {
    marginBottom: 12,
  },
  archivedTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  archivedHint: {
    marginTop: 4,
    fontSize: 14,
  },
  emptyArchived: {
    alignItems: "center",
    paddingVertical: 24,
  },
  showArchivedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  showArchivedText: {
    fontSize: 14,
  },
});
