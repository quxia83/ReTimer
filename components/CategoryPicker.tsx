import { useCallback } from "react";
import {
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

const CATEGORIES = ["health", "vehicle", "home", "personal", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

const CATEGORY_I18N: Record<Category, string> = {
  health: "categories.health",
  vehicle: "categories.vehicle",
  home: "categories.home",
  personal: "categories.personal",
  other: "categories.other",
};

interface CategoryPickerProps {
  value: string;
  onChange: (category: string) => void;
  accessibilityLabelPrefix?: string;
}

export function CategoryPicker({
  value,
  onChange,
  accessibilityLabelPrefix,
}: CategoryPickerProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";

  const currentLabel = t(CATEGORY_I18N[value as Category] ?? "categories.other");

  const showPicker = useCallback(() => {
    const options = CATEGORIES.map((c) => t(CATEGORY_I18N[c]));

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, t("common.cancel")],
          cancelButtonIndex: options.length,
        },
        (index) => {
          if (index < CATEGORIES.length) {
            onChange(CATEGORIES[index]);
          }
        }
      );
    } else {
      Alert.alert(
        t("medication.selectCategory"),
        undefined,
        [
          ...CATEGORIES.map((c, i) => ({
            text: options[i],
            onPress: () => onChange(c),
          })),
          { text: t("common.cancel"), style: "cancel" as const },
        ]
      );
    }
  }, [t, onChange]);

  return (
    <Pressable
      onPress={showPicker}
      style={[
        styles.button,
        {
          backgroundColor: isDark ? colors.surfaceDark : colors.surface,
          borderColor: isDark ? colors.borderDark : colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabelPrefix
          ? `${accessibilityLabelPrefix}: ${currentLabel}`
          : currentLabel
      }
      accessibilityHint={t("medication.tapToChangeCategory")}
    >
      <ThemedText style={styles.text}>{currentLabel}</ThemedText>
      <ThemedText variant="secondary" style={styles.chevron}>▾</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  text: {
    fontSize: 17,
  },
  chevron: {
    fontSize: 14,
  },
});
