import { ConnectionPanel } from "@/components/connection-panel";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function SettingsScreen() {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Sistema</Text>
          <Text style={styles.subtitle}>Ajustes de red y dispositivo</Text>
        </View>

        <View style={styles.content}>
          {/* El nuevo panel de conexión ocupa todo el protagonismo */}
          <ConnectionPanel />

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              ¿Necesitás reiniciar el hardware?
            </Text>
            <Text style={styles.infoText}>
              Para borrar la red guardada en el ESP32, conectalo por USB a tu
              computadora, abrí Thonny y eliminá el archivo{" "}
              <Text style={{ fontFamily: "monospace" }}>config.json</Text>.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF9" },
  header: {
    backgroundColor: "#15803D",
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: { fontSize: 32, fontWeight: "bold", color: "#FFFFFF" },
  subtitle: { fontSize: 16, color: "#DCFCE7", marginTop: 4 },
  content: { paddingHorizontal: 24, paddingTop: 32, gap: 24 },
  infoBox: {
    backgroundColor: "#F3F4F6",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  infoText: { fontSize: 14, color: "#6B7280", lineHeight: 22 },
});
