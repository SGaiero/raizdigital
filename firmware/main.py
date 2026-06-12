# main.py — RaizDigital PoC (Versión Integrada con Presets)

import network
import usocket as socket
import ujson
import time
import dht
import onewire
import ds18x20
from machine import ADC, Pin

# ── WIFI ────────────────────────────────────────────────────────────────────
WIFI_SSID     = "CITECCA"
WIFI_PASSWORD = "c1t3cc4*"

# ── MAPA DE PINES UNIFICADO ─────────────────────────────────────────────────
# Actuadores
lights_pin    = Pin(18, Pin.OUT, value=0) # Luces
extractor_pin = Pin(21, Pin.OUT, value=0) # Extractor / Clima
pump_pin      = Pin(5,  Pin.OUT, value=0) # Riego (Bomba)
heater_pin    = Pin(19, Pin.OUT, value=0) # Calefacción (Manta)

PIN_MAP = {
    "lights": lights_pin, 
    "extractor": extractor_pin, 
    "pump": pump_pin, 
    "heater": heater_pin
}

# Sensores Analógicos
soil_adc = ADC(Pin(32))   # Humedad de Suelo
soil_adc.atten(ADC.ATTN_11DB)
ph_adc = ADC(Pin(33))     # Sensor pH simulado
ph_adc.atten(ADC.ATTN_11DB)
ec_adc = ADC(Pin(35))     # Sensor EC simulado
ec_adc.atten(ADC.ATTN_11DB)

# Sensores Digitales
dht_sensor = dht.DHT11(Pin(14)) # Aire (Usando DHT22)
bus_onewire = onewire.OneWire(Pin(4))
ds_sensor = ds18x20.DS18X20(bus_onewire)
roms_ds = ds_sensor.scan()

# ── ARQUITECTURA DE PRESETS COMERCIALES ─────────────────────────────────────
PRESETS = {
    "feminizada_vegetativo": {
        "HORAS_LUZ": 18,
        "TEMP_MAX": 26,
        "HUM_MAX": 70,
        "PH_MIN": 6.0,
        "PH_MAX": 6.5,
        "EC_MIN": 0.8,
        "EC_MAX": 1.2,
        "SUSTRATO_SECO": 1200, # Valor crudo del ADC
        "TEMP_SUSTRATO_MIN": 20
    },
    "feminizada_floracion": {
        "HORAS_LUZ": 12,
        "TEMP_MAX": 24,
        "HUM_MAX": 50,
        "PH_MIN": 6.0,
        "PH_MAX": 6.5,
        "EC_MIN": 1.5,
        "EC_MAX": 2.0,
        "SUSTRATO_SECO": 1500, # Valor crudo del ADC
        "TEMP_SUSTRATO_MIN": 21
    }
}
perfil_activo = PRESETS["feminizada_vegetativo"]

# ── ESTADO GLOBAL ───────────────────────────────────────────────────────────
state = {
    "soilMoistureRaw": 0,
    "soilMoisturePct": 0,
    "temperature": 22.0,
    "humidity": 55.0,
    "waterTemp": 20.0,
    "ph": 6.0,
    "ec": 1.0,
    "lights": False,
    "extractor": False,
    "pump": False,
    "heater": False,
    "auto": True,
}

# ── VARIABLES GLOBALES PARA CONTROL ASÍNCRONO ──────────────────────────────
last_ds_request = 0
ds_converting = False

# ── LECTURA DE SENSORES ─────────────────────────────────────────────────────
def read_analog_sensors():
    val_suelo = soil_adc.read()
    state["soilMoistureRaw"] = val_suelo
    state["soilMoisturePct"] = round((val_suelo / 4095) * 100, 1)
    state["ph"]              = round(4.0 + (ph_adc.read() / 4095.0) * 4.0, 2)
    state["ec"]              = round((ec_adc.read() / 4095.0) * 3.0, 2)

def read_dht():
    try:
        dht_sensor.measure()
        t, h = dht_sensor.temperature(), dht_sensor.humidity()
        print(f"putoooo {t}, {h}")
        if 0 <= t <= 60 and 0 <= h <= 100:
            state["temperature"] = t
            state["humidity"]    = h
    except Exception as e:
        print(f"Error leyendo DHT22: {e}") # Acá vas a ver por qué falla

def read_ds18b20_non_blocking():
    global last_ds_request, ds_converting
    now = time.ticks_ms()
    
    if roms_ds:
        if not ds_converting:
            ds_sensor.convert_temp()
            last_ds_request = now
            ds_converting = True
        elif time.ticks_diff(now, last_ds_request) > 750:
            try:
                state["waterTemp"] = round(ds_sensor.read_temp(roms_ds[0]), 1)
            except Exception:
                pass
            ds_converting = False

def check_chemistry_alerts():
    # Solo imprime alertas en consola, útil para telemetría
    if state["ph"] < perfil_activo["PH_MIN"]:
        print(">> ALERTA: pH muy ácido. Añadir pH Up.")
    elif state["ph"] > perfil_activo["PH_MAX"]:
        print(">> ALERTA: pH muy alcalino. Añadir pH Down.")

    if state["ec"] < perfil_activo["EC_MIN"]:
        print(">> ALERTA: EC baja. Faltan nutrientes.")
    elif state["ec"] > perfil_activo["EC_MAX"]:
        print(">> ALERTA: EC alta. Peligro de sobrefertilización. Lavar raíces.")

# ── LÓGICA DE AUTOMATIZACIÓN (PRESETS) ──────────────────────────────────────
def set_actuator(actuator, is_active, source="manual"):
    state[actuator] = is_active
    PIN_MAP[actuator].value(1 if is_active else 0)
    print(f"[{source}] {actuator.upper()} {'ON' if is_active else 'OFF'}")

def apply_preset_rules():
    if not state["auto"]:
        return

    # 1. Iluminación (Fotoperiodo)
    hora_actual = time.localtime()[3] 
    luz_debe_estar_on = hora_actual < perfil_activo["HORAS_LUZ"]
    if luz_debe_estar_on and not state["lights"]:
        set_actuator("lights", True, "auto")
    elif not luz_debe_estar_on and state["lights"]:
        set_actuator("lights", False, "auto")

    # 2. Extracción (Clima)
    temp, hum = state["temperature"], state["humidity"]
    if temp > perfil_activo["TEMP_MAX"] or hum > perfil_activo["HUM_MAX"]:
        if not state["extractor"]: set_actuator("extractor", True, "auto")
    elif temp < (perfil_activo["TEMP_MAX"] - 2) and hum < (perfil_activo["HUM_MAX"] - 10):
        if state["extractor"]: set_actuator("extractor", False, "auto")

    # 3. Calefacción (Sustrato)
    temp_sustrato = state["waterTemp"]
    if temp_sustrato < perfil_activo["TEMP_SUSTRATO_MIN"]:
        if not state["heater"]: set_actuator("heater", True, "auto")
    elif temp_sustrato >= (perfil_activo["TEMP_SUSTRATO_MIN"] + 2):
        if state["heater"]: set_actuator("heater", False, "auto")

    # 4. Riego
    if state["soilMoistureRaw"] < perfil_activo["SUSTRATO_SECO"]:
        if not state["pump"]: set_actuator("pump", True, "auto")
    else:
        if state["pump"]: set_actuator("pump", False, "auto")


# ── WIFI Y HTTP API ─────────────────────────────────────────────────────────
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print(f"Conectando a '{WIFI_SSID}'...")
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)
        for _ in range(20):
            if wlan.isconnected(): break
            time.sleep(0.5)
    if wlan.isconnected():
        ip = wlan.ifconfig()[0]
        print(f"WiFi OK — IP: {ip}")
        return ip
    print("ERROR: No se pudo conectar a WiFi")
    return None

def json_response(conn, data, status="200 OK"):
    body = ujson.dumps(data)
    conn.send((
        f"HTTP/1.1 {status}\r\n"
        f"Content-Type: application/json\r\n"
        f"Access-Control-Allow-Origin: *\r\n"
        f"Content-Length: {len(body)}\r\n"
        f"Connection: close\r\n\r\n{body}"
    ).encode())

def handle_request(conn, method, path, body):
    if path == "/health":
        return json_response(conn, {"status": "ok"})

    if path == "/api/sensors" and method == "GET":
        return json_response(conn, {
            "soilMoisturePct": state["soilMoisturePct"],
            "soilMoistureRaw": state["soilMoistureRaw"],
            "temperature":     state["temperature"],
            "humidity":        state["humidity"],
            "waterTemp":       state["waterTemp"],
            "ph":              state["ph"],
            "ec":              state["ec"]
        })

    if path == "/api/actuators" and method == "GET":
        return json_response(conn, {
            "lights":    state["lights"],
            "extractor": state["extractor"],
            "pump":      state["pump"],
            "heater":    state["heater"],
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
        
        is_active = body.get("isActive", False) if body else False
        set_actuator(actuator, is_active, source="app")
        return json_response(conn, {"success": True})

    return json_response(conn, {"error": "Not found"}, "404 Not Found")

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
                            if not chunk: break
                            raw += chunk
                            body += chunk
                    except Exception: pass
                    break
    except OSError: pass
    return raw.decode("utf-8", "ignore")

def parse_request(raw):
    try:
        header, _, body_raw = raw.partition("\r\n\r\n")
        method, path, *_ = header.split("\r\n")[0].split(" ")
        body = None
        if body_raw.strip():
            try: body = ujson.loads(body_raw)
            except Exception: pass
        return method, path, body
    except Exception:
        return None, None, None

# ── LOOP PRINCIPAL ──────────────────────────────────────────────────────────
def main():
    ip = connect_wifi()
    if not ip: return

    addr = socket.getaddrinfo("0.0.0.0", 80)[0][-1]
    srv = socket.socket()
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(addr)
    srv.listen(5)
    srv.settimeout(0.02)
    print(f"Servidor API y Automatización en http://{ip}/")

    last_read = 0
    last_dht  = 0
    last_print = 0

    while True:
        now = time.time()
        
        # Lecturas asíncronas
        read_ds18b20_non_blocking()

        if now - last_read >= 1:
            read_analog_sensors()
            apply_preset_rules()
            last_read = now

        if now - last_dht >= 5:
            read_dht()
            last_dht = now
            
        if now - last_print >= 5:
            hora_actual = time.localtime()[3]
            print(f"Hora: {hora_actual}:00 | Aire: {state['temperature']}°C {state['humidity']}% | Suelo: {state['soilMoistureRaw']} | Sustrato: {state['waterTemp']}°C")
            print(f"Química -> pH: {state['ph']} | EC: {state['ec']} mS/cm")
            check_chemistry_alerts()
            print("-" * 50)
            last_print = now

        try:
            conn, _ = srv.accept()
            conn.settimeout(2)
            try:
                raw = recv_request(conn)
                method, path, body = parse_request(raw)
                if method and path:
                    handle_request(conn, method, path, body)
            except Exception as e:
                print(f"Error HTTP: {e}")
            finally:
                conn.close()
        except OSError:
            pass

main()
