import { type ActuatorKey } from "@/services/esp32-service";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ActuatorPanelProps {
  extractor: boolean;
  pump: boolean;
  // lights: boolean; // <-- Agregamos la luz
  onToggle: (actuator: ActuatorKey) => Promise<void>;
}

export function ActuatorPanel({
  extractor,
  pump,
  // lights,
  onToggle,
}: ActuatorPanelProps) {
  // Componente interno para que todas las tarjetas sean idénticas
  const ActuatorCard = ({
    name,
    isActive,
    iconName,
    actuatorKey,
    activeColor,
    activeBg,
  }: {
    name: string;
    isActive: boolean;
    iconName: keyof typeof Feather.glyphMap;
    actuatorKey: ActuatorKey;
    activeColor: string;
    activeBg: string;
  }) => (
    <Pressable
      style={[
        styles.card,
        isActive
          ? { borderColor: activeColor, backgroundColor: "#FAFAFA" }
          : {},
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
        <Text
          style={[styles.status, { color: isActive ? activeColor : "#6B7280" }]}
        >
          {isActive ? "ENCENDIDO" : "APAGADO"}
        </Text>
      </View>

      {/* Switch visual */}
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
        activeColor="#0284C7" // Azul cielo
        activeBg="#E0F2FE"
      />

      <ActuatorCard
        name="Bomba de Riego"
        isActive={pump}
        iconName="droplet"
        actuatorKey="pump"
        activeColor="#2563EB" // Azul agua
        activeBg="#DBEAFE"
      />

      {/* <ActuatorCard
        name="Luz (Fotoperíodo)"
        isActive={lights}
        iconName="sun"
        actuatorKey="lights"
        activeColor="#D97706" // Ámbar/Naranja
        activeBg="#FEF3C7"
      /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12, // Espacio entre las tarjetas
    marginBottom: 24,
  },
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
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  status: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }], // Mueve el circulito a la derecha cuando está encendido
  },
});
