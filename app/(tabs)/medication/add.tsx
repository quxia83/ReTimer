import { useState, useCallback } from "react";
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
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ThemedView, ThemedText } from "@/components/Themed";
import { Button } from "@/components/ui/Button";
import { PresetPicker, Preset } from "@/components/PresetPicker";
import { insertMedication } from "@/db/queries/medications";
import { colors } from "@/lib/constants";

function minutesToHM(total: number) {
  return { h: Math.floor(total / 60), m: total % 60 };
}

export default function AddMedicationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useColorScheme() === "dark";

  const [name, setName] = useState("");
  const [minH, setMinH] = useState("");
  const [minM, setMinM] = useState("");
  const [maxH, setMaxH] = useState("");
  const [maxM, setMaxM] = useState("");
  const [notes, setNotes] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [showPresets, setShowPresets] = useState(false);

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

  const handlePresetSelect = useCallback((preset: Preset) => {
    setName(preset.name);
    setNotes(preset.notes);
    if (preset.cooldownMin > 0) {
      const min = minutesToHM(preset.cooldownMin);
      setMinH(min.h > 0 ? String(min.h) : "");
      setMinM(min.m > 0 ? String(min.m) : "");
    } else {
      setMinH("");
      setMinM("");
    }
    if (preset.cooldownMax > 0) {
      const max = minutesToHM(preset.cooldownMax);
      setMaxH(max.h > 0 ? String(max.h) : "");
      setMaxM(max.m > 0 ? String(max.m) : "");
    } else {
      setMaxH("");
      setMaxM("");
    }
    setShowPresets(false);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("", t("medication.name"));
      return;
    }

    const cooldownMin = (parseInt(minH, 10) || 0) * 60 + (parseInt(minM, 10) || 0);
    const cooldownMax = (parseInt(maxH, 10) || 0) * 60 + (parseInt(maxM, 10) || 0);

    if (cooldownMin > cooldownMax && cooldownMax > 0) {
      Alert.alert("", `${t("medication.cooldownMin")} > ${t("medication.cooldownMax")}`);
      return;
    }

    await insertMedication({
      name: trimmedName,
      cooldownMin,
      cooldownMax: cooldownMax > 0 ? cooldownMax : cooldownMin,
      notes: notes.trim() || undefined,
      notifyEnabled: notifications ? 1 : 0,
    });

    router.back();
  }, [name, minH, minM, maxH, maxM, notes, notifications, router, t]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: t("medication.add"),
          headerBackTitle: "",
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
          {/* Preset section */}
          <Pressable
            onPress={() => setShowPresets(!showPresets)}
            style={[
              styles.presetButton,
              {
                borderColor: isDark ? colors.borderDark : colors.border,
                backgroundColor: isDark ? colors.surfaceDark : colors.surface,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("medication.fromPreset")}
          >
            <ThemedText style={styles.presetButtonText}>
              {t("medication.fromPreset")}
            </ThemedText>
          </Pressable>

          {showPresets && <PresetPicker onSelect={handlePresetSelect} />}

          {/* Name */}
          <ThemedText style={styles.label}>{t("medication.name")}</ThemedText>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder={t("medication.namePlaceholder")}
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel={t("medication.name")}
            autoCapitalize="words"
          />

          {/* Cooldown Min */}
          <ThemedText style={styles.label}>{t("medication.cooldownMin")}</ThemedText>
          <View style={styles.row}>
            <View style={styles.rowField}>
              <TextInput
                style={smallInputStyle}
                value={minH}
                onChangeText={setMinH}
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
                value={minM}
                onChangeText={setMinM}
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

          {/* Cooldown Max */}
          <ThemedText style={styles.label}>{t("medication.cooldownMax")}</ThemedText>
          <View style={styles.row}>
            <View style={styles.rowField}>
              <TextInput
                style={smallInputStyle}
                value={maxH}
                onChangeText={setMaxH}
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
                value={maxM}
                onChangeText={setMaxM}
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

          {/* Notes */}
          <ThemedText style={styles.label}>{t("medication.notes")}</ThemedText>
          <TextInput
            style={[...inputStyle, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t("medication.notesPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            accessibilityLabel={t("medication.notes")}
          />

          {/* Notifications */}
          <View style={styles.switchRow}>
            <ThemedText style={styles.label}>
              {t("medication.notifications")}
            </ThemedText>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: colors.accent }}
              accessibilityLabel={t("medication.notifications")}
              accessibilityRole="switch"
            />
          </View>

          {/* Save */}
          <Button
            title={t("medication.save")}
            onPress={handleSave}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 48,
  },
  presetButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 20,
  },
  presetButtonText: {
    fontSize: 16,
    fontWeight: "600",
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
  saveButton: {
    marginTop: 28,
  },
});
