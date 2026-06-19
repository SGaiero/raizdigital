import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const ScanProgressBar = () => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animValue.setValue(0);
    const animation = Animated.loop(
      Animated.timing(animValue, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [animValue]);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={styles.progressContainer}>
      <Animated.View
        style={[styles.progressIndicator, { transform: [{ translateX }] }]}
      />
    </View>
  );
};

interface ScanningModalProps {
  visible: boolean;
  showDelayedMessage: boolean;
  onStopScanning: () => void;
}

export function ScanningModal({
  visible,
  showDelayedMessage,
  onStopScanning,
}: ScanningModalProps) {
  const handleSetupNewDevice = () => {
    onStopScanning();
    router.push("/settings");
  };

  if (!visible) return null;

  return (
    <Modal visible={true} animationType="fade" transparent={false}>
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCenter}>
          <Text style={styles.loadingTitle}>Buscando hardware</Text>

          <ScanProgressBar />

          <Text style={styles.loadingSubtitle}>
            {showDelayedMessage
              ? "Esto está tardando más de lo normal...\nAsegurate de estar conectado a tu Wi-Fi."
              : "Escaneando red local"}
          </Text>
        </View>

        <View style={styles.escapeContainer}>
          <Text style={styles.escapeText}>
            ¿Cambiaste de router o es un equipo nuevo?
          </Text>
          <Pressable style={styles.escapeButton} onPress={handleSetupNewDevice}>
            <Text style={styles.escapeButtonText}>Vincular nuevo ESP32</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FAFAF9",
    justifyContent: "space-between",
    padding: 32,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  emojiGiant: { fontSize: 64, marginBottom: 16 },
  loadingTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 24,
  },
  progressContainer: {
    width: "100%",
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 24,
  },
  progressIndicator: {
    width: "40%",
    height: "100%",
    backgroundColor: "#15803D",
    borderRadius: 3,
  },
  loadingSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  escapeContainer: { alignItems: "center", paddingBottom: 40, width: "100%" },
  escapeText: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  escapeButton: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBFBBB",
    width: "100%",
    alignItems: "center",
  },
  escapeButtonText: { color: "#15803D", fontWeight: "bold", fontSize: 16 },
});
