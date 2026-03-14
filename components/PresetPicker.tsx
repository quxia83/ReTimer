import { FlatList, Pressable, StyleSheet, useColorScheme, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ThemedText } from "@/components/Themed";
import { colors } from "@/lib/constants";
import { formatCooldownRange } from "@/lib/duration";

export interface Preset {
  name: string;
  cooldownMin: number;
  cooldownMax: number;
  notes: string;
  category: string;
}

interface InternalPreset extends Preset {
  i18nKey: string;
}

interface PresetPickerProps {
  onSelect: (preset: Preset) => void;
}

const PRESETS: InternalPreset[] = [
  // Health
  { i18nKey: "presets.ibuprofen", name: "Ibuprofen (Advil)", cooldownMin: 240, cooldownMax: 360, notes: "Take with food", category: "health" },
  { i18nKey: "presets.acetaminophen", name: "Acetaminophen (Tylenol)", cooldownMin: 240, cooldownMax: 360, notes: "Max 4g/day", category: "health" },
  { i18nKey: "presets.aspirin", name: "Aspirin", cooldownMin: 240, cooldownMax: 360, notes: "Take with food", category: "health" },
  { i18nKey: "presets.naproxen", name: "Naproxen (Aleve)", cooldownMin: 480, cooldownMax: 720, notes: "Take with food", category: "health" },
  { i18nKey: "presets.diphenhydramine", name: "Diphenhydramine (Benadryl)", cooldownMin: 240, cooldownMax: 360, notes: "May cause drowsiness", category: "health" },
  { i18nKey: "presets.cetirizine", name: "Cetirizine (Zyrtec)", cooldownMin: 1440, cooldownMax: 1440, notes: "Once daily", category: "health" },
  { i18nKey: "presets.loratadine", name: "Loratadine (Claritin)", cooldownMin: 1440, cooldownMax: 1440, notes: "Once daily", category: "health" },
  { i18nKey: "presets.famotidine", name: "Famotidine (Pepcid)", cooldownMin: 720, cooldownMax: 720, notes: "", category: "health" },
  { i18nKey: "presets.dentalCheckup", name: "Dental Checkup", cooldownMin: 259200, cooldownMax: 525600, notes: "", category: "health" },
  { i18nKey: "presets.eyeExam", name: "Eye Exam", cooldownMin: 525600, cooldownMax: 1051200, notes: "", category: "health" },
  // Vehicle
  { i18nKey: "presets.oilChange", name: "Oil Change", cooldownMin: 129600, cooldownMax: 259200, notes: "Check oil level monthly", category: "vehicle" },
  { i18nKey: "presets.tireRotation", name: "Tire Rotation", cooldownMin: 259200, cooldownMax: 388800, notes: "Every 5,000-7,500 miles", category: "vehicle" },
  // Home
  { i18nKey: "presets.airFilter", name: "Air Filter (Home)", cooldownMin: 129600, cooldownMax: 259200, notes: "Check monthly", category: "home" },
  { i18nKey: "presets.waterFilter", name: "Water Filter", cooldownMin: 259200, cooldownMax: 388800, notes: "Replace cartridge", category: "home" },
  { i18nKey: "presets.hvacService", name: "HVAC Service", cooldownMin: 259200, cooldownMax: 525600, notes: "Annual recommended", category: "home" },
  // Personal
  { i18nKey: "presets.haircut", name: "Haircut", cooldownMin: 20160, cooldownMax: 60480, notes: "", category: "personal" },
];

const CATEGORY_ORDER = ["health", "vehicle", "home", "personal"];

type CategoryKey = "health" | "vehicle" | "home" | "personal";

const CATEGORY_I18N: Record<CategoryKey, string> = {
  health: "categories.health",
  vehicle: "categories.vehicle",
  home: "categories.home",
  personal: "categories.personal",
};

interface ListItem {
  type: "custom" | "header" | "preset";
  preset?: Preset;
  categoryKey?: string;
}

export function PresetPicker({ onSelect }: PresetPickerProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";

  const customPreset: Preset = { name: "", cooldownMin: 0, cooldownMax: 0, notes: "", category: "other" };

  // Build flat list with category headers
  const listData: ListItem[] = [{ type: "custom" }];
  for (const cat of CATEGORY_ORDER) {
    const catPresets = PRESETS.filter((p) => p.category === cat);
    if (catPresets.length === 0) continue;
    listData.push({ type: "header", categoryKey: cat });
    for (const p of catPresets) {
      listData.push({ type: "preset", preset: p });
    }
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "custom") {
      return (
        <Pressable
          onPress={() => onSelect(customPreset)}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: isDark ? colors.surfaceDark : colors.surface,
              borderBottomColor: isDark ? colors.borderDark : colors.border,
            },
            pressed && styles.rowPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("tracker.custom")}
        >
          <ThemedText style={styles.name}>
            {t("tracker.custom")}
          </ThemedText>
        </Pressable>
      );
    }

    if (item.type === "header") {
      return (
        <View
          style={[
            styles.categoryHeader,
            {
              backgroundColor: isDark ? colors.backgroundDark : colors.background,
            },
          ]}
        >
          <ThemedText variant="secondary" style={styles.categoryHeaderText}>
            {t(CATEGORY_I18N[item.categoryKey as CategoryKey])}
          </ThemedText>
        </View>
      );
    }

    const preset = item.preset! as InternalPreset;
    const displayName = t(preset.i18nKey);
    return (
      <Pressable
        onPress={() => onSelect({ ...preset, name: displayName })}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: isDark ? colors.surfaceDark : colors.surface,
            borderBottomColor: isDark ? colors.borderDark : colors.border,
          },
          pressed && styles.rowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={displayName}
      >
        <ThemedText style={styles.name}>{displayName}</ThemedText>
        <ThemedText variant="secondary" style={styles.cooldown}>
          {formatCooldownRange(preset.cooldownMin, preset.cooldownMax)}
        </ThemedText>
        {preset.notes ? (
          <ThemedText variant="secondary" style={styles.notes}>
            {preset.notes}
          </ThemedText>
        ) : null}
      </Pressable>
    );
  };

  return (
    <FlatList
      data={listData}
      keyExtractor={(_, index) => String(index)}
      renderItem={renderItem}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  rowPressed: {
    opacity: 0.7,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
  },
  cooldown: {
    marginTop: 2,
    fontSize: 14,
  },
  notes: {
    marginTop: 2,
    fontSize: 13,
  },
  categoryHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  categoryHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
