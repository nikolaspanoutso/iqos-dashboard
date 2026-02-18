"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from "@/components/Layout/Sidebar";
const Map = dynamic(() => import("@/components/Map/Map"), { ssr: false });
import Drawer from "@/components/UI/Drawer";
import HistoryModal from "@/components/UI/HistoryModal";
import { History } from "lucide-react";

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 relative h-full">
         {/* Top Right History Button */}
         <button 
           onClick={() => setShowHistory(true)}
           className="absolute top-4 right-4 z-[1000] bg-white p-3 rounded shadow-md text-primary font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors"
         >
           <History size={20} />
           <span>History</span>
         </button>

        <Map />
      </div>

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </main>
  );
}
