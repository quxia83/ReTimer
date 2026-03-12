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
import { CategoryPicker } from "@/components/CategoryPicker";
import { PresetPicker, Preset } from "@/components/PresetPicker";
import { insertTracker } from "@/db/queries/trackers";
import { colors } from "@/lib/constants";

export default function AddTrackerScreen() {
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
      Alert.alert("", t("tracker.nameRequired"));
      return;
    }

    if (cooldownMin > cooldownMax && cooldownMax > 0) {
      Alert.alert("", t("tracker.minExceedsMax"));
      return;
    }

    await insertTracker({
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
          title: t("tracker.add"),
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
            accessibilityLabel={t("tracker.fromPreset")}
          >
            <ThemedText style={styles.presetButtonText}>
              {t("tracker.fromPreset")}
            </ThemedText>
          </Pressable>

          {showPresets && <PresetPicker onSelect={handlePresetSelect} />}

          {/* Name */}
          <ThemedText style={styles.label}>{t("tracker.name")}</ThemedText>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder={t("tracker.namePlaceholder")}
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel={t("tracker.name")}
            autoCapitalize="words"
          />

          {/* Category */}
          <ThemedText style={styles.label}>{t("tracker.category")}</ThemedText>
          <CategoryPicker
            value={category}
            onChange={setCategory}
            accessibilityLabelPrefix={t("tracker.category")}
          />

          {/* Cooldown Min */}
          <ThemedText style={styles.label}>{t("tracker.cooldownMin")}</ThemedText>
          <DurationInput
            key={`min-${presetKey}`}
            value={cooldownMin}
            onChange={setCooldownMin}
            accessibilityLabelPrefix={t("tracker.cooldownMin")}
          />

          {/* Cooldown Max */}
          <ThemedText style={styles.label}>{t("tracker.cooldownMax")}</ThemedText>
          <DurationInput
            key={`max-${presetKey}`}
            value={cooldownMax}
            onChange={setCooldownMax}
            accessibilityLabelPrefix={t("tracker.cooldownMax")}
          />

          {/* Notes */}
          <ThemedText style={styles.label}>{t("tracker.notes")}</ThemedText>
          <TextInput
            style={[...inputStyle, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t("tracker.notesPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            accessibilityLabel={t("tracker.notes")}
          />

          {/* Notifications */}
          <View style={styles.switchRow}>
            <ThemedText style={styles.label}>
              {t("tracker.notifications")}
            </ThemedText>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: colors.accent }}
              accessibilityLabel={t("tracker.notifications")}
              accessibilityRole="switch"
            />
          </View>

          {/* Save */}
          <Button
            title={t("tracker.save")}
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
