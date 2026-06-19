# main.py — RaizDigital PoC (Aprovisionamiento de Wi-Fi y Auto-Discovery)

import network
import usocket as socket
import ujson
import time
import dht
import onewire
import ds18x20
import machine
from machine import ADC, Pin

# ── ARCHIVO DE CONFIGURACIÓN ────────────────────────────────────────────────
CONFIG_FILE = "config.json"

def load_config():
    try:
        with open(CONFIG_FILE, "r") as f:
            return ujson.loads(f.read())
    except:
        return {"ssid": "", "password": ""}

def save_config(ssid, password):
    with open(CONFIG_FILE, "w") as f:
        f.write(ujson.dumps({"ssid": ssid, "password": password}))

# ── MAPA DE PINES UNIFICADO ─────────────────────────────────────────────────
lights_pin    = Pin(18, Pin.OUT, value=0)
extractor_pin = Pin(21, Pin.OUT, value=0)
pump_pin      = Pin(5,  Pin.OUT, value=0)
heater_pin    = Pin(19, Pin.OUT, value=0)

PIN_MAP = {"lights": lights_pin, "extractor": extractor_pin, "pump": pump_pin, "heater": heater_pin}

soil_adc = ADC(Pin(32))   
soil_adc.atten(ADC.ATTN_11DB)
ph_adc = ADC(Pin(33))     
ph_adc.atten(ADC.ATTN_11DB)
ec_adc = ADC(Pin(35))     
ec_adc.atten(ADC.ATTN_11DB)

dht_sensor = dht.DHT11(Pin(14)) 
bus_onewire = onewire.OneWire(Pin(4))
ds_sensor = ds18x20.DS18X20(bus_onewire)
roms_ds = ds_sensor.scan()

# ── PRESETS COMERCIALES ─────────────────────────────────────────────────────
PRESETS = {
    "feminizada_vegetativo": {
        "HORAS_LUZ": 18, "TEMP_MAX": 26, "HUM_MAX": 70, "PH_MIN": 6.0, "PH_MAX": 6.5,
        "EC_MIN": 0.8, "EC_MAX": 1.2, "SUSTRATO_SECO": 1200, "TEMP_SUSTRATO_MIN": 20
    }
}
perfil_activo = PRESETS["feminizada_vegetativo"]

state = {
    "soilMoistureRaw": 0, "soilMoisturePct": 0, "temperature": 22.0, "humidity": 55.0,
    "waterTemp": 20.0, "ph": 6.0, "ec": 1.0,
    "lights": False, "extractor": False, "pump": False, "heater": False, "auto": True,
}

last_ds_request = 0
ds_converting = False

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
        if 0 <= t <= 60 and 0 <= h <= 100:
            state["temperature"] = t
            state["humidity"]    = h
    except Exception:
        pass

def read_ds18b20_non_blocking():
    global last_ds_request, ds_converting
    now = time.ticks_ms()
    if roms_ds:
        if not ds_converting:
            ds_sensor.convert_temp()
            last_ds_request = now
            ds_converting = True
        elif time.ticks_diff(now, last_ds_request) > 750:
            try: state["waterTemp"] = round(ds_sensor.read_temp(roms_ds[0]), 1)
            except Exception: pass
            ds_converting = False

def set_actuator(actuator, is_active, source="manual"):
    state[actuator] = is_active
    PIN_MAP[actuator].value(1 if is_active else 0)

def apply_preset_rules():
    if not state["auto"]: return
    hora_actual = time.localtime()[3] 
    if hora_actual < perfil_activo["HORAS_LUZ"] and not state["lights"]: set_actuator("lights", True, "auto")
    elif hora_actual >= perfil_activo["HORAS_LUZ"] and state["lights"]: set_actuator("lights", False, "auto")

    temp, hum = state["temperature"], state["humidity"]
    if temp > perfil_activo["TEMP_MAX"] or hum > perfil_activo["HUM_MAX"]:
        if not state["extractor"]: set_actuator("extractor", True, "auto")
    elif temp < (perfil_activo["TEMP_MAX"] - 2) and hum < (perfil_activo["HUM_MAX"] - 10):
        if state["extractor"]: set_actuator("extractor", False, "auto")

    if state["waterTemp"] < perfil_activo["TEMP_SUSTRATO_MIN"]:
        if not state["heater"]: set_actuator("heater", True, "auto")
    elif state["waterTemp"] >= (perfil_activo["TEMP_SUSTRATO_MIN"] + 2):
        if state["heater"]: set_actuator("heater", False, "auto")

    if state["soilMoistureRaw"] < perfil_activo["SUSTRATO_SECO"]:
        if not state["pump"]: set_actuator("pump", True, "auto")
    else:
        if state["pump"]: set_actuator("pump", False, "auto")

# ── WIFI DINÁMICO ───────────────────────────────────────────────────────────
def connect_wifi_or_ap():
    config = load_config()
    
    wlan = network.WLAN(network.STA_IF)
    wlan.active(False)
    time.sleep(0.5)
    wlan.active(True)
    wlan.disconnect()

    if config["ssid"]:
        print(f"Intentando conectar a '{config['ssid']}'...")
        wlan.connect(config["ssid"], config["password"])
        for _ in range(30): # Le damos un poco más de tiempo para conectar
            if wlan.isconnected():
                ip = wlan.ifconfig()[0]
                print(f"WiFi OK — IP: {ip}")
                return ip
            time.sleep(0.5)
        print("ERROR: No se pudo conectar. Las credenciales pueden estar mal o la red cayó.")
    
    print("Iniciando Modo Configuración (AP)...")
    wlan.active(False) 
    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    try: ap.config(essid="RaizDigital-Setup", password="raizdigital")
    except Exception: ap.config(ssid="RaizDigital-Setup", password="raizdigital")
    
    ip = ap.ifconfig()[0] 
    print(f">> ABRÍ TU CELULAR, CONECTATE AL WI-FI 'RaizDigital-Setup' (clave: raizdigital)")
    return ip

def json_response(conn, data, status="200 OK"):
    body = ujson.dumps(data)
    conn.send((f"HTTP/1.1 {status}\r\nContent-Type: application/json\r\n"
               f"Access-Control-Allow-Origin: *\r\nContent-Length: {len(body)}\r\n"
               f"Connection: close\r\n\r\n{body}").encode())

def handle_request(conn, method, path, body):
    # Endpoint para Auto-Discovery de la App
    if path == "/health": return json_response(conn, {"status": "ok"})
    
    if path == "/api/wifi" and method == "POST":
        if body and "ssid" in body:
            save_config(body["ssid"], body.get("password", ""))
            json_response(conn, {"success": True, "message": "Reiniciando..."})
            time.sleep(1)
            machine.reset()
        return json_response(conn, {"error": "Faltan datos"}, "400 Bad Request")

    if path == "/api/sensors" and method == "GET":
        return json_response(conn, {"soilMoisturePct": state["soilMoisturePct"], "temperature": state["temperature"], "humidity": state["humidity"], "waterTemp": state["waterTemp"], "ph": state["ph"], "ec": state["ec"]})

    if path == "/api/actuators" and method == "GET":
        return json_response(conn, {"extractor": state["extractor"], "pump": state["pump"], "auto": state["auto"]})

    if path.startswith("/api/actuators/") and method == "POST":
        actuator = path.split("/")[-1]
        if actuator not in PIN_MAP: return json_response(conn, {"error": "Actuador invalido"}, "400 Bad Request")
        set_actuator(actuator, body.get("isActive", False) if body else False, source="app")
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
        body = ujson.loads(body_raw) if body_raw.strip() else None
        return method, path, body
    except Exception: return None, None, None

def main():
    ip = connect_wifi_or_ap()
    if not ip: return

    addr = socket.getaddrinfo("0.0.0.0", 80)[0][-1]
    srv = socket.socket()
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(addr)
    srv.listen(5)
    srv.settimeout(0.02)
    
    print(f"\n✅ Servidor listo en http://{ip}/")
    print("El ESP32 ya debería ser visible para el Auto-Discovery de la app.\n")
    
    last_read, last_dht, last_print = 0, 0, 0

    while True:
        now = time.time()
        read_ds18b20_non_blocking()

        if now - last_read >= 1:
            read_analog_sensors()
            apply_preset_rules()
            last_read = now

        if now - last_dht >= 5:
            read_dht()
            last_dht = now
            
        if now - last_print >= 5:
            print(f"[{time.localtime()[3]}:00] Temp: {state['temperature']}°C | Hum: {state['humidity']}% | Suelo: {state['soilMoisturePct']}%")
            last_print = now

        try:
            conn, _ = srv.accept()
            conn.settimeout(2)
            try:
                raw = recv_request(conn)
                method, path, body = parse_request(raw)
                if method and path: handle_request(conn, method, path, body)
            except Exception: pass
            finally: conn.close()
        except OSError: pass

main()
