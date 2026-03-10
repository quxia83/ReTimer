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
  useColorScheme,
  View,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemedView, ThemedText } from "@/components/Themed";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getMedication,
  updateMedication,
  deleteMedication,
} from "@/db/queries/medications";
import { getDoseHistory } from "@/db/queries/doseLogs";
import { colors } from "@/lib/constants";

interface MedicationData {
  id: number;
  name: string;
  cooldownMin: number;
  cooldownMax: number;
  notes: string | null;
  notifyEnabled: number | null;
}

interface DoseRow {
  id: number;
  medicationId: number;
  medicationName: string;
  takenAt: string;
}

function minutesToHM(total: number) {
  return { h: Math.floor(total / 60), m: total % 60 };
}

function formatCooldown(min: number, max: number): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (h > 0 && rem > 0) return `${h}h ${rem}m`;
    if (h > 0) return `${h}h`;
    return `${rem}m`;
  };
  if (min === max) return fmt(min);
  return `${fmt(min)} - ${fmt(max)}`;
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

export default function MedicationDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === "dark";

  const [medication, setMedication] = useState<MedicationData | null>(null);
  const [doses, setDoses] = useState<DoseRow[]>([]);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editMinH, setEditMinH] = useState("");
  const [editMinM, setEditMinM] = useState("");
  const [editMaxH, setEditMaxH] = useState("");
  const [editMaxM, setEditMaxM] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editNotifications, setEditNotifications] = useState(true);

  const medId = parseInt(id ?? "0", 10);

  const loadData = useCallback(async () => {
    if (!medId) return;
    const med = await getMedication(medId);
    if (med) {
      setMedication(med as MedicationData);
    }
    const history = await getDoseHistory(medId);
    setDoses((history as DoseRow[]).slice(0, 20));
  }, [medId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const startEditing = useCallback(() => {
    if (!medication) return;
    setEditName(medication.name);
    setEditNotes(medication.notes ?? "");
    const min = minutesToHM(medication.cooldownMin);
    setEditMinH(min.h > 0 ? String(min.h) : "");
    setEditMinM(min.m > 0 ? String(min.m) : "");
    const max = minutesToHM(medication.cooldownMax);
    setEditMaxH(max.h > 0 ? String(max.h) : "");
    setEditMaxM(max.m > 0 ? String(max.m) : "");
    setEditNotifications((medication.notifyEnabled ?? 1) === 1);
    setEditing(true);
  }, [medication]);

  const handleSave = useCallback(async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert("", t("medication.name"));
      return;
    }

    const cooldownMin = (parseInt(editMinH, 10) || 0) * 60 + (parseInt(editMinM, 10) || 0);
    const cooldownMax = (parseInt(editMaxH, 10) || 0) * 60 + (parseInt(editMaxM, 10) || 0);

    if (cooldownMin > cooldownMax && cooldownMax > 0) {
      Alert.alert("", `${t("medication.cooldownMin")} > ${t("medication.cooldownMax")}`);
      return;
    }

    await updateMedication(medId, {
      name: trimmedName,
      cooldownMin,
      cooldownMax: cooldownMax > 0 ? cooldownMax : cooldownMin,
      notes: editNotes.trim(),
      notifyEnabled: editNotifications ? 1 : 0,
    });

    setEditing(false);
    await loadData();
  }, [editName, editMinH, editMinM, editMaxH, editMaxM, editNotes, editNotifications, medId, loadData, t]);

  const handleDelete = useCallback(() => {
    Alert.alert(t("medication.delete"), t("medication.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteMedication(medId);
          router.back();
        },
      },
    ]);
  }, [medId, router, t]);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isDark ? colors.surfaceDark : colors.surface,
      color: isDark ? colors.textDark : colors.text,
      borderColor: isDark ? colors.borderDark : colors.border,
    },
  ];

  const smallInputStyle = [
    styles.smallInput,
    {
      backgroundColor: isDark ? colors.surfaceDark : colors.surface,
      color: isDark ? colors.textDark : colors.text,
      borderColor: isDark ? colors.borderDark : colors.border,
    },
  ];

  if (!medication) {
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
          title: medication.name,
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
              <ThemedText style={styles.label}>{t("medication.name")}</ThemedText>
              <TextInput
                style={inputStyle}
                value={editName}
                onChangeText={setEditName}
                placeholder={t("medication.namePlaceholder")}
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel={t("medication.name")}
                autoCapitalize="words"
              />

              <ThemedText style={styles.label}>{t("medication.cooldownMin")}</ThemedText>
              <View style={styles.row}>
                <View style={styles.rowField}>
                  <TextInput
                    style={smallInputStyle}
                    value={editMinH}
                    onChangeText={setEditMinH}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    accessibilityLabel={`${t("medication.cooldownMin")} ${t("medication.hours")}`}
                  />
                  <ThemedText variant="secondary" style={styles.unit}>
                    {t("medication.hours")}
                  </ThemedText>
                </View>
                <View style={styles.rowField}>
                  <TextInput
                    style={smallInputStyle}
                    value={editMinM}
                    onChangeText={setEditMinM}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    accessibilityLabel={`${t("medication.cooldownMin")} ${t("medication.minutes")}`}
                  />
                  <ThemedText variant="secondary" style={styles.unit}>
                    {t("medication.minutes")}
                  </ThemedText>
                </View>
              </View>

              <ThemedText style={styles.label}>{t("medication.cooldownMax")}</ThemedText>
              <View style={styles.row}>
                <View style={styles.rowField}>
                  <TextInput
                    style={smallInputStyle}
                    value={editMaxH}
                    onChangeText={setEditMaxH}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    accessibilityLabel={`${t("medication.cooldownMax")} ${t("medication.hours")}`}
                  />
                  <ThemedText variant="secondary" style={styles.unit}>
                    {t("medication.hours")}
                  </ThemedText>
                </View>
                <View style={styles.rowField}>
                  <TextInput
                    style={smallInputStyle}
                    value={editMaxM}
                    onChangeText={setEditMaxM}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    accessibilityLabel={`${t("medication.cooldownMax")} ${t("medication.minutes")}`}
                  />
                  <ThemedText variant="secondary" style={styles.unit}>
                    {t("medication.minutes")}
                  </ThemedText>
                </View>
              </View>

              <ThemedText style={styles.label}>{t("medication.notes")}</ThemedText>
              <TextInput
                style={[...inputStyle, styles.multiline]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder={t("medication.notesPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                accessibilityLabel={t("medication.notes")}
              />

              <View style={styles.switchRow}>
                <ThemedText style={styles.label}>
                  {t("medication.notifications")}
                </ThemedText>
                <Switch
                  value={editNotifications}
                  onValueChange={setEditNotifications}
                  trackColor={{ true: colors.accent }}
                  accessibilityLabel={t("medication.notifications")}
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
                  title={t("medication.save")}
                  onPress={handleSave}
                  style={styles.editButton}
                />
              </View>
            </>
          ) : (
            /* ---- Detail View ---- */
            <>
              <Card style={styles.infoCard}>
                <ThemedText style={styles.infoLabel}>{t("medication.name")}</ThemedText>
                <ThemedText style={styles.infoValue}>{medication.name}</ThemedText>

                <ThemedText style={[styles.infoLabel, styles.infoLabelSpaced]}>
                  {t("medication.cooldownMin")} / {t("medication.cooldownMax")}
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {formatCooldown(medication.cooldownMin, medication.cooldownMax)}
                </ThemedText>

                {medication.notes ? (
                  <>
                    <ThemedText style={[styles.infoLabel, styles.infoLabelSpaced]}>
                      {t("medication.notes")}
                    </ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {medication.notes}
                    </ThemedText>
                  </>
                ) : null}

                <ThemedText style={[styles.infoLabel, styles.infoLabelSpaced]}>
                  {t("medication.notifications")}
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {(medication.notifyEnabled ?? 1) === 1
                    ? t("common.yes")
                    : t("common.no")}
                </ThemedText>
              </Card>

              {/* Dose History */}
              <ThemedText style={styles.sectionTitle}>
                {t("history.title")}
              </ThemedText>
              {doses.length === 0 ? (
                <ThemedText variant="secondary" style={styles.emptyText}>
                  {t("history.empty")}
                </ThemedText>
              ) : (
                doses.map((dose) => (
                  <Card key={dose.id} style={styles.doseRow}>
                    <ThemedText style={styles.doseTime}>
                      {formatDateTime(dose.takenAt)}
                    </ThemedText>
                  </Card>
                ))
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  smallInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 17,
    textAlign: "center",
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unit: {
    fontSize: 14,
    minWidth: 48,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 12,
  },
  doseRow: {
    marginBottom: 8,
    paddingVertical: 12,
  },
  doseTime: {
    fontSize: 16,
  },
});
