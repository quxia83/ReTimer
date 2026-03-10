import { useCallback, useMemo, useState } from "react";
import {
  SectionList,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  View,
} from "react-native";
import { useFocusEffect, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { format, isToday, isYesterday } from "date-fns";
import { ThemedView, ThemedText } from "@/components/Themed";
import { DoseLogItem } from "@/components/DoseLogItem";
import { getDoseHistory, deleteDoseLog } from "@/db/queries/doseLogs";
import { getAllMedications } from "@/db/queries/medications";
import { colors } from "@/lib/constants";

interface DoseLogRow {
  id: number;
  medicationId: number;
  medicationName: string;
  takenAt: string;
}

interface MedicationOption {
  id: number;
  name: string;
}

interface SectionData {
  title: string;
  data: DoseLogRow[];
}

function sectionTitle(isoString: string, t: (key: string) => string): string {
  const date = new Date(isoString);
  if (isToday(date)) return t("history.today");
  if (isYesterday(date)) return t("history.yesterday");
  return format(date, "MMMM d, yyyy");
}

function groupByDate(
  logs: DoseLogRow[],
  t: (key: string) => string
): SectionData[] {
  const map = new Map<string, DoseLogRow[]>();
  const titles: string[] = [];

  for (const log of logs) {
    const title = sectionTitle(log.takenAt, t);
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

export default function HistoryScreen() {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const [logs, setLogs] = useState<DoseLogRow[]>([]);
  const [medications, setMedications] = useState<MedicationOption[]>([]);
  const [selectedMedicationId, setSelectedMedicationId] = useState<
    number | null
  >(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [doseRows, medRows] = await Promise.all([
      getDoseHistory(selectedMedicationId ?? undefined),
      getAllMedications(),
    ]);
    setLogs(
      doseRows.map((r) => ({
        id: r.id,
        medicationId: r.medicationId,
        medicationName: r.medicationName,
        takenAt: r.takenAt,
      }))
    );
    setMedications(medRows.map((m) => ({ id: m.id, name: m.name })));
  }, [selectedMedicationId]);

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
      await deleteDoseLog(id);
      await loadData();
    },
    [loadData]
  );

  const sections = useMemo(() => groupByDate(logs, t), [logs, t]);

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

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: t("history.title") }} />

      {/* Filter chips */}
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
            onPress={() => setSelectedMedicationId(null)}
            style={[
              styles.chip,
              chipColors(selectedMedicationId === null),
            ]}
            accessibilityLabel={t("history.all")}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedMedicationId === null }}
          >
            <ThemedText
              style={[
                styles.chipText,
                selectedMedicationId === null && styles.chipTextSelected,
              ]}
            >
              {t("history.all")}
            </ThemedText>
          </Pressable>

          {medications.map((med) => (
            <Pressable
              key={med.id}
              onPress={() =>
                setSelectedMedicationId(
                  selectedMedicationId === med.id ? null : med.id
                )
              }
              style={[
                styles.chip,
                chipColors(selectedMedicationId === med.id),
              ]}
              accessibilityLabel={med.name}
              accessibilityRole="button"
              accessibilityState={{
                selected: selectedMedicationId === med.id,
              }}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  selectedMedicationId === med.id && styles.chipTextSelected,
                ]}
              >
                {med.name}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Dose history list */}
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
          renderItem={({ item }) => (
            <DoseLogItem
              id={item.id}
              medicationName={item.medicationName}
              takenAt={item.takenAt}
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
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
