/* =============================================================================
 * ulp_soil_monitor.S  —  RaizDigital ULP Assembler para ESP32
 * =============================================================================
 *
 * Propósito:
 *   Monitorear la humedad del suelo (GPIO 32 / ADC1_CH4) mientras el núcleo
 *   principal está en Deep Sleep (~10–150 µA), y despertar el procesador
 *   principal si la humedad cae por debajo del umbral crítico.
 *
 * Flujo:
 *   1. ULP se activa por timer periódico (configurado desde MicroPython).
 *   2. Lee ADC1 canal 4 (GPIO 32).
 *   3. Guarda la lectura en memoria RTC (compartida con núcleo principal).
 *   4. Si lectura < SOIL_THRESHOLD → ejecuta WAKE → núcleo principal se activa.
 *   5. Si lectura >= SOIL_THRESHOLD → HALT (vuelve a dormir hasta el próximo timer).
 *
 * Compilación (desde el host, requiere ESP-IDF o ulptool):
 *   pip install ulptool
 *   ulp_compile ulp_soil_monitor.S -o ulp_soil_monitor.bin
 *
 * Carga desde MicroPython:
 *   import esp32
 *   ULP_WAKEUP_PERIOD_US = 8_000_000   # despertar cada 8 segundos
 *   with open('ulp_soil_monitor.bin', 'rb') as f:
 *       ulp_code = f.read()
 *   ulp = esp32.ULP()
 *   ulp.set_wakeup_period(0, ULP_WAKEUP_PERIOD_US)
 *   ulp.load_binary(0, ulp_code)
 *   ulp.run(0)                          # 0 = offset del punto de entrada
 *   machine.deepsleep()                 # núcleo principal entra en Deep Sleep
 *
 * Al despertar:
 *   import esp32, machine
 *   if machine.reset_cause() == machine.DEEPSLEEP_RESET:
 *       # Leer el valor guardado por el ULP
 *       raw_soil = esp32.ULP().read_memory(ADDR_SOIL_VALUE)
 *       soil_pct = (raw_soil / 4095) * 100
 *       print(f"Suelo: {soil_pct:.1f}% — activando bomba")
 *
 * Consideraciones de seguridad eléctrica:
 *   - El ULP usa ADC en modo SAR interno: NO conectar más de 3.3V al GPIO 32.
 *   - GPIO 32 es de entrada únicamente durante el ULP (no activar pull-up interno).
 *   - Tierras comunes entre el potenciómetro/higrómetro y el ESP32 son obligatorias.
 * =============================================================================*/

/* Incluir definiciones del SoC ESP32 */
#include "soc/soc_ulp.h"

/* ── CONSTANTES ────────────────────────────────────────────────────────────── */

/* Umbral ADC (12-bit: 0–4095)
 * 40% de humedad ≈ valor ADC de 1638
 * Ajustar según la curva de calibración del sensor real */
.set SOIL_THRESHOLD, 1638

/* Dirección del multiplexor ADC para GPIO 32 = ADC1_CH4
 * En la instrucción 'adc': sar_mux=0 (ADC1), channel = CH4+1 = 5 */
.set ADC_SAR_MUX,  0
.set ADC_CHANNEL,  5

/* ── SEGMENTO BSS (variables en memoria RTC lenta, persistentes en Deep Sleep) */
.bss

/* Última lectura ADC guardada (leída por el núcleo principal al despertar) */
.global soil_raw_value
soil_raw_value:
    .long 0

/* Contador de veces que el ULP despertó al núcleo principal */
.global wake_event_count
wake_event_count:
    .long 0

/* ── SEGMENTO DE CÓDIGO ─────────────────────────────────────────────────────*/
.text

/* Punto de entrada del programa ULP (offset 0) */
.global entry
entry:

    /* ── 1. Leer ADC1 canal 4 (GPIO 32) ───────────────────────────────── */
    /* Instrucción: adc rd, sar_mux, mux
     *   rd      = registro destino (r0)
     *   sar_mux = 0 → ADC1
     *   mux     = número de canal + 1 (CH4 → 5)                         */
    adc r0, ADC_SAR_MUX, ADC_CHANNEL

    /* ── 2. Guardar lectura en memoria RTC ─────────────────────────────── */
    move r3, soil_raw_value     /* r3 = dirección de soil_raw_value */
    st   r0, r3, 0              /* mem[r3 + 0] = r0                */

    /* ── 3. Comparar con umbral ────────────────────────────────────────── */
    /* jumpr label, threshold, condition
     * Salta a 'wake_cpu' si r0 < SOIL_THRESHOLD (suelo demasiado seco)  */
    jumpr wake_cpu, SOIL_THRESHOLD, lt

    /* ── 4a. Suelo OK → volver a dormir ───────────────────────────────── */
    halt

    /* ── 4b. Suelo seco → incrementar contador y despertar CPU ─────────── */
wake_cpu:
    move r3, wake_event_count
    ld   r2, r3, 0
    add  r2, r2, 1
    st   r2, r3, 0

    /* Enviar señal de wake-up al núcleo principal */
    wake
    halt
