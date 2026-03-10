import { StyleSheet } from "react-native";
import { ThemedView, ThemedText } from "../../../components/Themed";

export default function MedicationDetailScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText variant="title">Medication Detail</ThemedText>
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
