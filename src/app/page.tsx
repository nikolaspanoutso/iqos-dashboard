"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from "@/components/Layout/Sidebar";
const Map = dynamic(() => import("@/components/Map/Map"), { ssr: false });
import Drawer from "@/components/UI/Drawer";
import StoresList from "@/components/Stores/StoresList";
import HistoryModal from "@/components/UI/HistoryModal";
import { History } from "lucide-react";

import { useAuth } from '@/context/AuthContext';
import AddStoreModal from '@/components/Stores/AddStoreModal';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // App State lifted to Page level
  const [currentView, setCurrentView] = useState<'map' | 'list'>('map');
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  
  const [showAddStore, setShowAddStore] = useState(false);
  const { user } = useAuth(); // Get logged in user

  // Function to fetch stores based on user role/id
  const fetchStores = async () => {
    if (!user) return; // Wait for user

    const params = new URLSearchParams();
    params.set('userId', user.id);
    params.set('role', user.role);

    try {
        const res = await fetch(`/api/stores?${params.toString()}`);
        const data = await res.json();
        if (Array.isArray(data)) {
            setStores(data);
        }
    } catch (err) {
        console.error("Failed to load stores", err);
    }
  };

  useEffect(() => {
    setIsClient(true);
    if (user) {
        fetchStores();
    }
  }, [user]); // Re-fetch when user changes

  const handleSaveStore = async (newStoreData: any) => {
    try {
        const res = await fetch('/api/stores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newStoreData)
        });
        if (res.ok) {
            await fetchStores(); // Refresh list
            setShowAddStore(false);
        } else {
            alert('Failed to save store');
        }
    } catch (e) {
        console.error(e);
        alert('Error saving store');
    }
  };

  if (!isClient) return null;

  const canAddStore = user?.role === 'admin' || user?.role === 'activator';

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
           <StoresList 
                stores={stores} 
                onSelectStore={setSelectedStore} 
                onAddStore={() => setShowAddStore(true)}
                canAddStore={canAddStore}
           />
        )}

        {/* Drawer is GLOBAL now - works for both views */}
        <Drawer 
          isOpen={!!selectedStore} 
          onClose={() => setSelectedStore(null)} 
          data={selectedStore}
        />
        
        {/* Add Store Modal */}
        {showAddStore && (
            <AddStoreModal 
                onClose={() => setShowAddStore(false)}
                onSave={handleSaveStore}
                activatorId={user?.id}
            />
        )}
      </div>

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </main>
  );
}
