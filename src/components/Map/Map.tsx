"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Drawer from '../UI/Drawer';
import { useAuth } from '@/context/AuthContext';

// We do NOT import L from 'leaflet' at top level to avoid SSR issues if possible.
// Or we just guard the icon creation.
import L from 'leaflet';

// Move default Icon fixes inside component or check window

const MARKERS_DATA = [
  {
    id: 1,
    name: "Pick it",
    address: "Lamias 23, Athens 115 23",
    lat: 37.99024,
    lng: 23.76180,
    type: "Kiosk",
    stock: { heets: 120, terea: 85, fiit: 40 },
    assignedTo: ['spec1', 'Maria Tasiou', 'spec3', 'Giwrgos Grimanis', 'spec5', 'Nefeli Merko'] 
  },
  {
    id: 2,
    name: "ΠΑΠΑΖΗΚΟΣ",
    address: "Dimitsanas 54, Ampelokipoi, 115 22",
    lat: 37.98800,
    lng: 23.76600,
    type: "Kiosk",
    stock: { heets: 150, terea: 90, fiit: 60 },
    assignedTo: ['spec2', 'Nikos Mousas', 'spec4', 'Nikolas Panoutsopoulos'] 
  }
];

export default function Map() {
  const { user } = useAuth();
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [visibleMarkers, setVisibleMarkers] = useState(MARKERS_DATA);
  const [customIcon, setCustomIcon] = useState<any>(null);

  useEffect(() => {
    // Initialize Icon purely on client side
    if (typeof window !== 'undefined') {
      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34], 
        shadowSize: [41, 41]
      });
      setCustomIcon(icon);
    }
  }, []);

  // ... (filtering logic)
  const centerPosition: [number, number] = [37.98912, 23.76390];

  useEffect(() => {
      // ... same filtering logic
       if (!user) return;
    if (user.role === 'admin' || user.role === 'activator') {
      setVisibleMarkers(MARKERS_DATA);
    } else {
      const filtered = MARKERS_DATA.filter(m => 
        m.assignedTo.includes(user.id) || m.assignedTo.includes(user.name)
      );
      setVisibleMarkers(filtered);
    }
  }, [user]);

  if (!customIcon) return null; // Don't render map until icon is ready (Client side)

  return (
     // ... same JSX
     <MapContainer center={centerPosition} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer ... />
        {visibleMarkers.map(marker => (
           <Marker 
             key={marker.id} 
             position={[marker.lat, marker.lng]} 
             icon={customIcon} // Use state icon
             eventHandlers={{ click: () => setSelectedMarker(marker) }}
           >
             <Popup>...</Popup>
           </Marker>
        ))}
     </MapContainer>
     // ...
  );
}
