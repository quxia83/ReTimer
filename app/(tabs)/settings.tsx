import { StyleSheet } from "react-native";
import { ThemedView, ThemedText } from "../../components/Themed";

export default function SettingsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText variant="title">Settings</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
