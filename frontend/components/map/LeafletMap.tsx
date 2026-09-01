'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { GridFeature, GridProperties, MapLayerType } from '@/lib/types';
import { MEGHALAYA_CENTER } from '@/lib/constants';

interface LeafletMapProps {
  features: GridFeature[];
  onSelectCell: (cell: GridProperties) => void;
  selectedCellId?: string;
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

function getLayerStyle(p: GridProperties, activeLayer: MapLayerType, isSelected: boolean, customDynamicPD?: number) {
  const pd = customDynamicPD ?? p.p_dynamic;
  const ps = p.p_static;
  const coupled = ps * pd;

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
  } else {
    // Coupled Risk P(S) * P(D)
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

  return { color, radius, dynamicPD: pd, coupledRisk: coupled };
}

export default function LeafletMap({
  features,
  onSelectCell,
  selectedCellId,
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

      {features.map((feat) => {
        const [lon, lat] = feat.geometry.coordinates;
        const p = feat.properties;
        const isSelected = selectedCellId === p.cell_id;
        const { color, radius, dynamicPD, coupledRisk } = getLayerStyle(p, activeLayer, isSelected, customDynamicPD);

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
              click: () => onSelectCell(p)
            }}
          >
            <Popup>
              <div className="p-1.5 text-xs font-mono">
                <div className="font-extrabold text-slate-900 mb-1 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>{p.block}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{p.cell_id}</span>
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
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                    <span>Coupled Risk:</span>
                    <strong className="text-slate-900">{coupledRisk.toFixed(4)}</strong>
                  </div>
                  <div className="mt-1 pt-1 border-t border-slate-200 font-bold text-[10px]" style={{ color }}>
                    Layer Mode: {activeLayer.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
