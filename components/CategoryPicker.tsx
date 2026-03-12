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

  const isBuiltIn = CATEGORIES.includes(value as Category);
  const currentLabel = isBuiltIn
    ? t(CATEGORY_I18N[value as Category])
    : value || t("categories.other");

  const promptCustom = useCallback(() => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        t("categories.enterCategory"),
        undefined,
        (text) => {
          const trimmed = text?.trim();
          if (trimmed) onChange(trimmed);
        },
        "plain-text",
        "",
        t("categories.categoryPlaceholder")
      );
    } else {
      // Android fallback — Alert.prompt not available
      Alert.alert(t("categories.enterCategory"), t("categories.categoryPlaceholder"));
    }
  }, [t, onChange]);

  const showPicker = useCallback(() => {
    const options = CATEGORIES.map((c) => t(CATEGORY_I18N[c]));
    const customLabel = t("categories.custom");

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, customLabel, t("common.cancel")],
          cancelButtonIndex: options.length + 1,
        },
        (index) => {
          if (index < CATEGORIES.length) {
            onChange(CATEGORIES[index]);
          } else if (index === CATEGORIES.length) {
            promptCustom();
          }
        }
      );
    } else {
      Alert.alert(
        t("tracker.selectCategory"),
        undefined,
        [
          ...CATEGORIES.map((c, i) => ({
            text: options[i],
            onPress: () => onChange(c),
          })),
          { text: customLabel, onPress: promptCustom },
          { text: t("common.cancel"), style: "cancel" as const },
        ]
      );
    }
  }, [t, onChange, promptCustom]);

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
      accessibilityHint={t("tracker.tapToChangeCategory")}
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
