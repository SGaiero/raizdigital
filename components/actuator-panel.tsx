import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ActuatorKey } from '@/services/esp32-service';

interface ActuatorPanelProps {
  lights: boolean;
  extractor: boolean;
  pump: boolean;
  onToggle: (actuator: ActuatorKey) => void;
}

const ACTUATORS = [
  { key: 'lights' as ActuatorKey, label: 'Luces', icon: 'sun' as const, color: '#F59E0B', gpio: 'GPIO 18' },
  { key: 'extractor' as ActuatorKey, label: 'Extractor', icon: 'wind' as const, color: '#3B82F6', gpio: 'GPIO 21' },
  { key: 'pump' as ActuatorKey, label: 'Bomba', icon: 'droplet' as const, color: '#06B6D4', gpio: 'GPIO 5' },
];

export function ActuatorPanel({ lights, extractor, pump, onToggle }: ActuatorPanelProps) {
  const values: Record<ActuatorKey, boolean> = { lights, extractor, pump };

  return (
    <View style={styles.row}>
      {ACTUATORS.map(({ key, label, icon, color, gpio }) => {
        const active = values[key];
        return (
          <Pressable
            key={key}
            onPress={() => onToggle(key)}
            style={({ pressed }) => [
              styles.card,
              { borderColor: active ? color : '#E5E7EB' },
              active && { backgroundColor: color + '10' },
              pressed && styles.cardPressed,
            ]}
          >
            <View style={[styles.iconBadge, { backgroundColor: active ? color : '#F3F4F6' }]}>
              <Feather name={icon} size={22} color={active ? '#FFFFFF' : '#9CA3AF'} />
            </View>
            <Text style={[styles.label, { color: active ? color : '#6B7280' }]}>{label}</Text>
            <Text style={styles.gpio}>{gpio}</Text>
            <View style={[styles.badge, { backgroundColor: active ? color + '20' : '#F3F4F6' }]}>
              <Text style={[styles.badgeText, { color: active ? color : '#9CA3AF' }]}>
                {active ? 'ON' : 'OFF'}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  cardPressed: {
    opacity: 0.75,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  gpio: {
    fontSize: 10,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
