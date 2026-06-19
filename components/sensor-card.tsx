import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SensorCardProps {
  icon: string;
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  onIncrease: () => void;
  onDecrease: () => void;
  color: "green" | "blue" | "orange" | "red" | "purple"; // <-- Agregado 'purple'
}

const colorMap = {
  green: { bg: "#DCFCE7", icon: "#16A34A" },
  blue: { bg: "#DBEAFE", icon: "#2563EB" },
  orange: { bg: "#FED7AA", icon: "#EA580C" },
  red: { bg: "#FEE2E2", icon: "#DC2626" },
  purple: { bg: "#EDE9FE", icon: "#7C3AED" }, // <-- Agregado 'purple'
};

const buttonColorMap = {
  green: { bg: "#DCFCE7", text: "#16A34A" },
  blue: { bg: "#DBEAFE", text: "#2563EB" },
  orange: { bg: "#FED7AA", text: "#EA580C" },
  red: { bg: "#FEE2E2", text: "#DC2626" },
  purple: { bg: "#EDE9FE", text: "#7C3AED" }, // <-- Agregado 'purple'
};

export function SensorCard({
  icon,
  label,
  value,
  unit,
  min,
  max,
  onIncrease,
  onDecrease,
  color,
}: SensorCardProps) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colorMap[color].bg },
          ]}
        >
          <Feather name={icon as any} size={24} color={colorMap[color].icon} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>

      {/* Valor */}
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>

      {/* Rango */}
      {min !== undefined && max !== undefined && (
        <View style={styles.rangeContainer}>
          <Text style={styles.rangeText}>
            Mín: {min}
            {unit}
          </Text>
          <Text style={styles.rangeText}>
            Máx: {max}
            {unit}
          </Text>
        </View>
      )}

      {/* Botones */}
      <View style={styles.buttonsContainer}>
        <Pressable
          onPress={onDecrease}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? "#FECACA" : "#FEE2E2" },
          ]}
        >
          <Text style={[styles.buttonText, { color: "#DC2626" }]}>−</Text>
        </Pressable>
        <Pressable
          onPress={onIncrease}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? "#BBFBBB" : "#DCFCE7" },
          ]}
        >
          <Text style={[styles.buttonText, { color: "#16A34A" }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  valueContainer: {
    marginBottom: 16,
  },
  value: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#111827",
  },
  unit: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 4,
  },
  rangeContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rangeText: {
    color: "#6B7280",
    fontSize: 14,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
  },
});
