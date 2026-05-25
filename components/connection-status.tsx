import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdate?: Date;
}

export function ConnectionStatus({
  isConnected,
  lastUpdate,
}: ConnectionStatusProps) {
  const getTimeAgo = () => {
    if (!lastUpdate) return "Nunca";
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return "Hace unos segundos";
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m`;
    return `Hace ${Math.floor(seconds / 3600)}h`;
  };

  return (
    <View
      style={[
        styles.container,
        isConnected ? styles.connected : styles.disconnected,
      ]}
    >
      <View style={styles.content}>
        <Feather
          name={isConnected ? "wifi" : "wifi-off"}
          size={16}
          color={isConnected ? "#10B981" : "#EF4444"}
        />
        <View style={styles.text}>
          <Text style={styles.status}>
            {isConnected ? "Conectado" : "Desconectado"}
          </Text>
          <Text style={styles.time}>{getTimeAgo()}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  connected: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBFBBB",
  },
  disconnected: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    flex: 1,
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  time: {
    fontSize: 12,
    color: "#6B7280",
  },
});
