import { useState, useCallback } from "react";
import {
  View,
  TextInput,
  Pressable,
  ActionSheetIOS,
  Platform,
  Alert,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { useTranslation } from "react-i18next";
import { ThemedText } from "@/components/Themed";
import { colors } from "@/lib/constants";
import {
  DurationUnit,
  DURATION_UNITS,
  UNIT_TO_MINUTES,
  bestUnit,
  toMinutes,
} from "@/lib/duration";

interface DurationInputProps {
  /** Current value in total minutes. */
  value: number;
  /** Called with the new value in total minutes. */
  onChange: (totalMinutes: number) => void;
  /** Accessibility label prefix (e.g. "Minimum Interval"). */
  accessibilityLabelPrefix?: string;
}

const UNIT_I18N_KEYS: Record<DurationUnit, string> = {
  minutes: "duration.minutes",
  hours: "duration.hours",
  days: "duration.days",
  weeks: "duration.weeks",
  months: "duration.months",
  years: "duration.years",
};

export function DurationInput({
  value,
  onChange,
  accessibilityLabelPrefix,
}: DurationInputProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";

  // Derive initial display from the minutes value
  const initial = bestUnit(value);
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? String(initial.value) : ""
  );
  const [unit, setUnit] = useState<DurationUnit>(initial.unit);

  const handleValueChange = useCallback(
    (text: string) => {
      setDisplayValue(text);
      const num = parseInt(text, 10) || 0;
      onChange(toMinutes(num, unit));
    },
    [unit, onChange]
  );

  const handleUnitChange = useCallback(
    (newUnit: DurationUnit) => {
      const currentNum = parseInt(displayValue, 10) || 0;
      setUnit(newUnit);
      onChange(toMinutes(currentNum, newUnit));
    },
    [displayValue, onChange]
  );

  const showUnitPicker = useCallback(() => {
    const options = DURATION_UNITS.map((u) => t(UNIT_I18N_KEYS[u]));

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, t("common.cancel")],
          cancelButtonIndex: options.length,
        },
        (index) => {
          if (index < DURATION_UNITS.length) {
            handleUnitChange(DURATION_UNITS[index]);
          }
        }
      );
    } else {
      // Android fallback using Alert
      Alert.alert(
        t("duration.selectUnit"),
        undefined,
        [
          ...DURATION_UNITS.map((u, i) => ({
            text: options[i],
            onPress: () => handleUnitChange(u),
          })),
          { text: t("common.cancel"), style: "cancel" as const },
        ]
      );
    }
  }, [t, handleUnitChange]);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isDark ? colors.surfaceDark : colors.surface,
      color: isDark ? colors.textDark : colors.text,
      borderColor: isDark ? colors.borderDark : colors.border,
    },
  ];

  const unitButtonStyle = [
    styles.unitButton,
    {
      backgroundColor: isDark ? colors.surfaceDark : colors.surface,
      borderColor: isDark ? colors.borderDark : colors.border,
    },
  ];

  return (
    <View style={styles.row}>
      <TextInput
        style={inputStyle}
        value={displayValue}
        onChangeText={handleValueChange}
        placeholder="0"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
        accessibilityLabel={
          accessibilityLabelPrefix
            ? `${accessibilityLabelPrefix} ${t("duration.value")}`
            : t("duration.value")
        }
      />
      <Pressable
        onPress={showUnitPicker}
        style={unitButtonStyle}
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabelPrefix
            ? `${accessibilityLabelPrefix} ${t("duration.unit")}: ${t(UNIT_I18N_KEYS[unit])}`
            : `${t("duration.unit")}: ${t(UNIT_I18N_KEYS[unit])}`
        }
        accessibilityHint={t("duration.tapToChangeUnit")}
      >
        <ThemedText style={styles.unitText}>
          {t(UNIT_I18N_KEYS[unit])}
        </ThemedText>
        <ThemedText variant="secondary" style={styles.chevron}>
          ▾
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 17,
    textAlign: "center",
  },
  unitButton: {
    flex: 1.2,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  unitText: {
    fontSize: 16,
    fontWeight: "500",
  },
  chevron: {
    fontSize: 14,
  },
});
