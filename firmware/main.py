# main.py — RaizDigital Firmware (Con Fotoperíodo y NTP)
import network
import usocket as socket
import ujson
import time
import dht
import onewire
import ds18x20
import machine
import ntptime
from machine import ADC, Pin

# ============================================================================
# 1. CONFIGURACIÓN Y CONSTANTES
# ============================================================================
CONFIG_FILE = "config.json"

def load_config():
    try:
        with open(CONFIG_FILE, "r") as f:
            conf = ujson.loads(f.read())
        
            if conf.get("light_start", 0) < 100:
                print("Detectada configuración antigua en horas. Convirtiendo a minutos...")
                conf["light_start"] = conf["light_start"] * 60
                conf["light_end"] = conf["light_end"] * 60
                save_config_dict(conf) 
            
            return conf
    except:
        # Si el archivo está corrupto o no existe, devolvemos los valores por defecto en minutos
        return {"ssid": "", "password": "", "light_start": 360, "light_end": 1440}

def save_config_dict(data):
    with open(CONFIG_FILE, "w") as f:
        f.write(ujson.dumps(data))

system_config = load_config()

PRESETS = {
    "feminizada_vegetativo": {
        "TEMP_MAX": 26, "HUM_MAX": 70, 
        "SUSTRATO_SECO": 1200, "TEMP_SUSTRATO_MIN": 20
    }
}

# ============================================================================
# 2. ESTADO GLOBAL DEL SISTEMA
# ============================================================================
perfil_activo = PRESETS["feminizada_vegetativo"]

state = {
    "soilMoistureRaw": 0, "soilMoisturePct": 0, "temperature": 22.0, "humidity": 55.0,
    "waterTemp": 20.0, "ph": 6.0, "ec": 1.0,
    "lights": False, "extractor": False, "pump": False, "heater": False, "auto": True,
}

ds_timing = {"last_request": 0, "converting": False}

# ============================================================================
# 3. CONFIGURACIÓN DE HARDWARE (PINOUT)
# ============================================================================
lights_pin    = Pin(18, Pin.OUT, value=0)
extractor_pin = Pin(21, Pin.OUT, value=0)
pump_pin      = Pin(5,  Pin.OUT, value=0)
heater_pin    = Pin(19, Pin.OUT, value=0)

PIN_MAP = {"lights": lights_pin, "extractor": extractor_pin, "pump": pump_pin, "heater": heater_pin}

soil_adc = ADC(Pin(32)); soil_adc.atten(ADC.ATTN_11DB)
ph_adc = ADC(Pin(33));   ph_adc.atten(ADC.ATTN_11DB)
ec_adc = ADC(Pin(35));   ec_adc.atten(ADC.ATTN_11DB)

dht_sensor = dht.DHT11(Pin(14)) 
bus_onewire = onewire.OneWire(Pin(4))
ds_sensor = ds18x20.DS18X20(bus_onewire)
roms_ds = ds_sensor.scan()

# ============================================================================
# 4. LECTURA DE SENSORES
# ============================================================================
def read_analog_sensors():
    sum_suelo = 0; sum_ph = 0; sum_ec = 0
    for _ in range(16):
        sum_suelo += soil_adc.read(); sum_ph += ph_adc.read(); sum_ec += ec_adc.read()
        time.sleep_ms(2) 
        
    val_suelo = sum_suelo / 16.0
    val_ph = sum_ph / 16.0
    val_ec = sum_ec / 16.0
    
    state["soilMoistureRaw"] = val_suelo
    state["soilMoisturePct"] = round((val_suelo / 4095.0) * 100.0, 1)
    state["ph"] = round((val_ph / 4095.0) * 14.0, 2)
    state["ec"] = round((val_ec / 4095.0) * 3.0, 2)

def read_dht():
    try:
        dht_sensor.measure()
        t, h = dht_sensor.temperature(), dht_sensor.humidity()
        if 0 <= t <= 60 and 0 <= h <= 100:
            state["temperature"] = t; state["humidity"] = h
    except: pass

def read_ds18b20_non_blocking():
    now = time.ticks_ms()
    if not roms_ds: return
    if not ds_timing["converting"]:
        ds_sensor.convert_temp()
        ds_timing["last_request"] = now; ds_timing["converting"] = True
    elif time.ticks_diff(now, ds_timing["last_request"]) > 750:
        try: state["waterTemp"] = round(ds_sensor.read_temp(roms_ds[0]), 1)
        except: pass
        ds_timing["converting"] = False

# ============================================================================
# 5. LÓGICA DE CONTROL (RELOJ Y REGLAS)
# ============================================================================
def set_actuator(actuator, is_active, source="manual"):
    state[actuator] = is_active
    PIN_MAP[actuator].value(1 if is_active else 0)

def apply_preset_rules():
    if not state["auto"]: return
    
    t = time.localtime()
    minutos_actuales = t[3] * 60 + t[4]
    
    start = system_config.get("light_start", 360)
    end = system_config.get("light_end", 1439) # Si viene 0, lo tratamos como 1440
    if end == 0: end = 1440
    
    # Lógica de fotoperíodo corregida
    if start < end:
        # Ejemplo: 06:00 a 20:00
        luz_encendida = start <= minutos_actuales < end
    else:
        # Ejemplo: 20:00 a 06:00 (cruza medianoche)
        luz_encendida = minutos_actuales >= start or minutos_actuales < 1440 or minutos_actuales < end

    # --- DEBUG MEJORADO ---
    if t[5] % 10 == 0: # Imprime cada 10 segundos para no saturar
        print(f"[DEBUG] Hora:{t[3]:02d}:{t[4]:02d} | Mins: {minutos_actuales} | Rango: {start}-{end} | Estado: {'ON' if luz_encendida else 'OFF'}")

    if luz_encendida and not state["lights"]:
        print(">> Acción: Encendiendo luz")
        set_actuator("lights", True, "auto")
    elif not luz_encendida and state["lights"]:
        print(">> Acción: Apagando luz")
        set_actuator("lights", False, "auto")
    if not state["auto"]: return
    
    # === FOTOPERÍODO EXACTO BASADO EN RTC ===
    hora_actual = time.localtime()[3] 
    start = system_config.get("light_start", 6)
    end = system_config.get("light_end", 24)
    
    if start < end:
        luz_encendida = start <= hora_actual < end
    else: # Si cruza la medianoche (ej: prende a las 20, apaga a las 6)
        luz_encendida = hora_actual >= start or hora_actual < end

    if luz_encendida and not state["lights"]: set_actuator("lights", True, "auto")
    elif not luz_encendida and state["lights"]: set_actuator("lights", False, "auto")

    # Clima y Riego
    temp = state["temperature"]; hum = state["humidity"]
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

# ============================================================================
# 6. GESTIÓN DE RED Y SINCRONIZACIÓN NTP
# ============================================================================
def connect_wifi_or_ap():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(False); time.sleep(0.5); wlan.active(True); wlan.disconnect()

    if system_config.get("ssid"):
        print(f"Conectando a '{system_config['ssid']}'...")
        wlan.connect(system_config["ssid"], system_config.get("password", ""))
        for _ in range(30): 
            if wlan.isconnected():
                ip = wlan.ifconfig()[0]
                
                # SINCRONIZACIÓN DE RELOJ (UTC-3)
                try:
                    print("Sincronizando reloj por internet (NTP)...")
                    ntptime.settime()
                    tm = time.localtime(time.time() - (3 * 3600)) # Ajuste de zona horaria
                    machine.RTC().datetime((tm[0], tm[1], tm[2], tm[6], tm[3], tm[4], tm[5], 0))
                    print(f"Reloj ajustado: {tm[3]:02d}:{tm[4]:02d} hrs")
                except Exception as e:
                    print("No se pudo sincronizar la hora:", e)

                return ip
            time.sleep(0.5)
    
    print("Iniciando AP de Configuración...")
    wlan.active(False) 
    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    try: ap.config(essid="RaizDigital-Setup", password="raizdigital")
    except: ap.config(ssid="RaizDigital-Setup", password="raizdigital")
    return ap.ifconfig()[0] 

# ============================================================================
# 7. SERVIDOR HTTP (RUTEO DE API)
# ============================================================================
def json_response(conn, data, status="200 OK"):
    body = ujson.dumps(data)
    conn.send((f"HTTP/1.1 {status}\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{body}").encode())

def handle_request(conn, method, path, body):
    global system_config
    if path == "/health": return json_response(conn, {"status": "ok"})
    
    # Configuración de Reloj
    elif path == "/api/config" and method == "GET":
        return json_response(conn, {"lightStart": system_config.get("light_start"), "lightEnd": system_config.get("light_end")})
        
    elif path == "/api/config" and method == "POST":
        if body and "lightStart" in body and "lightEnd" in body:
            system_config["light_start"] = int(body["lightStart"])
            system_config["light_end"] = int(body["lightEnd"])
            save_config_dict(system_config)
            return json_response(conn, {"success": True})
        return json_response(conn, {"error": "Datos inválidos"}, "400 Bad Request")

    # Configuración de Wi-Fi
    elif path == "/api/wifi" and method == "POST":
        if body and "ssid" in body:
            system_config["ssid"] = body["ssid"]
            system_config["password"] = body.get("password", "")
            save_config_dict(system_config)
            json_response(conn, {"success": True, "message": "Reiniciando..."})
            time.sleep(1); machine.reset()
        return json_response(conn, {"error": "Faltan datos"}, "400 Bad Request")

    elif path == "/api/sensors" and method == "GET":
        return json_response(conn, {"soilMoisturePct": state["soilMoisturePct"], "temperature": state["temperature"], "humidity": state["humidity"], "waterTemp": state["waterTemp"], "ph": state["ph"], "ec": state["ec"]})

    elif path == "/api/actuators" and method == "GET":
        return json_response(conn, {"extractor": state["extractor"], "pump": state["pump"], "lights": state["lights"], "auto": state["auto"]})

    elif path.startswith("/api/actuators/") and method == "POST":
        actuator = path.split("/")[-1]
        if actuator not in PIN_MAP: return json_response(conn, {"error": "Invalido"}, "400 Bad Request")
        set_actuator(actuator, body.get("isActive", False) if body else False, source="app")
        return json_response(conn, {"success": True})
        
    return json_response(conn, {"error": "Not found"}, "404 Not Found")

def parse_and_route_request(conn):
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
                            raw += chunk; body += chunk
                    except: pass
                    break
            header_text = header.decode("utf-8", "ignore")
            body_text = body.decode("utf-8", "ignore")
            method, path, *_ = header_text.split("\r\n")[0].split(" ")
            body_json = ujson.loads(body_text) if body_text.strip() else None
            if method and path: handle_request(conn, method, path, body_json)
    except: pass

# ============================================================================
# 8. MAIN LOOP
# ============================================================================
def main():
    ip = connect_wifi_or_ap()
    if not ip: return

    addr = socket.getaddrinfo("0.0.0.0", 80)[0][-1]
    srv = socket.socket()
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(addr); srv.listen(5); srv.settimeout(0.02) 
    
    last_read, last_dht, last_print = 0, 0, 0

    while True:
        now = time.time()
        read_ds18b20_non_blocking()

        if now - last_read >= 1:
            read_analog_sensors(); apply_preset_rules()
            last_read = now

        if now - last_dht >= 5:
            read_dht()
            last_dht = now
            
        if now - last_print >= 5:
            # Imprimimos la hora del reloj interno (RTC) para que veas que funciona
            hora_str = f"{time.localtime()[3]:02d}:{time.localtime()[4]:02d}"
            print(f"[{hora_str}] Temp: {state['temperature']}°C | Hum: {state['humidity']}% | Suelo: {state['soilMoisturePct']}% | pH: {state['ph']} | EC: {state['ec']}")
            last_print = now

        try:
            conn, _ = srv.accept()
            conn.settimeout(2)
            try: parse_and_route_request(conn)
            finally: conn.close()
        except OSError: pass 

main()