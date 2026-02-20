"use client";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, Save, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Dynamic import for Map to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const useMapEvents = dynamic(
    () => import('react-leaflet').then((mod) => mod.useMapEvents),
    { ssr: false }
);

interface AddStoreModalProps {
  onClose: () => void;
  onSave: (store: any) => Promise<void>;
  activatorId?: string;
}

// Draggable Marker Component
function DraggableMarker({ position, setPosition }: { position: any, setPosition: (pos: any) => void }) {
  const markerRef = useRef(null);
  
  // We need to access Leaflet icon via simple import or assume global L if simpler, 
  // but better to rely on what Map.tsx used or default.
  // To avoid icon issues, we can try to use the same fix as Map.tsx or just default.
  // For now let's hope globally set icons in Page/Map work, or we import L.
    const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker: any = markerRef.current;
        if (marker != null) {
          setPosition(marker.getLatLng());
        }
      },
    }),
    [setPosition],
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

// Fix for icon
// Import L inside effect to avoid SSR issues

export default function AddStoreModal({ onClose, onSave, activatorId }: AddStoreModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Store',
    address: '',
    area: 'Athina',
  });
  const [position, setPosition] = useState({ lat: 37.9838, lng: 23.7275 }); // Default Athens
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave({
        ...formData,
        lat: position.lat,
        lng: position.lng,
        activatorId
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="text-primary" /> Add New Store
          </h2>
          <button onClick={onClose}><X className="text-gray-500 hover:text-gray-800" /></button>
        </div>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
             
             {/* Left: Form */}
             <form onSubmit={handleSubmit} className="p-6 w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Store Name</label>
                    <input 
                        required
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. My Kiosk"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                    <select 
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                        <option value="Store">Store</option>
                        <option value="Kiosk">Kiosk</option>
                        <option value="Mini Market">Mini Market</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Area</label>
                    <input 
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none"
                        value={formData.area}
                        onChange={e => setFormData({...formData, area: e.target.value})}
                         placeholder="e.g. Zografou"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                    <input 
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                         placeholder="e.g. Oulof Palme 15"
                    />
                </div>

                <div className="mt-auto pt-4">
                    <div className="text-xs text-gray-500 mb-2">
                        Drag the pin on the map to set exact location.
                        <div className="font-mono mt-1">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? 'Saving...' : (
                            <>
                                <Save size={18} /> Save Store
                            </>
                        )}
                    </button>
                </div>
             </form>

             {/* Right: Map */}
             <div className="w-full md:w-2/3 bg-gray-100 h-[400px] md:h-auto relative z-0">
                <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />
                    <DraggableMarker position={position} setPosition={setPosition} />
                </MapContainer>
             </div>
        </div>
      </div>
    </div>
  );
}
