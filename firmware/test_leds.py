from machine import Pin
import time

led_luces    = Pin(18, Pin.OUT, value=0)
led_extractor = Pin(17, Pin.OUT, value=0)
led_bomba    = Pin(5,  Pin.OUT, value=0)

leds = [
    (led_luces,    "GPIO 16 - Luces"),
    (led_extractor, "GPIO 17 - Extractor"),
    (led_bomba,    "GPIO 5  - Bomba"),
]

print("Test LEDs — cada uno prende 1 seg y apaga")

while True:
    for pin, nombre in leds:
        print(f"ON  → {nombre}")
        pin.on()
        time.sleep(1)
        pin.off()
        print(f"OFF → {nombre}")
        time.sleep(0.3)
