"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from "@/components/Layout/Sidebar";
const Map = dynamic(() => import("@/components/Map/Map"), { ssr: false });
import Drawer from "@/components/UI/Drawer";
import StoresList from "@/components/Stores/StoresList";
import HistoryModal from "@/components/UI/HistoryModal";
import { History } from "lucide-react";

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // App State lifted to Page level
  const [currentView, setCurrentView] = useState<'map' | 'list'>('map');
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Fetch stores centrally
    fetch('/api/stores')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStores(data);
        }
      })
      .catch(err => console.error("Failed to load stores", err));
  }, []);

  if (!isClient) return null;

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
      />
      
      <div className="flex-1 relative h-full">
         {/* Top Right History Button (Visible in both views) */}
         <button 
           onClick={() => setShowHistory(true)}
           className="absolute top-4 right-4 z-[1000] bg-white p-2 px-4 rounded-full shadow-lg text-primary font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors border border-gray-100"
         >
           <History size={18} />
           <span>History</span>
         </button>

        {currentView === 'map' ? (
           <Map stores={stores} onSelectStore={setSelectedStore} />
        ) : (
           <StoresList stores={stores} onSelectStore={setSelectedStore} />
        )}

        {/* Drawer is GLOBAL now - works for both views */}
        <Drawer 
          isOpen={!!selectedStore} 
          onClose={() => setSelectedStore(null)} 
          data={selectedStore}
        />
      </div>

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </main>
  );
}
