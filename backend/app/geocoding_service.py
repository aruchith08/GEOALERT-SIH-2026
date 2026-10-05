"""
backend/app/geocoding_service.py
================================
Reverse Geocoding & Geographic Identity Resolution Service for GEOALERT.
Implements a 4-tier location resolution hierarchy:
  Priority 1: Reverse Geocoded Locality (Village / Town / Locality, District, Meghalaya, India)
  Priority 2: Nearest Recognized Locality (Near <Settlement> (~dist km), District, Meghalaya, India)
  Priority 3: Coordinate-Based Identity (Selected Location, Lat N, Lon E, Meghalaya, India)
  Priority 4: Internal Cell ID (Spatial Cell: CELL_MEG_xxxx for technical traceability)

Features in-memory TTL caching and an offline gazetteer of Meghalaya settlements.
"""

from datetime import datetime, timezone, timedelta
import json
import logging
import math
import threading
from typing import Dict, Any, Optional, List, Tuple
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

# Curated High-Resolution Meghalaya Gazetteer (Covering all 11 districts)
MEGHALAYA_GAZETTEER: List[Dict[str, Any]] = [
    # East Khasi Hills
    {"name": "Sohra (Cherrapunjee)", "type": "Sub-Divisional Town", "district": "East Khasi Hills", "latitude": 25.2744, "longitude": 91.7323},
    {"name": "Mawsynram", "type": "Village / Deluge Center", "district": "East Khasi Hills", "latitude": 25.2972, "longitude": 91.5828},
    {"name": "Shillong Central", "type": "State Capital", "district": "East Khasi Hills", "latitude": 25.5788, "longitude": 91.8933},
    {"name": "Upper Shillong", "type": "High Plateau", "district": "East Khasi Hills", "latitude": 25.5410, "longitude": 91.8520},
    {"name": "Elephant Falls / Upper Shillong", "type": "Locality", "district": "East Khasi Hills", "latitude": 25.5360, "longitude": 91.8380},
    {"name": "Mawkdok (Dympep Gorge)", "type": "Bridge / Valley", "district": "East Khasi Hills", "latitude": 25.3500, "longitude": 91.7580},
    {"name": "Nohkalikai Falls Area", "type": "Escarpment", "district": "East Khasi Hills", "latitude": 25.2750, "longitude": 91.6850},
    {"name": "Mawlynnong", "type": "Village", "district": "East Khasi Hills", "latitude": 25.2017, "longitude": 91.9160},
    {"name": "Pynursla", "type": "Township", "district": "East Khasi Hills", "latitude": 25.3100, "longitude": 91.9050},
    {"name": "Laitlum Canyons", "type": "Canyon / Gorge", "district": "East Khasi Hills", "latitude": 25.4480, "longitude": 91.9080},
    {"name": "Smit", "type": "Cultural Center", "district": "East Khasi Hills", "latitude": 25.5170, "longitude": 91.9420},
    {"name": "Mawphlang Sacred Forest", "type": "Locality", "district": "East Khasi Hills", "latitude": 25.4520, "longitude": 91.7580},
    {"name": "Mylliem", "type": "Locality", "district": "East Khasi Hills", "latitude": 25.4980, "longitude": 91.8250},
    {"name": "Pomlakrai", "type": "Locality", "district": "East Khasi Hills", "latitude": 25.5120, "longitude": 91.8790},
    
    # Ri-Bhoi District
    {"name": "Nongpoh", "type": "District Headquarters", "district": "Ri-Bhoi", "latitude": 25.9000, "longitude": 91.8800},
    {"name": "Umsning", "type": "Transit Township", "district": "Ri-Bhoi", "latitude": 25.7533, "longitude": 91.8953},
    {"name": "Byrnihat", "type": "Border Industrial Hub", "district": "Ri-Bhoi", "latitude": 26.0550, "longitude": 91.8650},
    {"name": "Umiam (Barapani)", "type": "Reservoir Basin", "district": "Ri-Bhoi", "latitude": 25.6600, "longitude": 91.9100},
    {"name": "Bhoirymbong", "type": "Township", "district": "Ri-Bhoi", "latitude": 25.6800, "longitude": 92.0100},
    {"name": "Umling", "type": "Highway Node", "district": "Ri-Bhoi", "latitude": 25.9600, "longitude": 91.8600},

    # West Jaintia Hills
    {"name": "Jowai", "type": "District Headquarters", "district": "West Jaintia Hills", "latitude": 25.4500, "longitude": 92.2000},
    {"name": "Nartiang", "type": "Megalithic Heritage Site", "district": "West Jaintia Hills", "latitude": 25.5700, "longitude": 92.2200},
    {"name": "Thadlaskein", "type": "Lake Basin", "district": "West Jaintia Hills", "latitude": 25.5000, "longitude": 92.1700},
    {"name": "Dawki (Umngot Gorge)", "type": "Border River Basin", "district": "West Jaintia Hills", "latitude": 25.1850, "longitude": 92.0180},
    {"name": "Amlarem", "type": "Sub-Division", "district": "West Jaintia Hills", "latitude": 25.2800, "longitude": 92.1000},

    # East Jaintia Hills
    {"name": "Khliehriat", "type": "District Headquarters", "district": "East Jaintia Hills", "latitude": 25.3500, "longitude": 92.3700},
    {"name": "Lad Rymbai", "type": "Commercial Node", "district": "East Jaintia Hills", "latitude": 25.3300, "longitude": 92.3200},
    {"name": "Sutnga", "type": "Plateau Settlement", "district": "East Jaintia Hills", "latitude": 25.3700, "longitude": 92.4400},
    {"name": "Saipung", "type": "Sub-Division", "district": "East Jaintia Hills", "latitude": 25.4500, "longitude": 92.5200},
    {"name": "Lumshnong", "type": "Mineral Corridor", "district": "East Jaintia Hills", "latitude": 25.1800, "longitude": 92.3800},

    # West Khasi Hills
    {"name": "Nongstoin", "type": "District Headquarters", "district": "West Khasi Hills", "latitude": 25.5200, "longitude": 91.2700},
    {"name": "Mairang", "type": "Eastern Plateau Hub", "district": "Eastern West Khasi Hills", "latitude": 25.5600, "longitude": 91.6400},
    {"name": "Markasa", "type": "Highway Node", "district": "West Khasi Hills", "latitude": 25.5300, "longitude": 91.4500},
    {"name": "Kynshi", "type": "Village", "district": "Eastern West Khasi Hills", "latitude": 25.5500, "longitude": 91.5600},
    {"name": "Nongkhlaw", "type": "Historical Ridge", "district": "Eastern West Khasi Hills", "latitude": 25.6800, "longitude": 91.6200},

    # South West Khasi Hills
    {"name": "Mawkyrwat", "type": "District Headquarters", "district": "South West Khasi Hills", "latitude": 25.3600, "longitude": 91.4500},
    {"name": "Ranikor", "type": "River Gorge Basin", "district": "South West Khasi Hills", "latitude": 25.2100, "longitude": 91.2400},
    {"name": "Jakrem", "type": "Hot Spring Valley", "district": "South West Khasi Hills", "latitude": 25.4100, "longitude": 91.5100},

    # West Garo Hills
    {"name": "Tura", "type": "District Headquarters", "district": "West Garo Hills", "latitude": 25.5100, "longitude": 90.2200},
    {"name": "Asanang", "type": "Valley Settlement", "district": "West Garo Hills", "latitude": 25.5700, "longitude": 90.3000},
    {"name": "Garobadha", "type": "Transit Junction", "district": "West Garo Hills", "latitude": 25.5400, "longitude": 90.0400},
    {"name": "Selsella", "type": "Sub-Division", "district": "West Garo Hills", "latitude": 25.6800, "longitude": 90.0800},
    {"name": "Tikrikilla", "type": "Foothills Township", "district": "West Garo Hills", "latitude": 25.9300, "longitude": 90.1700},
    {"name": "Dadenggre", "type": "Sub-Divisional Town", "district": "West Garo Hills", "latitude": 25.7200, "longitude": 90.2900},

    # East Garo Hills
    {"name": "Williamnagar", "type": "District Headquarters", "district": "East Garo Hills", "latitude": 25.6000, "longitude": 90.6200},
    {"name": "Rongjeng", "type": "Highway Node", "district": "East Garo Hills", "latitude": 25.6900, "longitude": 90.8700},
    {"name": "Samanda", "type": "Valley Locality", "district": "East Garo Hills", "latitude": 25.6200, "longitude": 90.5400},

    # South Garo Hills
    {"name": "Baghmara", "type": "District Headquarters", "district": "South Garo Hills", "latitude": 25.2000, "longitude": 90.6300},
    {"name": "Siju (Cave Complex)", "type": "Karst Gorge", "district": "South Garo Hills", "latitude": 25.3500, "longitude": 90.6900},
    {"name": "Balpakram Plateau Edge", "type": "National Park Escarpment", "district": "South Garo Hills", "latitude": 25.2400, "longitude": 90.8600},
    {"name": "Gasuapara", "type": "Border Corridor", "district": "South Garo Hills", "latitude": 25.2100, "longitude": 90.4800},

    # South West Garo Hills
    {"name": "Ampati", "type": "District Headquarters", "district": "South West Garo Hills", "latitude": 25.4600, "longitude": 89.9300},
    {"name": "Betasing", "type": "Locality", "district": "South West Garo Hills", "latitude": 25.4800, "longitude": 89.9800},
    {"name": "Mahendraganj", "type": "Border Sub-Division", "district": "South West Garo Hills", "latitude": 25.3000, "longitude": 89.8500},

    # North Garo Hills
    {"name": "Resubelpara", "type": "District Headquarters", "district": "North Garo Hills", "latitude": 25.9000, "longitude": 90.6000},
    {"name": "Mendipathar", "type": "Railway Railhead", "district": "North Garo Hills", "latitude": 25.9200, "longitude": 90.5800},
    {"name": "Bajengdoba", "type": "Highway Township", "district": "North Garo Hills", "latitude": 25.8800, "longitude": 90.4900}
]


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in kilometers."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class GeocodingService:
    """
    Reverse Geocoding and Location Identity Resolution Service.
    Resolves exact coordinates to human-meaningful village/town identities using
    an in-memory TTL cache, online reverse geocoding, and high-precision offline fallback.
    """

    def __init__(self, cache_ttl_hours: float = 24.0, http_timeout_seconds: float = 2.5):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self.cache_ttl = timedelta(hours=cache_ttl_hours)
        self.http_timeout = max(http_timeout_seconds, 5.0)
        self.gazetteer = MEGHALAYA_GAZETTEER

    def _make_key(self, lat: float, lon: float) -> str:
        # Cache resolution ~0.005 deg (approx 550m)
        return f"{round(lat, 3):.3f}:{round(lon, 3):.3f}"

    def find_nearest_gazetteer_locality(self, lat: float, lon: float) -> Tuple[Dict[str, Any], float]:
        """Finds the nearest recognized locality in the Meghalaya gazetteer."""
        min_dist = float("inf")
        nearest = self.gazetteer[0]
        for loc in self.gazetteer:
            d = haversine_distance_km(lat, lon, loc["latitude"], loc["longitude"])
            if d < min_dist:
                min_dist = d
                nearest = loc
        return nearest, min_dist

    def _query_online_reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, str]]:
        """
        Attempts lightweight reverse geocoding via OpenStreetMap Nominatim with strict timeout.
        Returns dictionary with locality, district, state, country if successful.
        """
        url = (
            f"https://nominatim.openstreetmap.org/reverse?lat={lat:.5f}&lon={lon:.5f}"
            f"&format=json&addressdetails=1&zoom=14"
        )
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "GEOALERT-Platform/1.0 (Disaster-Risk-Platform; contact@geoalert.gov.in)"}
        )
        try:
            with urllib.request.urlopen(req, timeout=self.http_timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            address = data.get("address", {})
            
            # Extract locality name with priority: village > hamlet > town > suburb > neighbourhood > city
            locality = (
                address.get("village") or
                address.get("hamlet") or
                address.get("town") or
                address.get("suburb") or
                address.get("neighbourhood") or
                address.get("city") or
                data.get("name")
            )
            district = address.get("county") or address.get("state_district") or address.get("district")
            state = address.get("state") or "Meghalaya"
            country = address.get("country") or "India"

            if locality:
                return {
                    "locality": locality,
                    "district": district,
                    "state": state,
                    "country": country
                }
        except Exception as exc:
            logger.debug(f"Online reverse geocoding skipped ({exc}); using offline gazetteer.")
        return None

    def resolve_location_identity(
        self,
        latitude: float,
        longitude: float,
        cell_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Resolves the 4-tier location identity for a clicked coordinate.
        Returns:
            locality, district, state, country, display_name, full_hierarchy,
            formatted_coordinates, spatial_cell_id, resolution_method, distance_to_named_km
        """
        key = self._make_key(latitude, longitude)
        now = datetime.now(timezone.utc)

        # 1. Check cache
        with self._lock:
            cached = self._cache.get(key)
            if cached and cached["expires_at"] > now:
                res = dict(cached["data"])
                if cell_id:
                    res["spatial_cell_id"] = cell_id
                return res

        # 2. Attempt online geocoding
        online_res = self._query_online_reverse_geocode(latitude, longitude)
        nearest_gaz, dist_km = self.find_nearest_gazetteer_locality(latitude, longitude)

        formatted_coords = f"{latitude:.5f}° N, {longitude:.5f}° E"

        if online_res and online_res.get("locality"):
            # Priority 1: Verified Reverse Geocoded Locality
            locality = online_res["locality"]
            district = online_res["district"]
            resolution_method = "REVERSE_GEOCODED"
            display_name = f"{locality}, {district}"
            full_hierarchy = f"{locality}\n{district}\nMeghalaya, India"
            dist_to_named = 0.0
        elif dist_km <= 3.0:
            # Priority 1b: Direct match with recognized gazetteer settlement
            locality = nearest_gaz["name"]
            district = nearest_gaz["district"]
            resolution_method = "EXACT_LOCALITY"
            display_name = f"{locality}, {district}"
            full_hierarchy = f"{locality}\n{district}\nMeghalaya, India"
            dist_to_named = dist_km
        elif dist_km <= 25.0:
            # Priority 2: Nearest Recognized Locality
            locality = f"Near {nearest_gaz['name']} (~{dist_km:.1f} km)"
            district = nearest_gaz["district"]
            resolution_method = "NEAREST_LOCALITY"
            display_name = f"{locality}, {district}"
            full_hierarchy = f"{locality}\n{district}\nMeghalaya, India"
            dist_to_named = dist_km
        else:
            # Priority 3: Coordinate-Based Identity
            locality = "Selected Location"
            district = nearest_gaz["district"] if dist_km <= 60.0 else "Meghalaya Region"
            resolution_method = "COORDINATE_FALLBACK"
            display_name = f"Selected Location ({latitude:.4f}°, {longitude:.4f}°)"
            full_hierarchy = f"Selected Location\n{formatted_coords}\nMeghalaya, India"
            dist_to_named = dist_km

        result = {
            "locality": locality,
            "district": district,
            "state": "Meghalaya",
            "country": "India",
            "display_name": display_name,
            "full_hierarchy": full_hierarchy,
            "formatted_coordinates": formatted_coords,
            "latitude": round(latitude, 5),
            "longitude": round(longitude, 5),
            "spatial_cell_id": cell_id or "COORDINATE_POINT",
            "resolution_method": resolution_method,
            "distance_to_named_km": round(dist_to_named, 2)
        }

        # Store in cache
        with self._lock:
            self._cache[key] = {
                "data": result,
                "expires_at": now + self.cache_ttl
            }

        return result


geocoding_service = GeocodingService()


def resolve_location_identity(latitude: float, longitude: float, cell_id: Optional[str] = None) -> Dict[str, Any]:
    """Module-level convenience wrapper for geocoding_service.resolve_location_identity."""
    return geocoding_service.resolve_location_identity(latitude, longitude, cell_id)
