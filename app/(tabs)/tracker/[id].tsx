import { useState, useCallback, useEffect } from "react";
import {
  ScrollView,
  TextInput,
  Switch,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  Modal,
  useColorScheme,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemedView, ThemedText } from "@/components/Themed";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DurationInput } from "@/components/DurationInput";
import { CategoryPicker } from "@/components/CategoryPicker";
import {
  getTracker,
  updateTracker,
  deleteTracker,
} from "@/db/queries/trackers";
import { getEntryHistory, logEntry } from "@/db/queries/entries";
import { colors } from "@/lib/constants";
import { formatCooldownRange } from "@/lib/duration";

interface TrackerData {
  id: number;
  name: string;
  cooldownMin: number;
  cooldownMax: number;
  notes: string | null;
  category: string | null;
  notifyEnabled: number | null;
}

interface EntryRow {
  id: number;
  trackerId: number;
  trackerName: string;
  loggedAt: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TrackerDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === "dark";

  const [tracker, setTracker] = useState<TrackerData | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [showBackfill, setShowBackfill] = useState(false);
  const [backfillDate, setBackfillDate] = useState(new Date());

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editCooldownMin, setEditCooldownMin] = useState(0);
  const [editCooldownMax, setEditCooldownMax] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [editNotifications, setEditNotifications] = useState(true);
  const [editKey, setEditKey] = useState(0);

  const trackerId = parseInt(id ?? "0", 10);

  const loadData = useCallback(async () => {
    if (!trackerId) return;
    const trackerRow = await getTracker(trackerId);
    if (trackerRow) {
      setTracker(trackerRow as TrackerData);
    }
    const history = await getEntryHistory(trackerId);
    setEntries((history as EntryRow[]).slice(0, 20));
  }, [trackerId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const startEditing = useCallback(() => {
    if (!tracker) return;
    setEditName(tracker.name);
    setEditNotes(tracker.notes ?? "");
    setEditCooldownMin(tracker.cooldownMin);
    setEditCooldownMax(tracker.cooldownMax);
    setEditCategory(tracker.category ?? "other");
    setEditNotifications((tracker.notifyEnabled ?? 1) === 1);
    setEditKey((k) => k + 1);
    setEditing(true);
  }, [tracker]);

  const handleSave = useCallback(async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert("", t("tracker.nameRequired"));
      return;
    }

    if (editCooldownMin > editCooldownMax && editCooldownMax > 0) {
      Alert.alert("", t("tracker.minExceedsMax"));
      return;
    }

    await updateTracker(trackerId, {
      name: trimmedName,
      cooldownMin: editCooldownMin,
      cooldownMax: editCooldownMax > 0 ? editCooldownMax : editCooldownMin,
      notes: editNotes.trim(),
      category: editCategory,
      notifyEnabled: editNotifications ? 1 : 0,
    });

    setEditing(false);
    await loadData();
  }, [editName, editCooldownMin, editCooldownMax, editNotes, editCategory, editNotifications, trackerId, loadData, t]);

  const handleDelete = useCallback(() => {
    Alert.alert(t("tracker.delete"), t("tracker.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteTracker(trackerId);
          router.back();
        },
      },
    ]);
  }, [trackerId, router, t]);

  const handleBackfillConfirm = useCallback(async () => {
    await logEntry(trackerId, backfillDate);
    setShowBackfill(false);
    await loadData();
  }, [trackerId, backfillDate, loadData]);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isDark ? colors.surfaceDark : colors.surface,
      color: isDark ? colors.textDark : colors.text,
      borderColor: isDark ? colors.borderDark : colors.border,
    },
  ];

  if (!tracker) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: "" }} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: tracker.name,
          headerBackTitle: "",
          headerRight: () =>
            !editing ? (
              <View style={styles.headerRight}>
                <Pressable
                  onPress={startEditing}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.edit")}
                >
                  <FontAwesome
                    name="pencil"
                    size={20}
                    color={colors.accent}
                    style={styles.headerIcon}
                  />
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.delete")}
                >
                  <FontAwesome
                    name="trash"
                    size={20}
                    color={colors.destructive}
                    style={styles.headerIcon}
                  />
                </Pressable>
              </View>
            ) : null,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {editing ? (
            /* ---- Edit Form ---- */
            <>
              <ThemedText style={styles.label}>{t("tracker.name")}</ThemedText>
              <TextInput
                style={inputStyle}
                value={editName}
                onChangeText={setEditName}
                placeholder={t("tracker.namePlaceholder")}
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel={t("tracker.name")}
                autoCapitalize="words"
              />

              <ThemedText style={styles.label}>{t("tracker.category")}</ThemedText>
              <CategoryPicker
                value={editCategory}
                onChange={setEditCategory}
                accessibilityLabelPrefix={t("tracker.category")}
              />

              <ThemedText style={styles.label}>{t("tracker.cooldownMin")}</ThemedText>
              <DurationInput
                key={`min-${editKey}`}
                value={editCooldownMin}
                onChange={setEditCooldownMin}
                accessibilityLabelPrefix={t("tracker.cooldownMin")}
              />

              <ThemedText style={styles.label}>{t("tracker.cooldownMax")}</ThemedText>
              <DurationInput
                key={`max-${editKey}`}
                value={editCooldownMax}
                onChange={setEditCooldownMax}
                accessibilityLabelPrefix={t("tracker.cooldownMax")}
              />

              <ThemedText style={styles.label}>{t("tracker.notes")}</ThemedText>
              <TextInput
                style={[...inputStyle, styles.multiline]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder={t("tracker.notesPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                accessibilityLabel={t("tracker.notes")}
              />

              <View style={styles.switchRow}>
                <ThemedText style={styles.label}>
                  {t("tracker.notifications")}
                </ThemedText>
                <Switch
                  value={editNotifications}
                  onValueChange={setEditNotifications}
                  trackColor={{ true: colors.accent }}
                  accessibilityLabel={t("tracker.notifications")}
                  accessibilityRole="switch"
                />
              </View>

              <View style={styles.editButtons}>
                <Button
                  title={t("common.cancel")}
                  onPress={() => setEditing(false)}
                  variant="secondary"
                  style={styles.editButton}
                />
                <Button
                  title={t("tracker.save")}
                  onPress={handleSave}
                  style={styles.editButton}
                />
              </View>
            </>
          ) : (
            /* ---- Detail View ---- */
            <>
              <Card style={styles.infoCard}>
                <ThemedText style={styles.infoLabel}>{t("tracker.name")}</ThemedText>
                <ThemedText style={styles.infoValue}>{tracker.name}</ThemedText>

                <ThemedText style={[styles.infoLabel, styles.infoLabelSpaced]}>
                  {t("tracker.category")}
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {["health", "vehicle", "home", "personal", "other"].includes(tracker.category ?? "other")
                    ? t(`categories.${tracker.category ?? "other"}`)
                    : tracker.category}
                </ThemedText>

                <ThemedText style={[styles.infoLabel, styles.infoLabelSpaced]}>
                  {t("tracker.cooldownMin")} / {t("tracker.cooldownMax")}
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {formatCooldownRange(tracker.cooldownMin, tracker.cooldownMax)}
                </ThemedText>

                {tracker.notes ? (
                  <>
                    <ThemedText style={[styles.infoLabel, styles.infoLabelSpaced]}>
                      {t("tracker.notes")}
                    </ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {tracker.notes}
                    </ThemedText>
                  </>
                ) : null}

                <ThemedText style={[styles.infoLabel, styles.infoLabelSpaced]}>
                  {t("tracker.notifications")}
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {(tracker.notifyEnabled ?? 1) === 1
                    ? t("common.yes")
                    : t("common.no")}
                </ThemedText>
              </Card>

              {/* Entry History */}
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={styles.sectionTitle}>
                  {t("history.title")}
                </ThemedText>
                <Pressable
                  onPress={() => {
                    setBackfillDate(new Date());
                    setShowBackfill(true);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("entry.backfill")}
                >
                  <ThemedText style={styles.backfillLink}>
                    {t("entry.backfill")}
                  </ThemedText>
                </Pressable>
              </View>
              {entries.length === 0 ? (
                <ThemedText variant="secondary" style={styles.emptyText}>
                  {t("history.empty")}
                </ThemedText>
              ) : (
                entries.map((entry) => (
                  <Card key={entry.id} style={styles.entryRow}>
                    <ThemedText style={styles.entryTime}>
                      {formatDateTime(entry.loggedAt)}
                    </ThemedText>
                  </Card>
                ))
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Backfill Modal */}
      <Modal
        visible={showBackfill}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBackfill(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDark ? colors.surfaceDark : "#ffffff",
              },
            ]}
          >
            <ThemedText style={styles.modalTitle}>
              {t("entry.backfill")}
            </ThemedText>
            <DateTimePicker
              value={backfillDate}
              mode="datetime"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_event, date) => {
                if (date) setBackfillDate(date);
              }}
              themeVariant={isDark ? "dark" : "light"}
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowBackfill(false)}
                style={styles.modalButton}
                accessibilityRole="button"
              >
                <ThemedText style={styles.modalButtonText}>
                  {t("common.cancel")}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleBackfillConfirm}
                style={[styles.modalButton, styles.modalButtonPrimary]}
                accessibilityRole="button"
              >
                <ThemedText style={[styles.modalButtonText, { color: "#fff" }]}>
                  {t("common.save")}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 48,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerIcon: {
    marginHorizontal: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 17,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    minHeight: 44,
  },
  editButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  editButton: {
    flex: 1,
  },
  infoCard: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoLabelSpaced: {
    marginTop: 14,
  },
  infoValue: {
    fontSize: 17,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  backfillLink: {
    fontSize: 14,
    color: colors.accent,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 12,
  },
  entryRow: {
    marginBottom: 8,
    paddingVertical: 12,
  },
  entryTime: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
