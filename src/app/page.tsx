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
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { isPromo } from '@/lib/promo';

function DashboardContent() {
  const [isClient, setIsClient] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const searchParams = useSearchParams();
  const initialView = (searchParams.get('view') as 'map' | 'list') || 'map';

  // App State lifted to Page level
  const [currentView, setCurrentView] = useState<'map' | 'list'>(initialView);
  
  // Sync view state if search param changes
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'map' || viewParam === 'list') {
      setCurrentView(viewParam);
    }
  }, [searchParams]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreMap, setSelectedStoreMap] = useState<any>(null);
  const [selectedStoreList, setSelectedStoreList] = useState<any>(null);
  
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
            // Apply Global UI Filter to hide system stores
            const visibleStores = data.filter((s: any) => s.name !== 'System - Specialist Adjustments');
            setStores(visibleStores);
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

  // Auto-select store from URL param and "consume" it
  useEffect(() => {
    const storeId = searchParams.get('selectStoreId');
    if (storeId && stores.length > 0) {
        const store = stores.find(s => s.id === storeId);
        if (store) {
            setSelectedStoreMap(store);
            // Also ensure we are in map view if a store is selected via URL
            if (currentView !== 'map') {
              setCurrentView('map');
            }
            
            // "Consume" the URL parameter so it doesn't force the view again if user switches
            const params = new URLSearchParams(window.location.search);
            params.delete('selectStoreId');
            const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
            window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
        }
    }
  }, [searchParams, stores]); // Removed currentView from dependencies to prevent infinite loops

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

  const filteredStores = user?.role === 'specialist' ? stores.filter(s => isPromo(s.name)) : stores;

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
           <Map 
             stores={filteredStores} 
             selectedStore={selectedStoreMap}
             onSelectStore={setSelectedStoreMap} 
           />
        ) : (
           <StoresList 
                stores={filteredStores} 
                onSelectStore={setSelectedStoreList} 
                onAddStore={() => setShowAddStore(true)}
                canAddStore={canAddStore}
           />
        )}

        {/* Drawer is GLOBAL now - works for both views independently */}
        <Drawer 
          isOpen={currentView === 'map' ? !!selectedStoreMap : !!selectedStoreList} 
          onClose={() => currentView === 'map' ? setSelectedStoreMap(null) : setSelectedStoreList(null)} 
          data={currentView === 'map' ? selectedStoreMap : selectedStoreList}
          onStoreUpdate={fetchStores}
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

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-teal-600 font-bold">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
