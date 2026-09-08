'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { GridFeature, GridProperties, MapLayerType } from '@/lib/types';
import { MEGHALAYA_CENTER } from '@/lib/constants';

interface LeafletMapProps {
  features: GridFeature[];
  onSelectCell: (cell: GridProperties, coords?: [number, number]) => void;
  selectedCellId?: string;
  selectedCoords?: [number, number];
  activeLayer?: MapLayerType;
  customDynamicPD?: number;
}

function MapAutoBounds({ features }: { features: GridFeature[] }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.invalidateSize();
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 200);
      map.setView(MEGHALAYA_CENTER, 8);
      return () => clearTimeout(timer);
    }
  }, [map, features]);
  return null;
}

function MapPanToSelected({
  features,
  selectedCellId
}: {
  features: GridFeature[];
  selectedCellId?: string;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !selectedCellId) return;
    const feat = features.find((f) => f.properties.cell_id === selectedCellId);
    if (feat) {
      const [lon, lat] = feat.geometry.coordinates;
      map.flyTo([lat, lon], Math.max(map.getZoom(), 10), { duration: 0.8 });
    }
  }, [map, selectedCellId, features]);
  return null;
}

function MapClickHandler({
  features,
  onSelectCell
}: {
  features: GridFeature[];
  onSelectCell: (cell: GridProperties, coords?: [number, number]) => void;
}) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      let minD = Infinity;
      let nearestProp: GridProperties | null = null;
      for (const feat of features) {
        const [cLon, cLat] = feat.geometry.coordinates;
        const d = (cLat - lat) ** 2 + (cLon - lng) ** 2;
        if (d < minD) {
          minD = d;
          nearestProp = feat.properties;
        }
      }
      if (nearestProp) {
        onSelectCell(nearestProp, [lat, lng]);
      }
    }
  });
  return null;
}

function getBlockBaseRainfall(blockName: string): number {
  const b = (blockName || '').toLowerCase();
  if (b.includes('khasi') && !b.includes('west')) return 48.0; // East Khasi / Sohra / Mawsynram
  if (b.includes('jaintia')) return 38.0; // Jaintia Hills / Khliehriat
  if (b.includes('west khasi')) return 26.0; // West Khasi Hills / Nongstoin
  if (b.includes('garo')) return 22.0; // Garo Hills / Tura
  if (b.includes('ri-bhoi') || b.includes('ribhoi')) return 11.5; // Ri-Bhoi leeward rain shadow
  return 24.0;
}

function getLayerStyle(p: GridProperties, activeLayer: MapLayerType, isSelected: boolean, customDynamicPD?: number) {
  const pd = customDynamicPD ?? p.p_dynamic;
  const ps = p.p_static;
  const coupled = ps * pd;

  const rainScale = (customDynamicPD ?? 0.6284) / 0.6284;
  const currentRainMM = Number((getBlockBaseRainfall(p.block) * rainScale).toFixed(1));
  const forecastRainMM = Number((currentRainMM * 3.6).toFixed(1));
  const forecastRisk = Number(Math.min(ps * Math.min(pd * 1.18, 0.95), 1.0).toFixed(4));

  let color = p.color;
  let radius = 4;

  if (activeLayer === 'static_susceptibility') {
    if (ps < 0.15) {
      color = '#16a34a'; // Green
      radius = 3.5;
    } else if (ps < 0.30) {
      color = '#0284c7'; // Blue
      radius = 4.5;
    } else if (ps < 0.50) {
      color = '#ea580c'; // Orange
      radius = 5.5;
    } else {
      color = '#dc2626'; // Red
      radius = 6.5;
    }
  } else if (activeLayer === 'dynamic_trigger') {
    if (pd < 0.20) {
      color = '#16a34a';
      radius = 3.5;
    } else if (pd < 0.50) {
      color = '#ca8a04';
      radius = 5;
    } else {
      color = '#dc2626';
      radius = 6.5;
    }
  } else if (activeLayer === 'current_rainfall') {
    // Distinct Cyan-to-Purple sequential palette (separate from Green-Yellow-Orange-Red risk tiers)
    if (currentRainMM < 5.0) {
      color = '#38bdf8'; // Light Cyan (<5mm)
      radius = 3.5;
    } else if (currentRainMM < 20.0) {
      color = '#0284c7'; // Royal Blue (5-20mm)
      radius = 4.5;
    } else if (currentRainMM < 50.0) {
      color = '#4f46e5'; // Indigo (20-50mm)
      radius = 5.5;
    } else {
      color = '#7e22ce'; // Deep Purple (>=50mm)
      radius = 6.5;
    }
  } else if (activeLayer === 'forecast_rainfall') {
    // Distinct Cyan-to-Purple sequential palette for forward 7-day accumulation
    if (forecastRainMM < 20.0) {
      color = '#38bdf8';
      radius = 3.5;
    } else if (forecastRainMM < 60.0) {
      color = '#0284c7';
      radius = 4.5;
    } else if (forecastRainMM < 120.0) {
      color = '#4f46e5';
      radius = 5.5;
    } else {
      color = '#7e22ce';
      radius = 6.5;
    }
  } else if (activeLayer === 'forecast_risk') {
    // Forecast Coupled Risk
    if (forecastRisk < 0.0502 || ps < 0.15) {
      color = '#16a34a';
      radius = 4;
    } else if (forecastRisk < 0.1500) {
      color = '#ca8a04';
      radius = 5;
    } else if (forecastRisk < 0.3500) {
      color = '#ea580c';
      radius = 6;
    } else {
      color = '#dc2626';
      radius = 7;
    }
  } else {
    // Default: Current Coupled Risk P(S) * P(D)
    if (coupled < 0.0502 || ps < 0.15) {
      color = '#16a34a';
      radius = 4;
    } else if (coupled < 0.1500) {
      color = '#ca8a04';
      radius = 5;
    } else if (coupled < 0.3500) {
      color = '#ea580c';
      radius = 6;
    } else {
      color = '#dc2626';
      radius = 7;
    }
  }

  if (isSelected) {
    radius = 9;
  }

  return { color, radius, dynamicPD: pd, coupledRisk: coupled, currentRainMM, forecastRainMM, forecastRisk };
}

export default function LeafletMap({
  features,
  onSelectCell,
  selectedCellId,
  selectedCoords,
  activeLayer = 'coupled_risk',
  customDynamicPD
}: LeafletMapProps) {
  return (
    <MapContainer
      center={MEGHALAYA_CENTER}
      zoom={8}
      minZoom={7}
      maxZoom={14}
      scrollWheelZoom={true}
      className="w-full h-[580px]"
      style={{ height: '580px', width: '100%', minHeight: '580px' }}
    >
      {/* Light Clean Professional Cartographic Basemap (Esri World Light Gray Canvas) */}
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, USGS'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />

      <MapAutoBounds features={features} />
      <MapPanToSelected features={features} selectedCellId={selectedCellId} />
      <MapClickHandler features={features} onSelectCell={onSelectCell} />

      {/* Selected Coordinate Precision Crosshair Marker */}
      {selectedCoords && (
        <CircleMarker
          center={selectedCoords}
          radius={8}
          pathOptions={{
            color: '#1e40af',
            fillColor: '#38bdf8',
            fillOpacity: 0.95,
            weight: 3
          }}
        >
          <Popup>
            <div className="p-1.5 text-xs font-mono">
              <div className="font-extrabold text-blue-900 border-b border-blue-100 pb-1">
                Selected Coordinate
              </div>
              <div className="mt-1 text-slate-700 text-[11px]">
                <div>Lat: <strong className="text-slate-900">{selectedCoords[0].toFixed(5)}° N</strong></div>
                <div>Lon: <strong className="text-slate-900">{selectedCoords[1].toFixed(5)}° E</strong></div>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      )}

      {features.map((feat) => {
        const [lon, lat] = feat.geometry.coordinates;
        const p = feat.properties;
        const isSelected = selectedCellId === p.cell_id;
        const {
          color,
          radius,
          dynamicPD,
          coupledRisk,
          currentRainMM,
          forecastRainMM,
          forecastRisk
        } = getLayerStyle(p, activeLayer, isSelected, customDynamicPD);

        return (
          <CircleMarker
            key={p.cell_id}
            center={[lat, lon]}
            radius={radius}
            pathOptions={{
              color: isSelected ? '#1e40af' : color,
              fillColor: color,
              fillOpacity: isSelected ? 1.0 : 0.85,
              weight: isSelected ? 3.5 : 1
            }}
            eventHandlers={{
              click: () => onSelectCell(p, [lat, lon])
            }}
          >
            <Popup>
              <div className="p-1.5 text-xs font-mono">
                <div className="font-extrabold text-slate-900 mb-1 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>{p.block}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{p.cell_id}</span>
                </div>
                <div className="text-[10px] text-blue-700 font-semibold mb-1">
                  {lat.toFixed(5)}° N, {lon.toFixed(5)}° E
                </div>
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Model A Terrain P(S):</span>
                    <strong className="text-blue-700">{p.p_static.toFixed(3)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Model B Dynamic P(D):</span>
                    <strong className="text-sky-700">{dynamicPD.toFixed(3)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Rain (Mesh):</span>
                    <strong className="text-indigo-700">{currentRainMM.toFixed(1)} mm</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>7D Forecast Rain:</span>
                    <strong className="text-purple-700">{forecastRainMM.toFixed(1)} mm</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                    <span>Coupled Risk:</span>
                    <strong className="text-slate-900">{coupledRisk.toFixed(4)}</strong>
                  </div>
                  <div className="flex justify-between font-bold text-amber-900">
                    <span>Peak 7D Forecast Risk:</span>
                    <strong className="text-amber-700">{forecastRisk.toFixed(4)}</strong>
                  </div>
                  <div className="mt-1 pt-1 border-t border-slate-200 font-bold text-[10px]" style={{ color }}>
                    Layer Mode: {activeLayer.replace('_', ' ').toUpperCase()}
                  </div>
                  <button
                    onClick={() => onSelectCell(p, [lat, lon])}
                    className="w-full mt-2 py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px] transition text-center shadow-2xs block"
                  >
                    Open Full Coordinate Intelligence &rarr;
                  </button>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
