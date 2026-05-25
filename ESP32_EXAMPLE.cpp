// ============================================
// EJEMPLO DE CÓDIGO ESP32 CON ARDUINO
// ============================================
// Este es un ejemplo de cómo configurar el ESP32
// para funcionar con la app Raíz Digital

/*
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// Configuración WiFi
const char* ssid = "TU_RED_WIFI";
const char* password = "TU_CONTRASEÑA";

WebServer server(80);

// Pines de los sensores
const int SOIL_MOISTURE_PIN = 34;    // ADC
const int LIGHT_PIN = 35;             // ADC
const int TEMP_PIN = 32;              // ADC o sensor DHT
const int COOLER_PIN = 27;            // PWM

// Variables globales
float soilMoisture = 65;
float light = 8000;
float temperature = 24;
bool coolerActive = false;
int coolerSpeed = 50;

// ============================================
// ENDPOINTS REST API
// ============================================

// GET /health - Verificar conexión
void handleHealth() {
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

// GET /api/sensors - Obtener datos de sensores
void handleGetSensors() {
  DynamicJsonDocument doc(1024);
  doc["soilMoisture"] = soilMoisture;
  doc["light"] = light;
  doc["temperature"] = temperature;

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// POST /api/sensors/{sensor} - Actualizar valor del sensor
void handleUpdateSensor() {
  String sensor = server.pathArg(0);
  if (server.hasArg("plain")) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, server.arg("plain"));
    float value = doc["value"];

    if (sensor == "soilMoisture") soilMoisture = value;
    else if (sensor == "light") light = value;
    else if (sensor == "temperature") temperature = value;

    server.send(200, "application/json", "{\"success\":true}");
  }
}

// GET /api/cooler/status - Obtener estado del cooler
void handleGetCoolerStatus() {
  DynamicJsonDocument doc(1024);
  doc["isActive"] = coolerActive;
  doc["speed"] = coolerSpeed;

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// POST /api/cooler/toggle - Encender/Apagar cooler
void handleToggleCooler() {
  if (server.hasArg("plain")) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, server.arg("plain"));
    coolerActive = doc["isActive"];

    // Controlar el pin del cooler
    if (coolerActive) {
      digitalWrite(COOLER_PIN, HIGH);
    } else {
      digitalWrite(COOLER_PIN, LOW);
    }

    server.send(200, "application/json", "{\"success\":true}");
  }
}

// POST /api/cooler/speed - Cambiar velocidad del cooler
void handleCoolerSpeed() {
  if (server.hasArg("plain")) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, server.arg("plain"));
    coolerSpeed = doc["speed"];

    // PWM: mapear velocidad a valor PWM (0-255)
    int pwmValue = map(coolerSpeed, 0, 100, 0, 255);
    analogWrite(COOLER_PIN, pwmValue);

    server.send(200, "application/json", "{\"success\":true}");
  }
}

// ============================================
// SETUP
// ============================================

void setup() {
  Serial.begin(115200);

  // Configurar pines
  pinMode(COOLER_PIN, OUTPUT);

  // Conectar WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi conectado!");
  Serial.println(WiFi.localIP());

  // Registrar endpoints
  server.on("/health", handleHealth);
  server.on("/api/sensors", handleGetSensors);
  server.on("/api/sensors/soilMoisture", handleUpdateSensor);
  server.on("/api/sensors/light", handleUpdateSensor);
  server.on("/api/sensors/temperature", handleUpdateSensor);
  server.on("/api/cooler/status", handleGetCoolerStatus);
  server.on("/api/cooler/toggle", handleToggleCooler);
  server.on("/api/cooler/speed", handleCoolerSpeed);

  server.begin();
  Serial.println("Servidor iniciado!");
}

void loop() {
  server.handleClient();

  // Aquí leer datos reales de los sensores
  // soilMoisture = analogRead(SOIL_MOISTURE_PIN);
  // light = analogRead(LIGHT_PIN);
  // temperature = analogRead(TEMP_PIN);
}

// ============================================
// ENDPOINTS RESUMEN
// ============================================
// GET  /health                      - Verificar conexión
// GET  /api/sensors                 - Obtener todos los sensores
// POST /api/sensors/soilMoisture    - Actualizar humedad
// POST /api/sensors/light           - Actualizar luz
// POST /api/sensors/temperature     - Actualizar temperatura
// GET  /api/cooler/status           - Estado del cooler
// POST /api/cooler/toggle           - Encender/Apagar
// POST /api/cooler/speed            - Cambiar velocidad

*/

// ============================================
// NOTAS IMPORTANTES
// ============================================
// 1. Instalar librería: ArduinoJson (Benoit Blanchon)
// 2. Reemplazar SSID y PASSWORD con tus datos
// 3. Ajustar pines según tu esquema de cableado
// 4. Los datos de sensores aquí son simulados
// 5. Reemplazar los valores con lecturas reales de tus sensores
// 6. El ESP32 debe estar en la misma red que la app
// 7. Usar la IP que aparece en el Serial Monitor

export {};
