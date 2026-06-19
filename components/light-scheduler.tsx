import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface LightSchedulerProps {
  startMinutes: number;
  endMinutes: number;
  isLightsOn: boolean;
  onSave: (start: number, end: number) => Promise<void>;
}

export function LightScheduler({
  startMinutes,
  endMinutes,
  isLightsOn,
  onSave,
}: LightSchedulerProps) {
  const getBaseDate = (totalMins: number) => {
    const d = new Date();
    d.setHours(Math.floor(totalMins / 60), totalMins % 60, 0, 0);
    return d;
  };

  const [start, setStart] = useState(getBaseDate(startMinutes));
  const [end, setEnd] = useState(getBaseDate(endMinutes));
  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(
    null,
  );

  useEffect(() => {
    setStart(getBaseDate(startMinutes));
    setEnd(getBaseDate(endMinutes));
  }, [startMinutes, endMinutes]);

  const formatTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

  const handleSave = async () => {
    const sMins = start.getHours() * 60 + start.getMinutes();
    const eMins = end.getHours() * 60 + end.getMinutes();
    await onSave(sMins, eMins);
  };

  const hasChanges =
    start.getHours() * 60 + start.getMinutes() !== startMinutes ||
    end.getHours() * 60 + end.getMinutes() !== endMinutes;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            isLightsOn ? styles.iconOn : styles.iconOff,
          ]}
        >
          <Feather
            name="sun"
            size={24}
            color={isLightsOn ? "#D97706" : "#6B7280"}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Fotoperíodo</Text>
          {/* INDICADOR VISUAL DE ESTADO */}
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.dot,
                { backgroundColor: isLightsOn ? "#D97706" : "#9CA3AF" },
              ]}
            />
            <Text style={styles.statusText}>
              {isLightsOn ? "Encendido" : "Apagado"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          style={styles.timeBox}
          onPress={() => setActivePicker("start")}
        >
          <Text style={styles.label}>Encendido</Text>
          <Text style={styles.timeText}>{formatTime(start)}</Text>
        </Pressable>

        <Pressable
          style={styles.timeBox}
          onPress={() => setActivePicker("end")}
        >
          <Text style={styles.label}>Apagado</Text>
          <Text style={styles.timeText}>{formatTime(end)}</Text>
        </Pressable>
      </View>

      <Modal
        visible={activePicker !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActivePicker(null)}
      >
        <View style={styles.modalOverlay}>
          {/* Al tocar afuera del selector, se cierra */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setActivePicker(null)}
          />

          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {activePicker === "start"
                  ? "Hora de Encendido"
                  : "Hora de Apagado"}
              </Text>
              <Pressable onPress={() => setActivePicker(null)}>
                <Text style={styles.doneBtnText}>Listo</Text>
              </Pressable>
            </View>

            {/* Contenedor centrado para la ruleta */}
            <View style={styles.spinnerWrapper}>
              <DateTimePicker
                value={activePicker === "start" ? start : end}
                mode="time"
                display="spinner"
                is24Hour={true}
                onChange={(event, date) => {
                  if (date)
                    activePicker === "start" ? setStart(date) : setEnd(date);
                }}
                textColor="#111827"
              />
            </View>
          </View>
        </View>
      </Modal>

      {hasChanges && (
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Guardar Horario</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "600", color: "#4B5563" },
  iconOn: { backgroundColor: "#FEF3C7" },
  iconOff: { backgroundColor: "#F3F4F6" },
  title: { fontSize: 18, fontWeight: "bold" },
  controlsRow: { flexDirection: "row", gap: 16 },
  timeBox: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  label: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  timeText: { fontSize: 20, fontWeight: "bold" },

  // Overlay y contenedor del Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  pickerContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pickerTitle: { fontWeight: "600", color: "#374151" },
  doneBtnText: { color: "#15803D", fontWeight: "bold", fontSize: 16 },

  // Esto centra la ruleta
  spinnerWrapper: { alignItems: "center", width: "100%" },

  saveBtn: {
    marginTop: 16,
    backgroundColor: "#15803D",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFF", fontWeight: "bold" },
});
