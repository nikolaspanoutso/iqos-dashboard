"use client";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Drawer from '../UI/Drawer';
import { useAuth } from '@/context/AuthContext';

// Fix for default marker icons in Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34], 
  shadowSize: [41, 41]
});

// Custom Markers with Assigned Users
const MARKERS_DATA = [
  {
    id: 1,
    name: "Pick it",
    address: "Lamias 23, Athens 115 23",
    lat: 37.99024,
    lng: 23.76180,
    type: "Kiosk",
    stock: { heets: 120, terea: 85, fiit: 40 },
    assignedTo: ['spec1', 'Maria Tasiou', 'spec3', 'Giwrgos Grimanis', 'spec5', 'Nefeli Merko'] // Assign to specific ID or Name
  },
  {
    id: 2,
    name: "ΠΑΠΑΖΗΚΟΣ",
    address: "Dimitsanas 54, Ampelokipoi, 115 22",
    lat: 37.98800,
    lng: 23.76600,
    type: "Kiosk",
    stock: { heets: 150, terea: 90, fiit: 60 },
    assignedTo: ['spec2', 'Nikos Mousas', 'spec4', 'Nikolas Panoutsopoulos'] // Assign to specific ID or Name
  }
];

export default function Map() {
  const { user } = useAuth();
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [visibleMarkers, setVisibleMarkers] = useState(MARKERS_DATA);

  // Center map between the two points
  const centerPosition: [number, number] = [37.98912, 23.76390];

  useEffect(() => {
    if (!user) return;

    if (user.role === 'admin' || user.role === 'activator') {
      // Admins and Activators see everything
      setVisibleMarkers(MARKERS_DATA);
    } else {
      // Specialists only see their assigned stores
      // Check if user ID or Name is in the assignedTo array
      const filtered = MARKERS_DATA.filter(m => 
        m.assignedTo.includes(user.id) || m.assignedTo.includes(user.name)
      );
      setVisibleMarkers(filtered);
    }
  }, [user]);

  return (
    <div className="relative w-full h-full z-0">
      <MapContainer 
        center={centerPosition} 
        zoom={15} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {visibleMarkers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={[marker.lat, marker.lng]} 
            icon={icon}
            eventHandlers={{
              click: () => {
                setSelectedMarker(marker);
              },
            }}
          >
           <Popup>
             <div className="font-sans">
               <strong className="block text-sm text-primary">{marker.name}</strong>
               <span className="text-xs text-gray-500">{marker.address}</span>
             </div>
           </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Drawer */}
      <Drawer 
        isOpen={!!selectedMarker} 
        onClose={() => setSelectedMarker(null)} 
        data={selectedMarker} 
      />
    </div>
  );
}
