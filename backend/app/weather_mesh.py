"""
backend/app/weather_mesh.py
===========================
Spatially Variable Meteorological Mesh & Multi-Station Architecture for SIH 2026.
Assigns real-time and forecast rainfall parameters from representative meteorological
sampling stations across Meghalaya's geomorphic districts to the 3,156 regional risk cells.
Scalable to the wider Northeast Region (NER).
"""

from datetime import datetime, timezone
import math
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd

from backend.app.config import CSV_SURFACE_PATH
from backend.app.model_service import model_service
from backend.app.risk_engine import risk_engine
from backend.app.weather_service import weather_service

logger = logging.getLogger(__name__)

# Representative Regional Meteorological Stations across Meghalaya
MET_STATIONS: List[Dict[str, Any]] = [
    {
        "station_id": "MET_SOHRA",
        "station_name": "Sohra (Cherrapunjee)",
        "spatial_block": "East Khasi",
        "geomorphic_zone": "Southern Orographic Escarpment (High Deluge)",
        "latitude": 25.2744,
        "longitude": 91.7323,
        "elevation_m": 1430.0
    },
    {
        "station_id": "MET_SHILLONG",
        "station_name": "Shillong Central",
        "spatial_block": "East Khasi",
        "geomorphic_zone": "Central Plateau Plateau Core",
        "latitude": 25.5788,
        "longitude": 91.8933,
        "elevation_m": 1496.0
    },
    {
        "station_id": "MET_JOWAI",
        "station_name": "Jowai Plateau",
        "spatial_block": "Jaintia Hills",
        "geomorphic_zone": "Eastern Sub-Basin & Tablelands",
        "latitude": 25.4500,
        "longitude": 92.2000,
        "elevation_m": 1380.0
    },
    {
        "station_id": "MET_KHLIEHRIAT",
        "station_name": "Khliehriat East",
        "spatial_block": "Jaintia Hills",
        "geomorphic_zone": "Eastern Foothill Escarpment",
        "latitude": 25.3500,
        "longitude": 92.3700,
        "elevation_m": 1200.0
    },
    {
        "station_id": "MET_NONGSTOIN",
        "station_name": "Nongstoin Uplands",
        "spatial_block": "West Khasi",
        "geomorphic_zone": "West Central Dissected Plateau",
        "latitude": 25.5200,
        "longitude": 91.2700,
        "elevation_m": 1400.0
    },
    {
        "station_id": "MET_MAIRANG",
        "station_name": "Mairang Ridge",
        "spatial_block": "West Khasi",
        "geomorphic_zone": "Central Ridge Divide",
        "latitude": 25.5600,
        "longitude": 91.6400,
        "elevation_m": 1560.0
    },
    {
        "station_id": "MET_NONGPOH",
        "station_name": "Nongpoh Foothills",
        "spatial_block": "Ri-Bhoi",
        "geomorphic_zone": "Northern Lowland Brahmaputra Transit Corridor",
        "latitude": 25.9000,
        "longitude": 91.8800,
        "elevation_m": 485.0
    },
    {
        "station_id": "MET_BYRNIHAT",
        "station_name": "Byrnihat Gateway",
        "spatial_block": "Ri-Bhoi",
        "geomorphic_zone": "Northern Inter-State Border Valley",
        "latitude": 26.0500,
        "longitude": 91.8700,
        "elevation_m": 180.0
    },
    {
        "station_id": "MET_TURA",
        "station_name": "Tura Ridge",
        "spatial_block": "Garo Hills",
        "geomorphic_zone": "Western Garo Structural Escarpment",
        "latitude": 25.5100,
        "longitude": 90.2200,
        "elevation_m": 650.0
    },
    {
        "station_id": "MET_WILLIAMNAGAR",
        "station_name": "Williamnagar Simsang",
        "spatial_block": "Garo Hills",
        "geomorphic_zone": "Central Simsang River Valley Basin",
        "latitude": 25.6000,
        "longitude": 90.5800,
        "elevation_m": 340.0
    },
    {
        "station_id": "MET_BAGHMARA",
        "station_name": "Baghmara Border",
        "spatial_block": "Garo Hills",
        "geomorphic_zone": "Southern Someshwari Valley",
        "latitude": 25.2000,
        "longitude": 90.6300,
        "elevation_m": 120.0
    },
    {
        "station_id": "MET_RESUBELPARA",
        "station_name": "Resubelpara North",
        "spatial_block": "Garo Hills",
        "geomorphic_zone": "North Garo Plains Transition",
        "latitude": 25.9000,
        "longitude": 90.6000,
        "elevation_m": 150.0
    }
]


class WeatherMeshService:
    """
    Manages the multi-station meteorological mesh and provides
    spatially variable P(D)(x,y,t) and coupled risk for all 3,156 grid cells.
    """

    def __init__(self):
        self.stations = MET_STATIONS
        self._cell_station_map: Optional[np.ndarray] = None
        self._cached_station_pd: Dict[str, float] = {}
        self._last_mesh_update: Optional[str] = None

    def get_stations(self) -> List[Dict[str, Any]]:
        """Returns all configured meteorological stations."""
        return self.stations

    def _ensure_cell_station_mapping(self, grid_df: pd.DataFrame) -> np.ndarray:
        """
        Pre-computes the nearest station index for each of the 3,156 grid cells
        using vectorized Haversine distance.
        """
        if self._cell_station_map is not None and len(self._cell_station_map) == len(grid_df):
            return self._cell_station_map

        cell_lats = np.radians(grid_df["latitude"].values)
        cell_lons = np.radians(grid_df["longitude"].values)
        n_cells = len(grid_df)
        n_stations = len(self.stations)

        st_lats = np.radians([s["latitude"] for s in self.stations])
        st_lons = np.radians([s["longitude"] for s in self.stations])

        # Compute distance matrix: shape (n_cells, n_stations)
        # dlat: (n_cells, 1) - (1, n_stations)
        dlat = cell_lats[:, np.newaxis] - st_lats[np.newaxis, :]
        dlon = cell_lons[:, np.newaxis] - st_lons[np.newaxis, :]

        a = np.sin(dlat / 2.0)**2 + np.cos(cell_lats)[:, np.newaxis] * np.cos(st_lats)[np.newaxis, :] * np.sin(dlon / 2.0)**2
        c = 2.0 * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))

        # Nearest station index per cell
        self._cell_station_map = np.argmin(c, axis=1)
        logger.info(f"Computed nearest station mapping for {n_cells} grid cells across {n_stations} stations.")
        return self._cell_station_map

    def update_station_telemetry(self) -> Dict[str, Dict[str, Any]]:
        """
        Fetches or retrieves cached weather for each of the 12 stations,
        extracts the 10 CHIRPS features, and evaluates Model B P(D) for each station.
        Only makes up to 12 calls (cached by WeatherCache for 15 mins).
        """
        station_results: Dict[str, Dict[str, Any]] = {}

        for st in self.stations:
            st_id = st["station_id"]
            try:
                curr_w = weather_service.get_current_weather(st["latitude"], st["longitude"])
                p_d = curr_w.dynamic_trigger_p_d
                self._cached_station_pd[st_id] = p_d
                station_results[st_id] = {
                    "station_id": st_id,
                    "station_name": st["station_name"],
                    "spatial_block": st["spatial_block"],
                    "dynamic_trigger_p_d": p_d,
                    "rainfall_today_mm": curr_w.features.rainfall_event_day,
                    "ari_3_mm": curr_w.features.ari_3,
                    "ari_7_mm": curr_w.features.ari_7,
                    "temperature_c": curr_w.current.temperature_c,
                    "wind_speed_kmh": curr_w.current.wind_speed_10m_kmh,
                    "weather_description": curr_w.current.weather_description,
                    "data_mode": curr_w.provenance.data_mode if curr_w.provenance else "LIVE",
                    "cache_status": curr_w.cache_status
                }
            except Exception as e:
                logger.warning(f"Station {st_id} query failed: {e}. Using calibrated baseline.")
                default_pd = 0.6284 if "SOHRA" in st_id else 0.4500 if "SHILLONG" in st_id else 0.3500
                self._cached_station_pd[st_id] = default_pd
                station_results[st_id] = {
                    "station_id": st_id,
                    "station_name": st["station_name"],
                    "spatial_block": st["spatial_block"],
                    "dynamic_trigger_p_d": default_pd,
                    "rainfall_today_mm": 35.0,
                    "ari_3_mm": 80.0,
                    "ari_7_mm": 140.0,
                    "temperature_c": 21.0,
                    "wind_speed_kmh": 12.0,
                    "weather_description": "Seasonal baseline",
                    "data_mode": "DEMO_SCENARIO",
                    "cache_status": "FALLBACK"
                }

        self._last_mesh_update = datetime.now(timezone.utc).isoformat()
        return station_results

    def compute_spatially_variable_risk(self) -> Dict[str, Any]:
        """
        Computes spatially variable P(D)(x,y,t) and coupled Risk(x,y,t) across all 3,156 cells:
        1. Ensures nearest station mapping.
        2. Retrieves station dynamic trigger P(D) for each station.
        3. Couples with each cell's Model A static susceptibility P(S).
        4. Classifies alert tier (Level 1: Green, Level 2: Yellow, Level 3: Orange, Level 4: Red).
        Returns aggregated summary and cell-level risk array.
        """
        grid_df = weather_service.get_grid_df()
        st_map = self._ensure_cell_station_mapping(grid_df)
        st_telemetry = self.update_station_telemetry()

        # Vector of P(D) for the 12 stations
        st_ids = [s["station_id"] for s in self.stations]
        st_pd_vector = np.array([self._cached_station_pd.get(sid, 0.45) for sid in st_ids])

        # Cell P(D) assigned via nearest station index
        cell_pd = st_pd_vector[st_map]
        cell_ps = grid_df["static_susceptibility_P_S"].values

        # Coupling formula: Risk = P(S) * P(D)
        cell_risk = cell_ps * cell_pd

        # Tiers: Green (< 0.0502 or P(S) < 0.15), Yellow (0.0502..0.15), Orange (0.15..0.35), Red (>= 0.35)
        green_mask = (cell_risk < 0.0502) | (cell_ps < 0.1500)
        yellow_mask = (~green_mask) & (cell_risk < 0.1500)
        orange_mask = (~green_mask) & (cell_risk >= 0.1500) & (cell_risk < 0.3500)
        red_mask = (~green_mask) & (cell_risk >= 0.3500)

        green_count = int(np.sum(green_mask))
        yellow_count = int(np.sum(yellow_mask))
        orange_count = int(np.sum(orange_mask))
        red_count = int(np.sum(red_mask))

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_cells": len(grid_df),
            "station_count": len(self.stations),
            "stations": list(st_telemetry.values()),
            "kpi_metrics": {
                "green_count": green_count,
                "yellow_count": yellow_count,
                "orange_count": orange_count,
                "red_count": red_count,
                "high_risk_pct": round((orange_count + red_count) / len(grid_df) * 100.0, 2)
            },
            "spatially_variable_active": True,
            "provenance_notice": "Spatially variable P(D)(x,y,t) interpolated from 12 regional meteorological stations across Meghalaya."
        }


weather_mesh_service = WeatherMeshService()
