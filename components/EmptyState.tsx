import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemedText } from "@/components/Themed";
import { Button } from "@/components/ui/Button";
import { colors } from "@/lib/constants";

interface EmptyStateProps {
  onAddFirst: () => void;
}

export function EmptyState({ onAddFirst }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <FontAwesome
        name="repeat"
        size={64}
        color={colors.textSecondary}
        style={styles.icon}
        accessibilityElementsHidden
      />
      <ThemedText style={styles.title}>{t("dashboard.empty")}</ThemedText>
      <ThemedText variant="secondary" style={styles.subtitle}>
        {t("dashboard.emptyHint")}
      </ThemedText>
      <Button
        title={t("dashboard.addFirst")}
        onPress={onAddFirst}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    minWidth: 220,
  },
});
