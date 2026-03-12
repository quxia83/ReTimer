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
import { DurationInput } from "@/components/DurationInput";
import { PresetPicker, Preset } from "@/components/PresetPicker";
import { insertMedication } from "@/db/queries/medications";
import { colors } from "@/lib/constants";

export default function AddMedicationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useColorScheme() === "dark";

  const [name, setName] = useState("");
  const [cooldownMin, setCooldownMin] = useState(0);
  const [cooldownMax, setCooldownMax] = useState(0);
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("other");
  const [notifications, setNotifications] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [presetKey, setPresetKey] = useState(0);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isDark ? colors.surfaceDark : colors.surface,
      color: isDark ? colors.textDark : colors.text,
      borderColor: isDark ? colors.borderDark : colors.border,
    },
  ];

  const handlePresetSelect = useCallback((preset: Preset) => {
    setName(preset.name);
    setNotes(preset.notes);
    setCategory(preset.category);
    setCooldownMin(preset.cooldownMin);
    setCooldownMax(preset.cooldownMax);
    setPresetKey((k) => k + 1);
    setShowPresets(false);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("", t("medication.nameRequired"));
      return;
    }

    if (cooldownMin > cooldownMax && cooldownMax > 0) {
      Alert.alert("", t("medication.minExceedsMax"));
      return;
    }

    await insertMedication({
      name: trimmedName,
      cooldownMin,
      cooldownMax: cooldownMax > 0 ? cooldownMax : cooldownMin,
      notes: notes.trim() || undefined,
      category,
      notifyEnabled: notifications ? 1 : 0,
    });

    router.back();
  }, [name, cooldownMin, cooldownMax, notes, category, notifications, router, t]);

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
          <DurationInput
            key={`min-${presetKey}`}
            value={cooldownMin}
            onChange={setCooldownMin}
            accessibilityLabelPrefix={t("medication.cooldownMin")}
          />

          {/* Cooldown Max */}
          <ThemedText style={styles.label}>{t("medication.cooldownMax")}</ThemedText>
          <DurationInput
            key={`max-${presetKey}`}
            value={cooldownMax}
            onChange={setCooldownMax}
            accessibilityLabelPrefix={t("medication.cooldownMax")}
          />

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
  saveButton: {
    marginTop: 28,
  },
});
