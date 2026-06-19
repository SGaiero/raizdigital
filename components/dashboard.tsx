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
import { ScanningModal } from "./scanning-modal";
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

  // ── NUEVO SISTEMA DE ALERTAS INDIVIDUALES CON ÍCONOS Y COLORES ──
  const getAlerts = () => {
    if (!isConnected) {
      return [
        {
          id: "desc",
          message: "Desconectado",
          icon: "🔌",
          color: "#DC2626",
          bgColor: "#FEE2E2",
        },
      ];
    }

    const alerts = [];

    // Alertas de Suelo
    if (sensors.soilMoisture < 40) {
      alerts.push({
        id: "soil",
        message: "Suelo seco",
        icon: "🏜️",
        color: "#D97706",
        bgColor: "#FEF3C7",
      });
    }

    // Alertas de Clima
    if (sensors.temperature > 28) {
      alerts.push({
        id: "temp_hi",
        message: "Temp. alta",
        icon: "🔥",
        color: "#DC2626",
        bgColor: "#FEE2E2",
      });
    }
    if (sensors.temperature < 15 && sensors.temperature > 0) {
      alerts.push({
        id: "temp_lo",
        message: "Temp. baja",
        icon: "❄️",
        color: "#2563EB",
        bgColor: "#DBEAFE",
      });
    }

    // Alertas de Nutrientes (pH)
    if (sensors.ph < 6.0 && sensors.ph > 0) {
      alerts.push({
        id: "ph_lo",
        message: "pH bajo",
        icon: "🧪",
        color: "#7C3AED",
        bgColor: "#EDE9FE",
      });
    }
    if (sensors.ph > 6.5) {
      alerts.push({
        id: "ph_hi",
        message: "pH alto",
        icon: "⚗️",
        color: "#7C3AED",
        bgColor: "#EDE9FE",
      });
    }

    // Alertas de Nutrientes (EC)
    if (sensors.ec < 0.8 && sensors.ec > 0) {
      alerts.push({
        id: "ec_lo",
        message: "EC baja",
        icon: "📉",
        color: "#EA580C",
        bgColor: "#FFEDD5",
      });
    }
    if (sensors.ec > 2.0) {
      alerts.push({
        id: "ec_hi",
        message: "EC alta",
        icon: "📈",
        color: "#EA580C",
        bgColor: "#FFEDD5",
      });
    }

    return alerts;
  };

  const activeAlerts = getAlerts();

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

            {/* ── TARJETA DE ESTADO DINÁMICA ── */}
            <View
              style={[
                styles.statusCard,
                activeAlerts.length > 0 && styles.statusCardAlert,
              ]}
            >
              {activeAlerts.length === 0 ? (
                <View style={styles.statusContent}>
                  <Text style={styles.emojiGiant}>🌱</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>Estado General</Text>
                    <Text style={styles.statusOk}>
                      Todo funcionando óptimamente
                    </Text>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.alertHeader}>
                    <Text style={styles.alertHeaderEmoji}>⚠️</Text>
                    <Text style={styles.alertHeaderTitle}>
                      Atención requerida
                    </Text>
                  </View>

                  {/* Contenedor Flex para que las "píldoras" se acomoden solas */}
                  <View style={styles.badgesContainer}>
                    {activeAlerts.map((alert) => (
                      <View
                        key={alert.id}
                        style={[
                          styles.badge,
                          { backgroundColor: alert.bgColor },
                        ]}
                      >
                        <Text style={styles.badgeIcon}>{alert.icon}</Text>
                        <Text
                          style={[styles.badgeText, { color: alert.color }]}
                        >
                          {alert.message}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
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
              color="purple"
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

  // Estilos de la tarjeta de estado general
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  statusCardAlert: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" }, // Fondo rojizo tenue cuando hay alertas
  statusContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  emojiGiant: { fontSize: 28 },
  statusTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  statusOk: { fontSize: 14, fontWeight: "500", color: "#16A34A" },

  // Estilos del nuevo sistema de alertas (Badges)
  alertHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  alertHeaderEmoji: { fontSize: 18, marginRight: 8 },
  alertHeaderTitle: { fontSize: 16, fontWeight: "700", color: "#DC2626" },
  badgesContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  badgeIcon: { fontSize: 14, marginRight: 6 },
  badgeText: { fontSize: 13, fontWeight: "700" },

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
