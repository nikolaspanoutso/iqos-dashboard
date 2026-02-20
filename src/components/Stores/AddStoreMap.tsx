"use client";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Draggable Marker Component
function DraggableMarker({ position, setPosition }: { position: any, setPosition: (pos: any) => void }) {
  const markerRef = useRef(null);
  
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

interface AddStoreMapProps {
    position: { lat: number, lng: number };
    setPosition: (pos: { lat: number, lng: number }) => void;
}

export default function AddStoreMap({ position, setPosition }: AddStoreMapProps) {
  
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

  return (
    <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
        />
        <DraggableMarker position={position} setPosition={setPosition} />
    </MapContainer>
  );
}
