import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export function ConnectionPanel() {
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [isConfiguring, setIsConfiguring] = useState(false);

  const handleSaveWifi = async () => {
    if (!ssid)
      return Alert.alert(
        "Información incompleta",
        "El nombre de la red (SSID) es obligatorio.",
      );

    setIsConfiguring(true);
    try {
      // 192.168.4.1 es la IP del Access Point nativo del ESP32
      const response = await fetch("http://192.168.4.1/api/wifi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid, password }),
      });

      if (response.ok) {
        Alert.alert(
          "¡Configuración enviada!",
          "El ESP32 se está reiniciando. Conectá tu celular de vuelta al Wi-Fi de tu casa y andá al Dashboard.",
          [{ text: "Ir al Dashboard", onPress: () => router.push("/") }],
        );
      } else {
        Alert.alert("Error", "El microcontrolador rechazó la configuración.");
      }
    } catch (e) {
      Alert.alert(
        "Sin conexión con el ESP32",
        'No estamos conectados al equipo. Asegurate de abrir los ajustes de Wi-Fi de tu teléfono y conectarte a la red "RaizDigital-Setup".',
      );
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Feather name="wifi" size={24} color="#15803D" />
        </View>
        <View>
          <Text style={styles.title}>Vincular Equipo</Text>
          <Text style={styles.subtitle}>Enviá las credenciales de tu casa</Text>
        </View>
      </View>

      <View style={styles.instructionBox}>
        <Text style={styles.stepText}>
          <Text style={styles.bold}>Paso 1:</Text> Conectá tu celular a la red
          Wi-Fi llamada <Text style={styles.code}>RaizDigital-Setup</Text>{" "}
          (clave: raizdigital).
        </Text>
        <Text style={styles.stepText}>
          <Text style={styles.bold}>Paso 2:</Text> Escribí abajo los datos de tu
          router de internet.
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nombre de la red Wi-Fi (SSID)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Movistar_Fibra"
          placeholderTextColor="#9CA3AF"
          value={ssid}
          onChangeText={setSsid}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          isConfiguring && styles.buttonDisabled,
          pressed && !isConfiguring && styles.buttonPressed,
        ]}
        onPress={handleSaveWifi}
        disabled={isConfiguring}
      >
        {isConfiguring ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Transferir al ESP32</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#1F2937" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  instructionBox: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  stepText: { fontSize: 14, color: "#4B5563", lineHeight: 22, marginBottom: 8 },
  bold: { fontWeight: "bold", color: "#1F2937" },
  code: {
    fontFamily: "monospace",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 4,
    borderRadius: 4,
    color: "#0369A1",
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1F2937",
  },
  button: {
    backgroundColor: "#15803D",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  buttonDisabled: { backgroundColor: "#86EFAC" },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
});
