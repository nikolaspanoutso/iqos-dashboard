"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Drawer from '../UI/Drawer';
import { useAuth } from '@/context/AuthContext';
import { List, Map as MapIcon, ChevronRight } from 'lucide-react';

export default function Map() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  
  // View Toggle State
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

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
      
      {/* View Toggle Button */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white p-1 rounded-lg shadow-md flex gap-1 border border-gray-200">
        <button 
          onClick={() => setViewMode('map')}
          className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'map' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <MapIcon size={16} />
          Map
        </button>
        <button 
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <List size={16} />
          Stores List
        </button>
      </div>

      {viewMode === 'map' ? (
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
                click: () => setSelectedStore(store),
              }}
            />
          ))}
        </MapContainer>
      ) : (
        <div className="h-full w-full bg-gray-50 p-6 overflow-y-auto pt-20">
          <div className="max-w-4xl mx-auto">
             <h2 className="text-2xl font-bold text-gray-800 mb-6">Registered Stores ({stores.length})</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.map((store) => (
                  <div 
                    key={store.id} 
                    onClick={() => setSelectedStore(store)}
                    className="bg-white p-4 rounded-xl shadow-sm border hover:shadow-md cursor-pointer transition-all flex flex-col gap-2 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-800 group-hover:text-primary transition-colors text-base truncate pr-2">{store.name}</h3>
                      <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wide shrink-0 ${store.type === 'Kiosk' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {store.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 min-h-[2.5em]">{store.address}</p>
                    <div className="mt-auto pt-3 border-t flex justify-between items-center text-xs text-gray-400">
                       <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{store.area}</span>
                       {store.activatorName && <span className="font-medium text-gray-500">TA: {store.activatorName.split(' ')[0]}</span>}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      <Drawer 
        isOpen={!!selectedStore} 
        onClose={() => setSelectedStore(null)}
        data={selectedStore}
      />
    </div>
  );
}
