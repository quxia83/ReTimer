import { FlatList, Pressable, StyleSheet, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";
import { ThemedText } from "@/components/Themed";
import { colors } from "@/lib/constants";

export interface Preset {
  name: string;
  cooldownMin: number;
  cooldownMax: number;
  notes: string;
}

interface PresetPickerProps {
  onSelect: (preset: Preset) => void;
}

const PRESETS: Preset[] = [
  { name: "Ibuprofen (Advil)", cooldownMin: 240, cooldownMax: 360, notes: "Take with food" },
  { name: "Acetaminophen (Tylenol)", cooldownMin: 240, cooldownMax: 360, notes: "Max 4g/day" },
  { name: "Aspirin", cooldownMin: 240, cooldownMax: 360, notes: "Take with food" },
  { name: "Naproxen (Aleve)", cooldownMin: 480, cooldownMax: 720, notes: "Take with food" },
  { name: "Diphenhydramine (Benadryl)", cooldownMin: 240, cooldownMax: 360, notes: "May cause drowsiness" },
  { name: "Cetirizine (Zyrtec)", cooldownMin: 1440, cooldownMax: 1440, notes: "Once daily" },
  { name: "Loratadine (Claritin)", cooldownMin: 1440, cooldownMax: 1440, notes: "Once daily" },
  { name: "Famotidine (Pepcid)", cooldownMin: 720, cooldownMax: 720, notes: "" },
];

function formatCooldown(min: number, max: number): string {
  const fmtHours = (m: number) => {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (h > 0 && rem > 0) return `${h}h ${rem}m`;
    if (h > 0) return `${h}h`;
    return `${rem}m`;
  };
  if (min === max) return fmtHours(min);
  return `${fmtHours(min)}-${fmtHours(max)}`;
}

export function PresetPicker({ onSelect }: PresetPickerProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";

  const customPreset: Preset = { name: "", cooldownMin: 0, cooldownMax: 0, notes: "" };

  const renderItem = ({ item, index }: { item: Preset; index: number }) => {
    const isCustom = index === 0;
    return (
      <Pressable
        onPress={() => onSelect(item)}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: isDark ? colors.surfaceDark : colors.surface,
            borderBottomColor: isDark ? colors.borderDark : colors.border,
          },
          pressed && styles.rowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={isCustom ? t("medication.custom") : item.name}
      >
        <ThemedText style={styles.name}>
          {isCustom ? t("medication.custom") : item.name}
        </ThemedText>
        {!isCustom && (
          <>
            <ThemedText variant="secondary" style={styles.cooldown}>
              {formatCooldown(item.cooldownMin, item.cooldownMax)}
            </ThemedText>
            {item.notes ? (
              <ThemedText variant="secondary" style={styles.notes}>
                {item.notes}
              </ThemedText>
            ) : null}
          </>
        )}
      </Pressable>
    );
  };

  return (
    <FlatList
      data={[customPreset, ...PRESETS]}
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
});
