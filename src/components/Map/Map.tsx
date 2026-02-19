"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Drawer from '../UI/Drawer';
import { useAuth } from '@/context/AuthContext';

export default function Map() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    
    // Fetch stores from API
    fetch('/api/stores')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStores(data);
        }
      })
      .catch(err => console.error("Failed to load stores", err));
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
     return new L.Icon({
        iconUrl: type === 'Kiosk' ? 'https://cdn-icons-png.flaticon.com/512/189/189001.png' : 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png',
        iconSize: [35, 35],
        iconAnchor: [17, 35],
        popupAnchor: [0, -35]
     });
  };

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={[37.9838, 23.7275]} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {stores.map((store) => (
          <Marker 
            key={store.id} 
            position={[store.lat || 37.9838, store.lng || 23.7275]}
            icon={getIcon(store.type)}
            eventHandlers={{
              click: () => setSelectedStore(store),
            }}
          >
          </Marker>
        ))}
      </MapContainer>

      <Drawer 
        isOpen={!!selectedStore} 
        onClose={() => setSelectedStore(null)}
        data={selectedStore}
      />
    </div>
  );
}
