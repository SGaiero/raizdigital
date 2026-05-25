# main_test.py — RaizDigital PoC
# GPIO 32 → Potenciómetro 10k (humedad suelo)
# GPIO 34 → LDR fotoresistencia  (luz)
# GPIO 18 → LED Rojo   (Luces)
# GPIO 21 → LED Amarillo (Extractor)
# GPIO  5 → LED Verde  (Bomba)

import network
import usocket as socket
import ujson
import time
import dht
from machine import ADC, Pin

# ── WIFI ────────────────────────────────────────────────────────────────────
WIFI_SSID     = "CITECCA"
WIFI_PASSWORD = "c1t3cc4*"

# ── HARDWARE ─────────────────────────────────────────────────────────────────
soil_adc = ADC(Pin(32))
soil_adc.atten(ADC.ATTN_11DB)
soil_adc.width(ADC.WIDTH_12BIT)

light_adc = ADC(Pin(34))
light_adc.atten(ADC.ATTN_11DB)
light_adc.width(ADC.WIDTH_12BIT)

dht_sensor    = dht.DHT11(Pin(15))

lights_pin    = Pin(18, Pin.OUT, value=0)
extractor_pin = Pin(21, Pin.OUT, value=0)
pump_pin      = Pin(5,  Pin.OUT, value=0)

PIN_MAP = {"lights": lights_pin, "extractor": extractor_pin, "pump": pump_pin}

# ── ESTADO ───────────────────────────────────────────────────────────────────
state = {
    "soilMoisture": 0,
    "light": 0,
    "temperature": 22.0,   # pendiente: DHT22
    "humidity": 55.0,      # pendiente: DHT22
    "waterTemp": 20.0,     # pendiente: DS18B20
    "lights": False,
    "extractor": False,
    "pump": False,
    "auto": True,          # False = control manual desde la app
}

# ── REGLAS DE AUTOMATIZACIÓN ─────────────────────────────────────────────────
# Cada regla: (sensor, operador, umbral_on, umbral_off, actuador)
# operador "<" → encender si sensor < umbral_on, apagar si sensor > umbral_off
# operador ">" → encender si sensor > umbral_on, apagar si sensor < umbral_off
RULES = [
    # Luces: encender si luz < 3000, apagar si luz > 4000
    {"sensor": "light",       "op": "<", "on": 3000,  "off": 4000,  "actuator": "lights"},
    # Descomentar cuando estén conectados los sensores reales:
    # {"sensor": "soilMoisture","op": "<", "on": 40,    "off": 70,    "actuator": "pump"},
    # {"sensor": "temperature", "op": ">", "on": 28.0,  "off": 24.0,  "actuator": "extractor"},
]


# ── LECTURA DE SENSORES ───────────────────────────────────────────────────────
def read_sensors():
    state["soilMoisture"] = round((soil_adc.read() / 4095) * 100, 1)
    state["light"]        = round((light_adc.read() / 4095) * 15000)

def read_dht():
    try:
        dht_sensor.measure()
        t = dht_sensor.temperature()
        h = dht_sensor.humidity()
        if 0 <= t <= 60 and 0 <= h <= 100:
            state["temperature"] = t
            state["humidity"]    = h
    except Exception:
        pass  # mantiene el último valor válido


# ── LÓGICA DE AUTOMATIZACIÓN ──────────────────────────────────────────────────
def apply_rules():
    if not state["auto"]:
        return
    for rule in RULES:
        value    = state[rule["sensor"]]
        actuator = rule["actuator"]
        active   = state[actuator]
        if rule["op"] == "<":
            if value < rule["on"] and not active:
                set_actuator(actuator, True,  source="auto")
            elif value > rule["off"] and active:
                set_actuator(actuator, False, source="auto")
        elif rule["op"] == ">":
            if value > rule["on"] and not active:
                set_actuator(actuator, True,  source="auto")
            elif value < rule["off"] and active:
                set_actuator(actuator, False, source="auto")


def set_actuator(actuator, is_active, source="manual"):
    state[actuator] = is_active
    PIN_MAP[actuator].value(1 if is_active else 0)
    print(f"[{source}] {actuator.upper()} {'ON' if is_active else 'OFF'}")


# ── WIFI ──────────────────────────────────────────────────────────────────────
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print(f"Conectando a '{WIFI_SSID}'...")
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


# ── HTTP ──────────────────────────────────────────────────────────────────────
def recv_request(conn):
    raw = b""
    try:
        raw = conn.recv(2048)
        if b"\r\n\r\n" in raw:
            header, _, body = raw.partition(b"\r\n\r\n")
            for line in header.split(b"\r\n"):
                if line.lower().startswith(b"content-length:"):
                    try:
                        cl = int(line.split(b":")[1].strip())
                        while len(body) < cl:
                            chunk = conn.recv(cl - len(body))
                            if not chunk:
                                break
                            raw += chunk
                            body += chunk
                    except Exception:
                        pass
                    break
    except OSError:
        pass
    return raw.decode("utf-8", "ignore")


def parse_request(raw):
    try:
        header, _, body_raw = raw.partition("\r\n\r\n")
        method, path, *_ = header.split("\r\n")[0].split(" ")
        body = None
        if body_raw.strip():
            try:
                body = ujson.loads(body_raw)
            except Exception:
                pass
        return method, path, body
    except Exception:
        return None, None, None


def json_response(conn, data, status="200 OK"):
    body = ujson.dumps(data)
    conn.send((
        f"HTTP/1.1 {status}\r\n"
        f"Content-Type: application/json\r\n"
        f"Access-Control-Allow-Origin: *\r\n"
        f"Content-Length: {len(body)}\r\n"
        f"Connection: close\r\n"
        f"\r\n"
        f"{body}"
    ).encode())


def handle_request(conn, method, path, body):
    if path == "/health":
        return json_response(conn, {"status": "ok"})

    if path == "/api/sensors" and method == "GET":
        return json_response(conn, {
            "soilMoisture": state["soilMoisture"],
            "light":        state["light"],
            "temperature":  state["temperature"],
            "humidity":     state["humidity"],
            "waterTemp":    state["waterTemp"],
        })

    if path == "/api/actuators" and method == "GET":
        return json_response(conn, {
            "lights":    state["lights"],
            "extractor": state["extractor"],
            "pump":      state["pump"],
            "auto":      state["auto"],
        })

    if path.startswith("/api/actuators/") and method == "POST":
        actuator = path.split("/")[-1]
        if actuator == "auto":
            state["auto"] = body.get("isActive", True) if body else True
            print(f"[app] AUTO {'ON' if state['auto'] else 'OFF'}")
            return json_response(conn, {"success": True})
        if actuator not in PIN_MAP:
            return json_response(conn, {"error": "Actuador invalido"}, "400 Bad Request")
        # Control manual desactiva el modo auto para ese actuador
        is_active = body.get("isActive", False) if body else False
        set_actuator(actuator, is_active, source="app")
        return json_response(conn, {"success": True})

    return json_response(conn, {"error": "Not found"}, "404 Not Found")


# ── LOOP PRINCIPAL ────────────────────────────────────────────────────────────
def main():
    ip = connect_wifi()
    if not ip:
        return

    addr = socket.getaddrinfo("0.0.0.0", 80)[0][-1]
    srv = socket.socket()
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(addr)
    srv.listen(5)
    srv.settimeout(0.02)
    print(f"Servidor en http://{ip}/")

    last_read = 0
    last_dht  = 0
    while True:
        now = time.time()
        if now - last_read >= 1:
            read_sensors()
            apply_rules()
            print(f"Suelo: {state['soilMoisture']}%  Luz: {state['light']} lux | Aire — Temp: {state['temperature']}°C  Hum: {state['humidity']}%")
            last_read = now
        if now - last_dht >= 5:
            read_dht()
            last_dht = now

        try:
            conn, _ = srv.accept()
            conn.settimeout(2)
            try:
                raw = recv_request(conn)
                method, path, body = parse_request(raw)
                if method and path:
                    handle_request(conn, method, path, body)
            except Exception as e:
                print(f"Error: {e}")
            finally:
                conn.close()
        except OSError:
            pass


main()
