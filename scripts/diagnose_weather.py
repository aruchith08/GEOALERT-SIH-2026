import json
import urllib.request
import traceback
import sys

print("Python version:", sys.version)

print("\n--- TEST 1: Raw urllib to open-meteo ---")
url = "https://api.open-meteo.com/v1/forecast?latitude=25.2744&longitude=91.7323&current=temperature_2m,precipitation&forecast_days=1"
req = urllib.request.Request(url, headers={"User-Agent": "GEOALERT-SIH-2026/1.0 (Disaster-Risk-Platform)"})
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print("Status code:", resp.status)
        raw = resp.read().decode("utf-8")
        data = json.loads(raw)
        print("Response current:", data.get("current"))
except Exception as e:
    print("Raw request failed:", type(e), e)
    traceback.print_exc()

print("\n--- TEST 2: OpenMeteoWeatherProvider ---")
try:
    from backend.app.weather_provider import OpenMeteoWeatherProvider
    p = OpenMeteoWeatherProvider()
    status = p.get_status()
    print("Provider status:", json.dumps(status, indent=2))
    
    print("\n--- TEST 3: Full Weather & Forecast ---")
    w = p.get_weather_and_forecast(25.2744, 91.7323)
    print("Retrieved payload keys:", list(w.keys()))
    print("Current weather:", w.get("current"))
    print("Past 24h summary:", {k: v for k, v in w.get("past_24h", {}).items() if k != "hourly"})
    print("Forecast 24h summary:", {k: v for k, v in w.get("forecast_24h", {}).items() if k != "hourly"})
except Exception as e:
    print("Provider test failed:", type(e), e)
    traceback.print_exc()

print("\n--- TEST 4: WeatherService.get_status() ---")
try:
    from backend.app.weather_service import weather_service
    s = weather_service.get_status()
    print("WeatherService status:", s.model_dump_json(indent=2))
except Exception as e:
    print("WeatherService status failed:", type(e), e)
    traceback.print_exc()

print("\n--- TEST 5: WeatherSyncService.get_sync_status() ---")
try:
    from backend.app.weather_sync_service import weather_sync_service
    sync_s = weather_sync_service.get_sync_status()
    print("Sync status:", json.dumps(sync_s, indent=2))
except Exception as e:
    print("Sync status failed:", type(e), e)
    traceback.print_exc()
