import { esp32Service, type ActuatorKey } from "@/services/esp32-service";
import { useCallback, useEffect, useRef, useState } from "react";

export function useESP32() {
  const [sensors, setSensors] = useState({
    soilMoisture: 0,
    temperature: 0,
    humidity: 0,
    waterTemp: 0,
    ph: 0,
    ec: 0,
  });
  const [actuators, setActuators] = useState({ extractor: false, pump: false });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isInitializing, setIsInitializing] = useState(true);
  const [showDelayedMessage, setShowDelayedMessage] = useState(false);

  const isScanningRef = useRef(true);

  // Motor de Búsqueda
  useEffect(() => {
    let mounted = true;
    isScanningRef.current = true;

    const connectLoop = async () => {
      let vueltas = 0;
      while (mounted && isScanningRef.current) {
        const isWorking = await esp32Service.testConnection();
        if (isWorking) {
          if (mounted) {
            setIsInitializing(false);
            isScanningRef.current = false;
          }
          break;
        }

        const found = await esp32Service.autoDiscover([
          "192.168.1",
          "192.168.0",
          "192.168.100",
          "10.0.0",
        ]);
        if (found) {
          if (mounted) {
            setIsInitializing(false);
            isScanningRef.current = false;
          }
          break;
        }

        vueltas++;
        if (vueltas >= 3 && mounted) setShowDelayedMessage(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    };

    connectLoop();
    return () => {
      mounted = false;
      isScanningRef.current = false;
    };
  }, []);

  // Carga de datos normal
  const loadData = useCallback(async () => {
    try {
      const [sensorData, actuatorStatus] = await Promise.all([
        esp32Service.getSensorData(),
        esp32Service.getActuatorStatus(),
      ]);
      setSensors({
        soilMoisture: sensorData.soilMoisture,
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        waterTemp: sensorData.waterTemp,
        ph: sensorData.ph,
        ec: sensorData.ec,
      });
      setActuators({
        extractor: actuatorStatus.extractor,
        pump: actuatorStatus.pump,
      });
      setIsConnected(true);
      setLastUpdate(new Date());
    } catch {
      setIsConnected(false);
    }
  }, []);

  // Bucle de refresco (Polling)
  useEffect(() => {
    if (isInitializing) return;
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [loadData, isInitializing]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const toggleActuator = async (actuator: ActuatorKey) => {
    const currentState = actuators[actuator];
    const newState = !currentState;
    setActuators((prev) => ({ ...prev, [actuator]: newState }));
    try {
      await esp32Service.toggleActuator(actuator, newState);
    } catch {}
  };

  const stopScanning = () => {
    isScanningRef.current = false;
    setIsInitializing(false);
  };

  return {
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
  };
}
