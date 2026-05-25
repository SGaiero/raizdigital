import { esp32Service, ConnectionMode } from '@/services/esp32-service';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface SettingsProps {
  onConnected: () => void;
  currentIp: string;
}

export default function Settings({ onConnected = () => {}, currentIp = '192.168.1.100' }: Partial<SettingsProps>) {
  const [mode, setMode] = useState<ConnectionMode>('local');
  const [localIp, setLocalIp] = useState(currentIp || '192.168.1.100');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      if (mode === 'local') {
        const fullUrl = localIp.startsWith('http') ? localIp : `http://${localIp}`;
        esp32Service.setLocalUrl(fullUrl);
      } else {
        if (!remoteUrl || !apiToken) {
          Alert.alert('❌ Error', 'Ingresa la URL del backend y el token');
          setIsLoading(false);
          return;
        }
        esp32Service.setRemoteConnection(remoteUrl, apiToken);
      }

      const isConnected = await esp32Service.testConnection();

      if (isConnected) {
        Alert.alert(
          '✅ Éxito',
          `Conectado al ESP32 correctamente (${mode === 'local' ? 'Conexión local' : 'Conexión remota'})`
        );
        onConnected();
      } else {
        Alert.alert(
          '❌ Error',
          'No se pudo conectar. Verifica los datos de conexión.'
        );
      }
    } catch (error) {
      Alert.alert(
        '❌ Error',
        `Conexión fallida: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Feather name="settings" size={24} color="#2563EB" />
          <Text style={styles.title}>Configuración de Conexión</Text>
        </View>

        {/* Selector de modo */}
        <View style={styles.modeSelector}>
          <Pressable
            onPress={() => setMode('local')}
            style={[
              styles.modeButton,
              mode === 'local' && styles.modeButtonActive,
            ]}
          >
            <Feather
              name="home"
              size={18}
              color={mode === 'local' ? '#2563EB' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.modeText,
                mode === 'local' && styles.modeTextActive,
              ]}
            >
              Local
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode('remote')}
            style={[
              styles.modeButton,
              mode === 'remote' && styles.modeButtonActive,
            ]}
          >
            <Feather
              name="cloud"
              size={18}
              color={mode === 'remote' ? '#2563EB' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.modeText,
                mode === 'remote' && styles.modeTextActive,
              ]}
            >
              Remoto
            </Text>
          </Pressable>
        </View>

        {/* Conexión Local */}
        {mode === 'local' && (
          <View style={styles.section}>
            <Text style={styles.label}>IP del ESP32</Text>
            <TextInput
              style={styles.input}
              placeholder="192.168.1.100"
              value={localIp}
              onChangeText={setLocalIp}
              editable={!isLoading}
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.help}>
              Ingresa la dirección IP del ESP32 en tu red WiFi local
            </Text>
          </View>
        )}

        {/* Conexión Remota */}
        {mode === 'remote' && (
          <View style={styles.section}>
            <Text style={styles.label}>URL del Backend</Text>
            <TextInput
              style={styles.input}
              placeholder="https://raiz-digital.railway.app"
              value={remoteUrl}
              onChangeText={setRemoteUrl}
              editable={!isLoading}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Token de API</Text>
            <TextInput
              style={styles.input}
              placeholder="tu_token_secreto"
              value={apiToken}
              onChangeText={setApiToken}
              editable={!isLoading}
              secureTextEntry
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.help}>
              Obtén estos datos de tu administrador del servidor
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleTestConnection}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled,
          ]}
        >
          <Feather
            name={isLoading ? 'loader' : mode === 'local' ? 'wifi' : 'cloud'}
            size={18}
            color="white"
          />
          <Text style={styles.buttonText}>
            {isLoading ? 'Conectando...' : 'Probar Conexión'}
          </Text>
        </Pressable>

        <View style={styles.info}>
          <Feather name="info" size={16} color="#2563EB" />
          <Text style={styles.infoText}>
            {mode === 'local'
              ? 'El ESP32 debe estar en la misma red WiFi que tu dispositivo'
              : 'Necesitas un backend desplegado en la nube para acceso remoto'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  modeButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  modeTextActive: {
    color: '#2563EB',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  help: {
    fontSize: 13,
    color: '#6B7280',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  buttonPressed: {
    backgroundColor: '#1D4ED8',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    flex: 1,
  },
});
