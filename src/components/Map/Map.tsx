"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  stores: any[];
  onSelectStore: (store: any) => void;
}

export default function Map({ stores, onSelectStore }: MapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fix Leaflet icons (SSR issue)
  useEffect(() => {
    (async function initLeaflet() {
       // @ts-ignore
       const L = (await import('leaflet')).default;
       
        // Fix default icon issue
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        // @ts-ignore
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
    })();
  }, []);

  if (!isMounted) return <div className="h-full w-full bg-gray-100 animate-pulse" />;
  
  // Custom Icons logic
  const getIcon = (type: string) => {
     if (typeof window === 'undefined') return null;
     const L = require('leaflet');
     
     // Use standard colored pins
     // Kiosk: Blue
     // Store: Red
     const iconUrl = type === 'Kiosk' 
        ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'
        : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
        
     return new L.Icon({
        iconUrl: iconUrl,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
     });
  };

  return (
    <div className="h-full w-full relative z-0">
        <MapContainer 
          center={[37.9838, 23.7275]} 
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="bottomright" />
          
          {stores.map((store) => (
            <Marker 
              key={store.id} 
              position={[store.lat || 37.9838, store.lng || 23.7275]}
              icon={getIcon(store.type)}
              eventHandlers={{
                click: () => onSelectStore(store),
              }}
            />
          ))}
        </MapContainer>
    </div>
  );
}
