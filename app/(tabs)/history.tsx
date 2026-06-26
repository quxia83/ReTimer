import { useCallback, useMemo, useState } from "react";
import {
  SectionList,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  View,
  Dimensions,
} from "react-native";
import { useFocusEffect, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { format, isToday, isYesterday, subDays, startOfDay } from "date-fns";
import { ThemedView, ThemedText } from "@/components/Themed";
import { EntryLogItem } from "@/components/EntryLogItem";
import {
  getEntryHistory,
  getEntryHistoryByCategory,
  deleteEntryLog,
} from "@/db/queries/entries";
import { getAllTrackers } from "@/db/queries/trackers";
import { colors } from "@/lib/constants";

const BUILT_IN_CATS: Record<string, string> = {
  health: "categories.health",
  vehicle: "categories.vehicle",
  home: "categories.home",
  personal: "categories.personal",
  other: "categories.other",
};

interface EntryLogRow {
  id: number;
  trackerId: number;
  trackerName: string;
  trackerCategory: string | null;
  loggedAt: string;
}

interface TrackerOption {
  id: number;
  name: string;
  category: string | null;
}

interface SectionData {
  title: string;
  data: EntryLogRow[];
}

type FilterMode = "all" | "category" | "tracker";

function sectionTitle(isoString: string, t: (key: string) => string): string {
  const date = new Date(isoString);
  if (isToday(date)) return t("history.today");
  if (isYesterday(date)) return t("history.yesterday");
  return format(date, "MMMM d, yyyy");
}

function groupByDate(
  logs: EntryLogRow[],
  t: (key: string) => string
): SectionData[] {
  const map = new Map<string, EntryLogRow[]>();
  const titles: string[] = [];

  for (const log of logs) {
    const title = sectionTitle(log.loggedAt, t);
    if (!map.has(title)) {
      map.set(title, []);
      titles.push(title);
    }
    map.get(title)!.push(log);
  }

  return titles.map((title) => ({
    title,
    data: map.get(title)!,
  }));
}

const PAGE_SIZE = 100;
const TIMELINE_DAYS = 30;
const SCREEN_WIDTH = Dimensions.get("window").width;

function BarTimeline({
  logs,
  isDark,
  t,
}: {
  logs: EntryLogRow[];
  isDark: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const today = startOfDay(new Date());
  const dayWidth = (SCREEN_WIDTH - 48) / TIMELINE_DAYS;

  const dayCounts = new Map<string, number>();
  for (const log of logs) {
    const key = format(new Date(log.loggedAt), "yyyy-MM-dd");
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  const maxCount = Math.max(1, ...Array.from(dayCounts.values()));

  const days: { key: string; count: number }[] = [];
  for (let i = TIMELINE_DAYS - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const key = format(d, "yyyy-MM-dd");
    days.push({ key, count: dayCounts.get(key) ?? 0 });
  }

  const trackColor = isDark
    ? "rgba(255,255,255,0.07)"
    : "rgba(0,0,0,0.06)";

  return (
    <View
      style={[
        timelineStyles.container,
        { backgroundColor: isDark ? colors.surfaceDark : colors.surface },
      ]}
    >
      <ThemedText style={timelineStyles.title}>
        {t("history.frequency")}
      </ThemedText>
      <View style={timelineStyles.grid}>
        {days.map((day) => {
          const barHeight =
            day.count > 0 ? Math.max(8, (day.count / maxCount) * 60) : 0;
          const barOpacity =
            day.count > 0 ? 0.4 + 0.6 * (day.count / maxCount) : 1;
          return (
            <View
              key={day.key}
              style={[timelineStyles.dayColumn, { width: dayWidth }]}
            >
              <View style={timelineStyles.barArea}>
                <View
                  style={[timelineStyles.track, { backgroundColor: trackColor }]}
                />
                {day.count > 0 && (
                  <View
                    style={[
                      timelineStyles.bar,
                      {
                        height: barHeight,
                        backgroundColor: colors.accent,
                        opacity: barOpacity,
                      },
                    ]}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
      <View style={[timelineStyles.labelRow, { width: SCREEN_WIDTH - 48 }]}>
        <ThemedText variant="secondary" style={timelineStyles.dateLabel}>
          {format(subDays(today, TIMELINE_DAYS - 1), "MMM d")}
        </ThemedText>
        <ThemedText variant="secondary" style={timelineStyles.dateLabel}>
          {format(today, "MMM d")}
        </ThemedText>
      </View>
      <ThemedText variant="secondary" style={timelineStyles.summary}>
        {t("history.entries", { count: logs.length })}
      </ThemedText>
    </View>
  );
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const [logs, setLogs] = useState<EntryLogRow[]>([]);
  const [trackers, setTrackers] = useState<TrackerOption[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTrackerId, setSelectedTrackerId] = useState<
    number | null
  >(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadData = useCallback(async () => {
    let entryRows;
    if (filterMode === "category" && selectedCategory) {
      entryRows = await getEntryHistoryByCategory(selectedCategory, PAGE_SIZE, 0);
    } else if (filterMode === "tracker" && selectedTrackerId) {
      entryRows = await getEntryHistory(selectedTrackerId, PAGE_SIZE, 0);
    } else {
      entryRows = await getEntryHistory(undefined, PAGE_SIZE, 0);
    }
    const trackerRows = await getAllTrackers(true);
    const mapped = entryRows.map((r) => ({
      id: r.id,
      trackerId: r.trackerId,
      trackerName: r.trackerName,
      trackerCategory: r.trackerCategory ?? null,
      loggedAt: r.loggedAt,
    }));
    setLogs(mapped);
    setHasMore(mapped.length >= PAGE_SIZE);
    setTrackers(
      trackerRows.map((t) => ({ id: t.id, name: t.name, category: t.category ?? null }))
    );
  }, [filterMode, selectedCategory, selectedTrackerId]);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    let entryRows;
    if (filterMode === "category" && selectedCategory) {
      entryRows = await getEntryHistoryByCategory(selectedCategory, PAGE_SIZE, logs.length);
    } else if (filterMode === "tracker" && selectedTrackerId) {
      entryRows = await getEntryHistory(selectedTrackerId, PAGE_SIZE, logs.length);
    } else {
      entryRows = await getEntryHistory(undefined, PAGE_SIZE, logs.length);
    }
    const mapped = entryRows.map((r) => ({
      id: r.id,
      trackerId: r.trackerId,
      trackerName: r.trackerName,
      trackerCategory: r.trackerCategory ?? null,
      loggedAt: r.loggedAt,
    }));
    setLogs((prev) => [...prev, ...mapped]);
    setHasMore(mapped.length >= PAGE_SIZE);
  }, [hasMore, filterMode, selectedCategory, selectedTrackerId, logs.length]);

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

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteEntryLog(id);
      await loadData();
    },
    [loadData]
  );

  // Derive unique categories from trackers
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const tracker of trackers) {
      if (tracker.category) cats.add(tracker.category);
    }
    return Array.from(cats);
  }, [trackers]);

  const sections = useMemo(() => groupByDate(logs, t), [logs, t]);

  // Show timeline when filtering by a specific tracker or category
  const showTimeline = filterMode !== "all" && logs.length > 0;

  const chipColors = useCallback(
    (isSelected: boolean) => ({
      backgroundColor: isSelected
        ? colors.accent
        : isDark
          ? colors.surfaceDark
          : colors.surface,
      borderColor: isSelected
        ? colors.accent
        : isDark
          ? colors.borderDark
          : colors.border,
    }),
    [isDark]
  );

  const selectCategory = useCallback((cat: string) => {
    setFilterMode("category");
    setSelectedCategory(cat);
    setSelectedTrackerId(null);
  }, []);

  const selectTracker = useCallback((trackerId: number) => {
    setFilterMode("tracker");
    setSelectedTrackerId(trackerId);
    setSelectedCategory(null);
  }, []);

  const selectAll = useCallback(() => {
    setFilterMode("all");
    setSelectedCategory(null);
    setSelectedTrackerId(null);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: t("history.title"), headerLargeTitle: true }} />

      {/* Category filter row */}
      {categories.length > 1 && (
        <View
          style={[
            styles.filterBar,
            {
              borderBottomColor: isDark ? colors.borderDark : colors.border,
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            <Pressable
              onPress={selectAll}
              style={[styles.chip, chipColors(filterMode === "all")]}
              accessibilityLabel={t("history.all")}
              accessibilityRole="button"
              accessibilityState={{ selected: filterMode === "all" }}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  filterMode === "all" && styles.chipTextSelected,
                ]}
              >
                {t("history.all")}
              </ThemedText>
            </Pressable>

            {categories.map((cat) => {
              const isSelected =
                filterMode === "category" && selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() =>
                    isSelected ? selectAll() : selectCategory(cat)
                  }
                  style={[styles.chip, chipColors(isSelected)]}
                  accessibilityLabel={BUILT_IN_CATS[cat] ? t(BUILT_IN_CATS[cat]) : cat}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {BUILT_IN_CATS[cat] ? t(BUILT_IN_CATS[cat]) : cat}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Tracker filter row */}
      <View
        style={[
          styles.filterBar,
          {
            borderBottomColor: isDark ? colors.borderDark : colors.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {trackers.map((tracker) => {
            const isSelected =
              filterMode === "tracker" && selectedTrackerId === tracker.id;
            return (
              <Pressable
                key={tracker.id}
                onPress={() =>
                  isSelected ? selectAll() : selectTracker(tracker.id)
                }
                style={[styles.chip, chipColors(isSelected)]}
                accessibilityLabel={tracker.name}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {tracker.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Entry history list */}
      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>
            {t("history.empty")}
          </ThemedText>
          <ThemedText variant="secondary" style={styles.emptyHint}>
            {t("history.emptyHint")}
          </ThemedText>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            showTimeline ? (
              <BarTimeline logs={logs} isDark={isDark} t={t} />
            ) : null
          }
          renderItem={({ item }) => (
            <EntryLogItem
              id={item.id}
              trackerName={item.trackerName}
              loggedAt={item.loggedAt}
              onDelete={handleDelete}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View
              style={[
                styles.sectionHeader,
                {
                  backgroundColor: isDark
                    ? colors.backgroundDark
                    : colors.background,
                },
              ]}
            >
              <ThemedText style={styles.sectionHeaderText}>{title}</ThemedText>
            </View>
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
        />
      )}
    </ThemedView>
  );
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
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 12,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyHint: {
    marginTop: 8,
    textAlign: "center",
  },
});

const timelineStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 60,
  },
  dayColumn: {
    alignItems: "center",
  },
  barArea: {
    height: 60,
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    position: "relative",
  },
  track: {
    position: "absolute",
    bottom: 0,
    width: "60%",
    height: 3,
    borderRadius: 3,
  },
  bar: {
    width: "60%",
    borderRadius: 4,
    minWidth: 3,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  dateLabel: {
    fontSize: 11,
  },
  summary: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
});
