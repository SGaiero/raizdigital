import { ConnectionPanel } from "@/components/connection-panel";
import { ConnectionStatus } from "@/components/connection-status";
import { esp32Service } from "@/services/esp32-service";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function SettingsScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | undefined>();

  useEffect(() => {
    const checkConnection = async () => {
      const ok = await esp32Service.testConnection();
      setIsConnected(ok);
      if (ok) setLastUpdate(new Date());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Red y Hardware</Text>
          <Text style={styles.subtitle}>Gestión de conexión del ESP32</Text>
        </View>

        <View style={styles.content}>
          <ConnectionStatus isConnected={isConnected} lastUpdate={lastUpdate} />
          <ConnectionPanel />
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
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  title: { fontSize: 32, fontWeight: "bold", color: "#FFFFFF" },
  subtitle: { fontSize: 16, color: "#DCFCE7", marginTop: 4 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
});
