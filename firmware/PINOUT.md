# RaizDigital — Guía de Conexión (Pinout) ESP32 DevKit 30 pines

## Diagrama de pines

```
ESP32 DevKit (30 pines)
         ┌───────────┐
    3.3V │ 3V3   GND │ GND
     EN  │ EN    D23 │
     SVP │ VP    D22 │
     SVN │ VN    TX0 │
    D34  │ 34    RX0 │
    D35  │ 35    D21 │
  ←D32→  │ 32    D19 │
    D33  │ 33    D18 │
    D25  │ 25    D5  │→ LED BOMBA
    D26  │ 26    TX2 │
    D27  │ 27    RX2 │
    D14  │ 14    D4  │← DS18B20 DATA
    D12  │ 12    D2  │
    D13  │ 13    D15 │← DHT22 DATA
    GND  │ GND   D16 │→ LED LUCES
    VIN  │ VIN   D17 │→ LED EXTRACTOR
         └───────────┘
         (vista superior)
```

---

## Tabla de conexiones

| GPIO | Pin físico | Función | Componente | Notas |
|------|-----------|---------|-----------|-------|
| 32 | 32 | ADC1_CH4 (entrada) | Potenciómetro 10kΩ (simula higrómetro) | Solo ADC1 — no interfiere con WiFi |
| 34 | 34 | ADC1_CH6 (entrada) | Potenciómetro 5kΩ (simula LDR) | Solo entrada, sin pull-up interno |
| 15 | D15 | GPIO (entrada) | DHT22 — pin DATA | Pull-up de 10kΩ a 3.3V recomendado |
| 4 | D4 | 1-Wire (entrada/salida) | DS18B20 — pin DATA | **Obligatorio pull-up 4.7kΩ a 3.3V** |
| 16 | D16 | GPIO (salida) | LED Luces (simula Relé SSR) | Resistencia 220Ω en serie |
| 17 | D17 | GPIO (salida) | LED Extractor (simula Relé SSR) | Resistencia 220Ω en serie |
| 5 | D5 | GPIO (salida) | LED Bomba (simula Relé SSR) | Resistencia 220Ω en serie |

---

## Diagramas de conexión por componente

### 1. Potenciómetro 10kΩ — Humedad del suelo (GPIO 32)

```
3.3V ──────┬─── Pin izquierdo del potenciómetro
           │
           ├─── Pin central (cursor) ──→ GPIO 32 (ADC)
           │
GND  ──────┴─── Pin derecho del potenciómetro
```

> Girar el potenciómetro simula el rango: todo a la izq. = 0% húmedo (3.3V), todo a la der. = 100% húmedo (0V).
> Nota: un higrómetro capacitivo real tiene lógica invertida — ajustar el mapeo en firmware si es necesario.

---

### 2. Potenciómetro 5kΩ — Intensidad lumínica (GPIO 34)

```
3.3V ──────┬─── Pin izquierdo del potenciómetro
           │
           ├─── Pin central (cursor) ──→ GPIO 34 (ADC)
           │
GND  ──────┴─── Pin derecho del potenciómetro
```

> GPIO 34 es entrada únicamente (no tiene pull-up/down interno).

---

### 3. DHT22 — Temperatura y Humedad del aire (GPIO 15)

```
3.3V ────┬──────────────── VCC (pin 1)
         │
        10kΩ (pull-up recomendado)
         │
GPIO 15 ─┴──────────────── DATA (pin 2)
                           (pin 3 sin conexión en versión 3-pin)
GND  ───────────────────── GND (pin 4)
```

> El DHT22 necesita al menos 2 segundos entre lecturas.
> Usar versión de 3 o 4 pines, verificar hoja de datos del módulo.

---

### 4. DS18B20 — Temperatura agua/sustrato (GPIO 4) ⚠️ CRÍTICO

```
3.3V ────┬──────────────── VCC (pin rojo)
         │
        4.7kΩ  ← OBLIGATORIO, sin esto el protocolo 1-Wire no funciona
         │
GPIO  4 ─┴──────────────── DATA (pin amarillo)

GND  ───────────────────── GND (pin negro)
```

> **Sin la resistencia de 4.7kΩ el sensor no responde.**
> Múltiples DS18B20 pueden compartir el mismo bus 1-Wire; el firmware escanea la ROM de cada uno.

---

### 5. LEDs con resistencias limitadoras (GPIOs 16, 17, 5)

Mismo esquema para los tres actuadores:

```
GPIO 16/17/5 ──[ 220Ω ]──┬── Ánodo (+) del LED
                          │
                         LED
                          │
GND ──────────────────────┴── Cátodo (-) del LED
```

> Los GPIO del ESP32 soportan máximo **12 mA**. Con 3.3V y un LED rojo típico (Vf ≈ 2V):
> R = (3.3V − 2V) / 0.012A ≈ 108Ω → usar **220Ω** (margen de seguridad).

---

## Alimentación

| Fuente | Conexión | Para qué |
|--------|----------|----------|
| USB → VIN | Pin VIN del ESP32 | Alimentar todo el protoboard en PoC |
| 3.3V del ESP32 | Pin 3V3 | Sensores (DHT22, DS18B20, potenciómetros) |
| GND común | Pin GND | **Obligatorio** conectar todas las tierras |

> **Tierra común:** todos los componentes deben compartir la misma referencia GND. Sin esto, las lecturas ADC son incorrectas y los actuadores pueden no funcionar.

---

## Checklist antes de encender

- [ ] Resistencia de **4.7kΩ** entre GPIO 4 y 3.3V (DS18B20)
- [ ] Resistencias de **220Ω** en serie con cada LED (GPIO 16, 17, 5)
- [ ] Pull-up de **10kΩ** entre GPIO 15 y 3.3V (DHT22) — opcional pero recomendado
- [ ] GND de todos los componentes conectado al GND del ESP32
- [ ] GPIO 32 y 34 a los cursores (pin central) de los potenciómetros
- [ ] Extremos de los potenciómetros entre 3.3V y GND (no usar 5V)
- [ ] Verificar con multímetro que 3.3V y GND estén correctos antes de conectar sensores

---

## Notas sobre los SSR-25DA (producción)

Cuando reemplaces los LEDs por relés SSR-25DA reales:
- Los SSR de CC tienen entrada de control de 3–32V → compatible con los 3.3V del GPIO.
- Agregar un diodo de rueda libre (1N4007) en paralelo con la carga inductiva.
- Mantener la resistencia de 220Ω en la línea de control para proteger el GPIO.
- Usar detección de cruce por cero para cargas inductivas: conectar el pin ZC del SSR a un GPIO de interrupción.
