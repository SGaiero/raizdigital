import { esp32Service } from "@/services/esp32-service";
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
  const [ipAddress, setIpAddress] = useState("192.168.1.100");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleUpdateIp = async () => {
    let formattedIp = ipAddress.trim();
    if (
      !formattedIp.startsWith("http://") &&
      !formattedIp.startsWith("https://")
    ) {
      formattedIp = `http://${formattedIp}`;
    }

    // Configuramos temporalmente
    esp32Service.setLocalUrl(formattedIp);

    // Verificamos si responde antes de dar el OK
    const isWorking = await esp32Service.checkConnection();

    if (isWorking) {
      Alert.alert(
        "✅ ¡Conectado!",
        `La app ahora habla con el ESP32 en ${formattedIp}`,
      );
    } else {
      Alert.alert(
        "❌ Error de conexión",
        "La IP no responde. Asegurate de estar en el mismo Wi-Fi y que el ESP32 esté encendido.",
      );
    }
  };

  const handleAutoDiscover = async () => {
    setIsSearching(true);

    // Asumimos que la subred local usa los primeros 3 bloques de la IP actual
    const baseSegment = ipAddress.split(".").slice(0, 3).join(".");

    const foundIp = await esp32Service.autoDiscover(baseSegment);

    if (foundIp) {
      setIpAddress(foundIp);
      Alert.alert(
        "✅ ¡ESP32 Encontrado!",
        `Se vinculó automáticamente a la IP: ${foundIp}`,
      );
    } else {
      Alert.alert(
        "No encontrado",
        "No se detectó ningún ESP32 en la red. Asegurate de que tu celular está en el Wi-Fi de 2.4GHz y que el ESP32 no parpadea.",
      );
    }
    setIsSearching(false);
  };

  const handleSaveWifi = async () => {
    if (!ssid) return Alert.alert("Error", "Ingresa el nombre de la red");

    setIsConfiguring(true);
    try {
      const response = await fetch("http://192.168.4.1/api/wifi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid, password }),
      });

      if (response.ok) {
        Alert.alert(
          "Credenciales enviadas",
          'El ESP32 se está reiniciando para conectarse. Esperá 15 segundos y tocá el botón "Buscar automáticamente".',
        );
      } else {
        Alert.alert("Error", "No se pudo guardar la configuración.");
      }
    } catch (e) {
      Alert.alert(
        "Error",
        'Conectate a la red "RaizDigital-Setup" desde los ajustes de tu teléfono para poder enviarle la contraseña.',
      );
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Configuración de Conexión</Text>

      <View style={styles.section}>
        <Text style={styles.label}>1. Localizar ESP32 en la red</Text>
        <Text style={styles.helperText}>
          Búsqueda automática (requiere estar en el mismo Wi-Fi)
        </Text>

        <View style={styles.searchRow}>
          <Pressable
            style={[
              styles.buttonSecondary,
              isSearching && styles.buttonDisabled,
            ]}
            onPress={handleAutoDiscover}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="#15803D" size="small" />
            ) : (
              <Text style={styles.buttonSecondaryText}>
                🔍 Buscar automáticamente
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.helperText}>
          O ingresar manualmente si ya sabés la IP:
        </Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={ipAddress}
            onChangeText={setIpAddress}
            keyboardType="numeric"
            placeholder="Ej: 192.168.1.50"
          />
          <Pressable style={styles.buttonSmall} onPress={handleUpdateIp}>
            <Text style={styles.buttonText}>Fijar IP</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.label}>2. Inyectar nuevo Wi-Fi al ESP32</Text>
        <Text style={styles.helperText}>
          Paso previo: Conectate a la red "RaizDigital-Setup" desde los ajustes
          de tu teléfono.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre de la red (ej. Movistar)"
          value={ssid}
          onChangeText={setSsid}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña del Wi-Fi"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Pressable
          style={styles.button}
          onPress={handleSaveWifi}
          disabled={isConfiguring}
        >
          <Text style={styles.buttonText}>
            {isConfiguring ? "Enviando..." : "Mandar credenciales al ESP32"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  section: { marginBottom: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  helperText: { fontSize: 12, color: "#6B7280", marginBottom: 8 },
  row: { flexDirection: "row", gap: 8 },
  searchRow: { marginBottom: 12 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  buttonSmall: {
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#15803D",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  buttonSecondary: {
    backgroundColor: "#DCFCE7",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBFBBB",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
  buttonSecondaryText: { color: "#15803D", fontWeight: "bold", fontSize: 14 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 16 },
});
