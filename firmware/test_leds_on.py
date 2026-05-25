from machine import Pin
import time

Pin(18, Pin.OUT).on()
Pin(21, Pin.OUT).on()
Pin(5,  Pin.OUT).on()

print("LEDs ON — GPIO 18, 21, 5")

while True:
    time.sleep(1)
