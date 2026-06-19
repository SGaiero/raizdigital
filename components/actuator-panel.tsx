import { type ActuatorKey } from "@/services/esp32-service";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ActuatorPanelProps {
  extractor: boolean;
  pump: boolean;
  // lights: boolean;
  onToggle: (actuator: ActuatorKey) => Promise<void>;
}

export function ActuatorPanel({
  extractor,
  pump,
  // lights,
  onToggle,
}: ActuatorPanelProps) {
  const ActuatorCard = ({
    name,
    isActive,
    iconName,
    actuatorKey,
    activeColor,
    activeBg,
  }: any) => (
    <Pressable
      style={[
        styles.card,
        isActive ? { borderColor: activeColor, borderWidth: 2 } : {}, // Borde más grueso si está activo
      ]}
      onPress={() => onToggle(actuatorKey)}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isActive ? activeBg : "#F3F4F6" },
        ]}
      >
        <Feather
          name={iconName}
          size={24}
          color={isActive ? activeColor : "#9CA3AF"}
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.statusRow}>
          {/* LED INDICADOR */}
          <View
            style={[
              styles.indicator,
              { backgroundColor: isActive ? activeColor : "#D1D5DB" },
            ]}
          />
          <Text
            style={[
              styles.status,
              { color: isActive ? activeColor : "#6B7280" },
            ]}
          >
            {isActive ? "ENCENDIDO" : "APAGADO"}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.toggleTrack,
          { backgroundColor: isActive ? activeColor : "#E5E7EB" },
        ]}
      >
        <View
          style={[styles.toggleKnob, isActive ? styles.toggleKnobActive : {}]}
        />
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ActuatorCard
        name="Extractor de Aire"
        isActive={extractor}
        iconName="wind"
        actuatorKey="extractor"
        activeColor="#0284C7"
        activeBg="#E0F2FE"
      />
      <ActuatorCard
        name="Bomba de Riego"
        isActive={pump}
        iconName="droplet"
        actuatorKey="pump"
        activeColor="#2563EB"
        activeBg="#DBEAFE"
      />
      {/* <ActuatorCard
        name="Luz (Fotoperíodo)"
        isActive={lights}
        iconName="sun"
        actuatorKey="lights"
        activeColor="#D97706"
        activeBg="#FEF3C7"
      /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, marginBottom: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  textContainer: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  // Estilo del LED
  indicator: { width: 8, height: 8, borderRadius: 4 },
  status: { fontSize: 12, fontWeight: "800" },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  toggleKnobActive: { transform: [{ translateX: 20 }] },
});
