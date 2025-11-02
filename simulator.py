import time
import random
import requests

SERVER_URL = "http://localhost:3000/sensor"

def generate_fake_data():
    temperature = round(random.uniform(18, 30), 1)
    humidity = round(random.uniform(30, 90), 1)
    light = round(random.uniform(100, 1000), 1)
    moisture = round(random.uniform(20, 80), 1)
    return temperature, humidity, light, moisture

def send_data():
    temperature, humidity, light, moisture = generate_fake_data()
    payload = {
        "temperature": temperature,
        "humidity": humidity,
        "light": light,
        "moisture": moisture
    }
    print("🌡️ Simulating:", payload)
    try:
        r = requests.post(SERVER_URL, json=payload, timeout=20)
        print("🔮 Server says:", r.json())
    except Exception as e:
        print("❌ Failed to send:", e)

if __name__ == "__main__":
    while True:
        send_data()
        time.sleep(25)  # ensure slower than server COOLDOWN
