import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SensorCard } from './sensor-card';
import { ActuatorPanel } from './actuator-panel';
import { ConnectionStatus } from './connection-status';
import { esp32Service, type ActuatorKey } from '@/services/esp32-service';

export function Dashboard() {
  // Sensores
  const [soilMoisture, setSoilMoisture] = useState(65);
  const [light, setLight] = useState(8000);
  const [temperature, setTemperature] = useState(24);
  const [humidity, setHumidity] = useState(60);
  const [waterTemp, setWaterTemp] = useState(22);
  // Actuadores
  const [lights, setLights] = useState(false);
  const [extractor, setExtractor] = useState(false);
  const [pump, setPump] = useState(false);
  // UI
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sensorData, actuatorStatus] = await Promise.all([
        esp32Service.getSensorData(),
        esp32Service.getActuatorStatus(),
      ]);

      setSoilMoisture(sensorData.soilMoisture);
      setLight(sensorData.light);
      setTemperature(sensorData.temperature);
      setHumidity(sensorData.humidity);
      setWaterTemp(sensorData.waterTemp);

      setLights(actuatorStatus.lights);
      setExtractor(actuatorStatus.extractor);
      setPump(actuatorStatus.pump);

      setIsConnected(true);
      setLastUpdate(new Date());
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData().finally(() => setIsRefreshing(false));
  }, [loadData]);

  // Sensor overrides (para testing/simulación)
  const makeSensorHandler = (
    getter: number,
    setter: (v: number) => void,
    sensor: string,
    step: number,
    min: number,
    max: number,
  ) => ({
    onIncrease: async () => {
      const v = Math.min(max, getter + step);
      setter(v);
      try { await esp32Service.updateSensorValue(sensor, v); } catch {}
    },
    onDecrease: async () => {
      const v = Math.max(min, getter - step);
      setter(v);
      try { await esp32Service.updateSensorValue(sensor, v); } catch {}
    },
  });

  const soilHandlers = makeSensorHandler(soilMoisture, setSoilMoisture, 'soilMoisture', 5, 0, 100);
  const lightHandlers = makeSensorHandler(light, setLight, 'light', 500, 0, 15000);
  const tempHandlers = makeSensorHandler(temperature, setTemperature, 'temperature', 1, 0, 40);
  const humidityHandlers = makeSensorHandler(humidity, setHumidity, 'humidity', 5, 0, 100);
  const waterTempHandlers = makeSensorHandler(waterTemp, setWaterTemp, 'waterTemp', 1, 0, 40);

  const handleActuatorToggle = async (actuator: ActuatorKey) => {
    const current = { lights, extractor, pump }[actuator];
    const newState = !current;
    if (actuator === 'lights') setLights(newState);
    else if (actuator === 'extractor') setExtractor(newState);
    else setPump(newState);
    try { await esp32Service.toggleActuator(actuator, newState); } catch {}
  };

  const overallStatus = () => {
    if (!isConnected) return 'Desconectado del ESP32';
    if (soilMoisture < 40) return 'Alerta: Suelo seco';
    if (temperature > 28) return 'Alerta: Temperatura alta';
    return 'Todo funcionando correctamente';
  };

  const statusColor = () => {
    if (!isConnected) return '#EF4444';
    if (soilMoisture < 40 || temperature > 28) return '#F59E0B';
    return '#16A34A';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Raíz Digital</Text>
        <Text style={styles.subtitle}>Sistema de automatización de biomas</Text>
      </View>

      <View style={styles.content}>
        <ConnectionStatus isConnected={isConnected} lastUpdate={lastUpdate} />

        <View style={styles.statusCard}>
          <View style={styles.statusContent}>
            <Text style={styles.emoji}>🌱</Text>
            <View>
              <Text style={styles.statusTitle}>Estado General</Text>
              <Text style={[styles.statusOk, { color: statusColor() }]}>{overallStatus()}</Text>
            </View>
          </View>
        </View>

        {/* ── SENSORES ── */}
        <Text style={styles.sectionTitle}>Sensores</Text>

        <SensorCard
          icon="droplets"
          label="Humedad del Suelo"
          value={soilMoisture}
          unit="%"
          min={40}
          max={80}
          color="blue"
          {...soilHandlers}
        />

        <SensorCard
          icon="sun"
          label="Luz"
          value={light}
          unit="lux"
          min={5000}
          max={10000}
          color="orange"
          {...lightHandlers}
        />

        <SensorCard
          icon="thermometer"
          label="Temperatura Aire"
          value={temperature}
          unit="°C"
          min={18}
          max={28}
          color="red"
          {...tempHandlers}
        />

        <SensorCard
          icon="wind"
          label="Humedad Aire (DHT22)"
          value={humidity}
          unit="%"
          min={40}
          max={80}
          color="green"
          {...humidityHandlers}
        />

        <SensorCard
          icon="thermometer"
          label="Temp. Agua/Sustrato (DS18B20)"
          value={waterTemp}
          unit="°C"
          min={15}
          max={25}
          color="blue"
          {...waterTempHandlers}
        />

        {/* ── ACTUADORES ── */}
        <Text style={styles.sectionTitle}>Actuadores</Text>
        <Text style={styles.sectionSubtitle}>
          Toca para alternar — la máquina de estados automática usa histéresis
        </Text>

        <ActuatorPanel
          lights={lights}
          extractor={extractor}
          pump={pump}
          onToggle={handleActuatorToggle}
        />

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>📊 Rangos óptimos</Text>
          <Text style={styles.tipsText}>
            {'• Humedad suelo: 40–80%  •  Luz: 5000–10000 lux\n• Temp. aire: 18–28°C  •  Humedad aire: 40–80%\n• Temp. agua/sustrato: 15–25°C'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9' },
  header: {
    backgroundColor: '#15803D',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  title: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 16, color: '#DCFCE7', marginTop: 4 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  statusContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 28 },
  statusTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  statusOk: { fontSize: 14, fontWeight: '500' },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  tipsCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBFBBB',
  },
  tipsTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  tipsText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
});
