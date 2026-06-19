import { useESP32 } from "@/hooks/use-esp32";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ActuatorPanel } from "./actuator-panel";
import { ConnectionStatus } from "./connection-status";
import { ScanningModal } from "./scaning-modal";
import { SensorCard } from "./sensor-card";

export function Dashboard() {
  const {
    sensors,
    actuators,
    isConnected,
    isInitializing,
    showDelayedMessage,
    lastUpdate,
    isRefreshing,
    onRefresh,
    toggleActuator,
    stopScanning,
  } = useESP32();

  const overallStatus = () => {
    if (!isConnected) return "Desconectado del ESP32";
    if (sensors.soilMoisture < 40) return "Alerta: Suelo seco";
    if (sensors.temperature > 28) return "Alerta: Temperatura alta";
    return "Todo funcionando correctamente";
  };

  const statusColor = () => {
    if (!isConnected) return "#EF4444";
    if (sensors.soilMoisture < 40 || sensors.temperature > 28) return "#F59E0B";
    return "#16A34A";
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAF9" }}>
      <ScanningModal
        visible={isInitializing}
        showDelayedMessage={showDelayedMessage}
        onStopScanning={stopScanning}
      />

      {!isInitializing && (
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>Raíz Digital</Text>
            <Text style={styles.subtitle}>
              Sistema de automatización de biomas
            </Text>
          </View>

          <View style={styles.content}>
            <ConnectionStatus
              isConnected={isConnected}
              lastUpdate={lastUpdate}
            />

            <View style={styles.statusCard}>
              <View style={styles.statusContent}>
                <Text style={styles.emoji}>🌱</Text>
                <View>
                  <Text style={styles.statusTitle}>Estado General</Text>
                  <Text style={[styles.statusOk, { color: statusColor() }]}>
                    {overallStatus()}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Sensores</Text>
            <SensorCard
              icon="droplets"
              label="Humedad del Suelo"
              value={sensors.soilMoisture}
              unit="%"
              min={40}
              max={80}
              color="blue"
              onIncrease={async () => {}}
              onDecrease={async () => {}}
            />
            <SensorCard
              icon="thermometer"
              label="Temperatura Aire"
              value={sensors.temperature}
              unit="°C"
              min={18}
              max={28}
              color="red"
              onIncrease={async () => {}}
              onDecrease={async () => {}}
            />
            <SensorCard
              icon="wind"
              label="Humedad Aire (DHT22)"
              value={sensors.humidity}
              unit="%"
              min={40}
              max={80}
              color="green"
              onIncrease={async () => {}}
              onDecrease={async () => {}}
            />
            <SensorCard
              icon="thermometer"
              label="Temp. Agua/Sustrato"
              value={sensors.waterTemp}
              unit="°C"
              min={15}
              max={25}
              color="blue"
              onIncrease={async () => {}}
              onDecrease={async () => {}}
            />
            <SensorCard
              icon="activity"
              label="pH"
              value={sensors.ph}
              unit=""
              min={5.5}
              max={6.5}
              color="red"
              onIncrease={async () => {}}
              onDecrease={async () => {}}
            />
            <SensorCard
              icon="zap"
              label="Electroconductividad"
              value={sensors.ec}
              unit="mS/cm"
              min={0.8}
              max={2.0}
              color="orange"
              onIncrease={async () => {}}
              onDecrease={async () => {}}
            />

            <Text style={styles.sectionTitle}>Actuadores</Text>
            <ActuatorPanel
              extractor={actuators.extractor}
              pump={actuators.pump}
              onToggle={toggleActuator}
            />

            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>📊 Rangos óptimos</Text>
              <Text style={styles.tipsText}>
                {
                  "• Humedad suelo: 40–80%\n• Temp. aire: 18–28°C  •  Humedad aire: 40–80%\n• Temp. agua/sustrato: 15–25°C\n• pH: 6.0–6.5  •  EC: 0.8–2.0 mS/cm"
                }
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF9" },
  header: {
    backgroundColor: "#15803D",
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  title: { fontSize: 36, fontWeight: "bold", color: "#FFFFFF" },
  subtitle: { fontSize: 16, color: "#DCFCE7", marginTop: 4 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  statusContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  emoji: { fontSize: 28 },
  statusTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  statusOk: { fontSize: 14, fontWeight: "500" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
    marginTop: 8,
  },
  tipsCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BBFBBB",
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  tipsText: { fontSize: 14, color: "#4B5563", lineHeight: 22 },
});
