# RaizDigital - Firmware MicroPython para ESP32 DevKit 30 pines
# Arquitectura: capa HTTP + máquina de estados con histéresis
#
# Pines:
#   GPIO 32 → ADC1_CH4  - Higrómetro/Potenciómetro 10k (Humedad suelo)
#   GPIO 34 → ADC1_CH6  - LDR/Potenciómetro 5k        (Luz)
#   GPIO 15 → DHT22                                     (Temp. + Humedad aire)
#   GPIO  4 → 1-Wire DS18B20                            (Temp. agua/sustrato)
#   GPIO 16 → LED/Relé SSR                              (Luces de cultivo)
#   GPIO 17 → LED/Relé SSR                              (Extractor de aire)
#   GPIO  5 → LED/Relé SSR                              (Bomba de agua)
#
# Seguridad: resistencias de 220Ω en serie con cada LED (GPIOs soportan max 12 mA)
#            DS18B20 requiere pull-up de 4.7kΩ entre DATA y 3.3V
#            Tierra común entre ESP32, sensores y actuadores

import network
import usocket as socket
import ujson
import machine
import time
import dht
import onewire
import ds18x20
from machine import ADC, Pin

# ── CONFIGURACIÓN WiFi ──────────────────────────────────────────────────────
WIFI_SSID = "CITECCA"
WIFI_PASSWORD = "c1t3cc4*"

# ── PINES ───────────────────────────────────────────────────────────────────
soil_adc = ADC(Pin(32))
light_adc = ADC(Pin(34))
dht_sensor = dht.DHT22(Pin(15))
ow_bus = onewire.OneWire(Pin(4))
ds18 = ds18x20.DS18X20(ow_bus)

lights_pin = Pin(18, Pin.OUT, value=0)
extractor_pin = Pin(21, Pin.OUT, value=0)
pump_pin = Pin(5, Pin.OUT, value=0)

# ADC: atenuación 11 dB → rango 0–3.6 V, resolución 12 bits (0–4095)
soil_adc.atten(ADC.ATTN_11DB)
soil_adc.width(ADC.WIDTH_12BIT)
light_adc.atten(ADC.ATTN_11DB)
light_adc.width(ADC.WIDTH_12BIT)

# ── UMBRALES DE HISTÉRESIS ──────────────────────────────────────────────────
# Bomba: encender si suelo < LOW, apagar si suelo > HIGH
SOIL_LOW = 40
SOIL_HIGH = 70

# Extractor: encender si temp. aire > HIGH, apagar si < LOW
TEMP_HIGH = 28.0
TEMP_LOW = 24.0

# Luces: encender si luz < LOW, apagar si > HIGH
LIGHT_LOW = 5000
LIGHT_HIGH = 8000

# ── ESTADO COMPARTIDO ───────────────────────────────────────────────────────
state = {
    "soilMoisture": 0,
    "light": 0,
    "temperature": 0.0,
    "humidity": 0.0,
    "waterTemp": 0.0,
    "lights": False,
    "extractor": False,
    "pump": False,
    # Overrides manuales (usados desde la app para testing)
    "_manual_soil": None,
    "_manual_light": None,
    "_manual_temp": None,
    "_manual_humidity": None,
    "_manual_waterTemp": None,
}

ds18_roms = []


def scan_ds18():
    global ds18_roms
    ds18_roms = ds18.scan()
    if ds18_roms:
        print(f"DS18B20 encontrado: {ds18_roms[0]}")
    else:
        print("ADVERTENCIA: DS18B20 no encontrado. Verificá el pull-up de 4.7kΩ en GPIO 4.")


def read_sensors():
    # Humedad del suelo (0–4095 → 0–100%)
    if state["_manual_soil"] is not None:
        state["soilMoisture"] = state["_manual_soil"]
    else:
        raw = soil_adc.read()
        state["soilMoisture"] = round((raw / 4095) * 100, 1)

    # Luz (0–4095 → 0–15000 lux aproximado)
    if state["_manual_light"] is not None:
        state["light"] = state["_manual_light"]
    else:
        raw = light_adc.read()
        state["light"] = round((raw / 4095) * 15000)

    # DHT22: temperatura y humedad del aire
    if state["_manual_temp"] is not None:
        state["temperature"] = state["_manual_temp"]
    if state["_manual_humidity"] is not None:
        state["humidity"] = state["_manual_humidity"]
    if state["_manual_temp"] is None or state["_manual_humidity"] is None:
        try:
            dht_sensor.measure()
            if state["_manual_temp"] is None:
                state["temperature"] = dht_sensor.temperature()
            if state["_manual_humidity"] is None:
                state["humidity"] = dht_sensor.humidity()
        except Exception as e:
            print(f"DHT22 error: {e}")

    # DS18B20: temperatura agua/sustrato
    if state["_manual_waterTemp"] is not None:
        state["waterTemp"] = state["_manual_waterTemp"]
    elif ds18_roms:
        try:
            ds18.convert_temp()
            time.sleep_ms(750)  # espera conversión 12-bit (máx 750 ms)
            state["waterTemp"] = round(ds18.read_temp(ds18_roms[0]), 2)
        except Exception as e:
            print(f"DS18B20 error: {e}")


def apply_hysteresis():
    # Bomba de agua (histéresis sobre humedad del suelo)
    if state["soilMoisture"] < SOIL_LOW and not state["pump"]:
        state["pump"] = True
        pump_pin.on()
        print(f"BOMBA ON  (suelo: {state['soilMoisture']}%)")
    elif state["soilMoisture"] > SOIL_HIGH and state["pump"]:
        state["pump"] = False
        pump_pin.off()
        print(f"BOMBA OFF (suelo: {state['soilMoisture']}%)")

    # Extractor (histéresis sobre temperatura del aire)
    if state["temperature"] > TEMP_HIGH and not state["extractor"]:
        state["extractor"] = True
        extractor_pin.on()
        print(f"EXTRACTOR ON  (temp: {state['temperature']}°C)")
    elif state["temperature"] < TEMP_LOW and state["extractor"]:
        state["extractor"] = False
        extractor_pin.off()
        print(f"EXTRACTOR OFF (temp: {state['temperature']}°C)")

    # Luces de cultivo (histéresis sobre intensidad lumínica)
    if state["light"] < LIGHT_LOW and not state["lights"]:
        state["lights"] = True
        lights_pin.on()
        print(f"LUCES ON  (luz: {state['light']} lux)")
    elif state["light"] > LIGHT_HIGH and state["lights"]:
        state["lights"] = False
        lights_pin.off()
        print(f"LUCES OFF (luz: {state['light']} lux)")


def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print(f"Conectando a WiFi '{WIFI_SSID}'...")
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)
        for _ in range(20):
            if wlan.isconnected():
                break
            time.sleep(0.5)
    if wlan.isconnected():
        ip = wlan.ifconfig()[0]
        print(f"WiFi OK — IP: {ip}")
        return ip
    print("ERROR: No se pudo conectar a WiFi")
    return None


# ── HTTP SERVER ─────────────────────────────────────────────────────────────

def json_response(conn, data, status="200 OK"):
    body = ujson.dumps(data)
    conn.send(
        f"HTTP/1.1 {status}\r\n"
        f"Content-Type: application/json\r\n"
        f"Access-Control-Allow-Origin: *\r\n"
        f"Content-Length: {len(body)}\r\n"
        f"\r\n"
        f"{body}".encode()
    )


def parse_request(raw):
    try:
        header, _, body_raw = raw.partition("\r\n\r\n")
        first_line = header.split("\r\n")[0]
        method, path, *_ = first_line.split(" ")
        body = None
        if body_raw:
            try:
                body = ujson.loads(body_raw)
            except Exception:
                pass
        return method, path, body
    except Exception:
        return None, None, None


def handle_request(conn, method, path, body):
    # GET /health
    if path == "/health":
        return json_response(conn, {"status": "ok", "ip": conn.getpeername()})

    # GET /api/sensors
    if path == "/api/sensors" and method == "GET":
        return json_response(conn, {
            "soilMoisture": state["soilMoisture"],
            "light": state["light"],
            "temperature": state["temperature"],
            "humidity": state["humidity"],
            "waterTemp": state["waterTemp"],
        })

    # POST /api/sensors/<sensor>  (override manual para testing)
    if path.startswith("/api/sensors/") and method == "POST" and body:
        sensor = path.split("/")[-1]
        value = body.get("value")
        if sensor == "soilMoisture":
            state["_manual_soil"] = value
        elif sensor == "light":
            state["_manual_light"] = value
        elif sensor == "temperature":
            state["_manual_temp"] = value
        elif sensor == "humidity":
            state["_manual_humidity"] = value
        elif sensor == "waterTemp":
            state["_manual_waterTemp"] = value
        else:
            return json_response(conn, {"error": "Sensor desconocido"}, "400 Bad Request")
        # Volver a aplicar histéresis con el nuevo valor
        read_sensors()
        apply_hysteresis()
        return json_response(conn, {"success": True})

    # GET /api/actuators
    if path == "/api/actuators" and method == "GET":
        return json_response(conn, {
            "lights": state["lights"],
            "extractor": state["extractor"],
            "pump": state["pump"],
        })

    # POST /api/actuators/<actuator>
    if path.startswith("/api/actuators/") and method == "POST" and body:
        actuator = path.split("/")[-1]
        if actuator not in ("lights", "extractor", "pump"):
            return json_response(conn, {"error": "Actuador inválido"}, "400 Bad Request")
        is_active = body.get("isActive", False)
        state[actuator] = is_active
        pin_map = {"lights": lights_pin, "extractor": extractor_pin, "pump": pump_pin}
        pin_map[actuator].value(1 if is_active else 0)
        return json_response(conn, {"success": True})

    return json_response(conn, {"error": "Not Found"}, "404 Not Found")


def start_server():
    addr = socket.getaddrinfo("0.0.0.0", 80)[0][-1]
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(addr)
    s.listen(5)
    s.settimeout(0.05)  # non-blocking: 50 ms
    return s


# ── LOOP PRINCIPAL ──────────────────────────────────────────────────────────

def main():
    ip = connect_wifi()
    if not ip:
        machine.reset()

    scan_ds18()
    srv = start_server()
    print(f"Servidor HTTP en http://{ip}/")

    last_sensor_tick = 0
    SENSOR_INTERVAL = 2  # segundos

    while True:
        now = time.time()
        if now - last_sensor_tick >= SENSOR_INTERVAL:
            read_sensors()
            apply_hysteresis()
            last_sensor_tick = now

        try:
            conn, addr = srv.accept()
            conn.settimeout(3)
            try:
                raw = conn.recv(2048).decode("utf-8", "ignore")
                method, path, body = parse_request(raw)
                if method and path:
                    handle_request(conn, method, path, body)
            except Exception as e:
                print(f"Request error: {e}")
            finally:
                conn.close()
        except OSError:
            pass  # timeout normal, no hay petición pendiente


main()
