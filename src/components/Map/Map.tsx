"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, X, MapPin } from 'lucide-react';

interface MapProps {
  stores: any[];
  selectedStore: any | null;
  onSelectStore: (store: any) => void;
}

// Sub-component to handle map centering and zoom
function MapController({ center, zoom, isSelection }: { center: [number, number], zoom: number, isSelection: boolean }) {
  const map = useMap();
  useEffect(() => {
    const targetZoom = isSelection ? Math.max(map.getZoom(), 17) : zoom;
    map.flyTo(center, targetZoom, {
      duration: 1.5
    });
  }, [center, zoom, map, isSelection]);
  return null;
}

export default function Map({ stores, selectedStore, onSelectStore }: MapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fix Leaflet icons (SSR issue)
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
    }
  }, []);

  if (!isMounted) return <div className="h-full w-full bg-gray-100 animate-pulse" />;
  
  // Custom Icons logic
  const getIcon = (type: string) => {
     if (typeof window === 'undefined') return null;
     const L = require('leaflet');
     
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

  const filteredOptions = stores.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectStore = (store: any) => {
    setSearchQuery(store.name);
    setShowDropdown(false);
    onSelectStore(store);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowDropdown(false);
    onSelectStore(null);
  };

  const mapCenter: [number, number] = selectedStore ? [selectedStore.lat, selectedStore.lng] : [37.9838, 23.7275];
  const mapZoom = 12; // Default zoom when not selected

  return (
    <div className="h-full w-full relative z-0">
        {/* Floating Search Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[320px] sm:w-[400px] z-[1000]">
            <div className="relative group">
                <div className="flex items-center bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-1.5 transition-all focus-within:ring-2 focus-within:ring-primary/30">
                    <div className="pl-3 pr-2 text-gray-400">
                      <Search size={18} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search for a store..."
                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-800 placeholder:text-gray-400 py-1"
                        value={searchQuery}
                        onFocus={() => setShowDropdown(true)}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowDropdown(true);
                            if (!e.target.value) onSelectStore(null);
                        }}
                    />
                    {searchQuery && (
                        <button 
                            onClick={clearSearch}
                            className="p-1 px-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Dropdown Results */}
                {showDropdown && searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-[300px] overflow-y-auto p-1.5">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map(store => (
                                    <button
                                        key={store.id}
                                        onClick={() => handleSelectStore(store)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 rounded-xl transition-colors text-left group"
                                    >
                                        <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <MapPin size={14} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-800">{store.name}</div>
                                            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{store.area}</div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-gray-400 text-sm italic">
                                    No stores found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="bottomright" />
          
          <MapController 
            center={mapCenter} 
            zoom={mapZoom} 
            isSelection={!!selectedStore} 
          />

          {stores.map((store) => (
            <Marker 
              key={store.id} 
              position={[store.lat || 37.9838, store.lng || 23.7275]}
              icon={getIcon(store.type)}
              eventHandlers={{
                click: () => onSelectStore(store),
              }}
            >
            </Marker>
          ))}
        </MapContainer>
    </div>
  );
}
