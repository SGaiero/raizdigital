import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface CoolerControlProps {
  isActive: boolean;
  speed: number;
  onToggle: () => void;
  onSpeedChange: (speed: number) => void;
}

export function CoolerControl({
  isActive,
  speed,
  onToggle,
  onSpeedChange,
}: CoolerControlProps) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconSection}>
          <View style={styles.iconContainer}>
            <Feather name="wind" size={24} color="#2563EB" />
          </View>
          <Text style={styles.title}>Cooler</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isActive ? '#DCFCE7' : '#F3F4F6' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: isActive ? '#16A34A' : '#6B7280' },
            ]}
          >
            {isActive ? 'Activo' : 'Inactivo'}
          </Text>
        </View>
      </View>

      {/* Toggle Button */}
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.toggleButton,
          {
            backgroundColor: isActive
              ? pressed
                ? '#1D4ED8'
                : '#2563EB'
              : pressed
              ? '#E5E7EB'
              : '#D1D5DB',
          },
        ]}
      >
        <Feather
          name="power"
          size={20}
          color={isActive ? 'white' : '#666'}
        />
        <Text
          style={[
            styles.toggleText,
            { color: isActive ? 'white' : '#4B5563' },
          ]}
        >
          {isActive ? 'Apagar' : 'Encender'}
        </Text>
      </Pressable>

      {/* Speed Control */}
      <View style={styles.speedSection}>
        <View style={styles.speedHeader}>
          <Text style={styles.speedLabel}>Velocidad</Text>
          <Text style={styles.speedValue}>{speed}%</Text>
        </View>

        <View style={styles.speedButtons}>
          {[25, 50, 75, 100].map((val) => (
            <Pressable
              key={val}
              onPress={() => onSpeedChange(val)}
              disabled={!isActive}
              style={({ pressed }) => [
                styles.speedButton,
                {
                  backgroundColor:
                    speed === val
                      ? '#2563EB'
                      : isActive
                      ? pressed
                        ? '#BFDBFE'
                        : '#DBEAFE'
                      : '#F3F4F6',
                },
              ]}
            >
              <Text
                style={[
                  styles.speedButtonText,
                  {
                    color:
                      speed === val
                        ? 'white'
                        : isActive
                        ? '#2563EB'
                        : '#D1D5DB',
                  },
                ]}
              >
                {val}%
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 El cooler se activará automáticamente cuando la temperatura supere
          el límite configurado
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleButton: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  toggleText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  speedSection: {
    marginBottom: 16,
  },
  speedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  speedLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  speedValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  speedButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  speedButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    color: '#1E40AF',
    fontSize: 14,
  },
});
