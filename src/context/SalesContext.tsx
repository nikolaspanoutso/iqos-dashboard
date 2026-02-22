"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Types based on Prisma Schema but adapted for UI
export interface DailyStat {
  date: string;
  userId: string;
  acquisitionP1: number;
  acquisitionP4: number;
  offtakeP5: number;
  workingDays: number;
}

export interface SalesData {
  date: string;
  people: Record<string, DailyStat>;
}

export interface StoreComment {
  id?: string;
  storeId: string;
  userId: string;
  text: string;
  timestamp: string; // ISO string from DB
}

interface SalesContextType {
  data: SalesData[];
  totals: any;
  rawData: any;
  loading: boolean;
  addSale: (storeId: string, type: 'P1' | 'P4' | 'P5', count: number) => void;
  comments: StoreComment[];
  addComment: (storeId: string, text: string) => void;
  historyEdits: any; // Deprecated, but kept for type compat if needed (though we move logic to DB)
  specialists: string[];
  schedules: any[]; // [ { userId, date, status } ]
  updateDailySales: (date: string, userId: string, p1: number, p4: number, p5: number) => void;
  updateUserStatus: (date: string, userId: string, status: string) => void;
  getStoreSales: (storeId: string) => { p1: number, p4: number };
  settings: Record<string, string>;
  updateSetting: (key: string, value: string) => Promise<void>;
  updateUserTarget: (name: string, data: any) => Promise<void>;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  const [data, setData] = useState<SalesData[]>([]);
  const [totals, setTotals] = useState<any>({});
  const [rawData, setRawData] = useState<any>(null);
  const [comments, setComments] = useState<StoreComment[]>([]);
  const [specialists, setSpecialists] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  // Cache for local added sales to show in Drawer immediately (optional optimization)
  const [localSales, setLocalSales] = useState<any[]>([]);

  // Fetch Data from API
  const refreshData = async () => {
    try {
      const splitTime = performance.now();
      const [salesRes, commentsRes, settingsRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/comments'),
        fetch('/api/settings')
      ]);

      const salesData = await salesRes.json();
      const commentsData = await commentsRes.json();
      const settingsData = await settingsRes.json();

      // Transform DB Flat Stats -> UI Nested Structure of SalesData[]
      const groupedByDate: Record<string, SalesData> = {};
      
      // Initialize if empty to ensure we have structure? 
      // Or just map existing stats.
      (salesData.dailyStats as DailyStat[])?.forEach(stat => {
        if (!groupedByDate[stat.date]) {
          groupedByDate[stat.date] = { date: stat.date, people: {} };
        }
        groupedByDate[stat.date].people[stat.userId] = stat;
      });
      
      // Sort by Date (DD/MM/YYYY) - naive sort for now (or use moment/date-fns)
      const sortedData = Object.values(groupedByDate).sort((a,b) => {
         const [d1, m1, y1] = a.date.split('/').map(Number);
         const [d2, m2, y2] = b.date.split('/').map(Number);
         return new Date(y1, m1-1, d1).getTime() - new Date(y2, m2-1, d2).getTime();
      });

      setData(sortedData);
      setTotals(salesData.aggregatedStats);
      setRawData(salesData);
      setSpecialists(salesData.specialists || []);
      setSchedules(salesData.schedules || []);
      setComments(commentsData); // timestamps are strings now
      setSettings(settingsData || {});
      
    } catch (error) {
      console.error("API Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    refreshData();
  }, []);

  const addSale = async (storeId: string, type: 'P1' | 'P4' | 'P5', count: number) => {
    if (!user) return;
    
    // Optimistic UI update (optional, skipping for simplicity/reliability first)
    // Send to API
    try {
      await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.name,
          storeId,
          type, // Now supports 'P5'
          count
        })
      });
      refreshData(); // Re-fetch to update totals
    } catch (e) {
      console.error("Failed to add sale", e);
    }
  };

  const addComment = async (storeId: string, text: string) => {
    if (!user) return;
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.name,
          storeId,
          text
        })
      });
      refreshData(); 
    } catch (e) {
      console.error(e);
    }
  };

  const updateDailySales = async (date: string, userId: string, p1: number, p4: number, p5: number) => {
    try {
      const res = await fetch('/api/history', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, userId, p1, p4, p5 })
      });
      if (!res.ok) throw new Error('Failed to update sales');
      refreshData();
    } catch (error) {
      console.error(error);
      alert('Σφάλμα κατά την ενημέρωση των πωλήσεων');
    }
  };

  const updateUserStatus = async (date: string, userId: string, status: string) => {
    try {
      const res = await fetch('/api/history', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, userId, status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      refreshData();
    } catch (error) {
      console.error(error);
      alert('Σφάλμα κατά την ενημέρωση του status');
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        });
        refreshData();
    } catch (e) {
        console.error(e);
    }
  };

  const updateUserTarget = async (name: string, targetData: any) => {
    try {
        await fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, ...targetData })
        });
        refreshData();
    } catch (e) {
        console.error(e);
    }
  };

  const getStoreSales = (storeId: string) => {
    // This was used for the + - widget state? 
    // Or to just show what was added *in this session*?
    // In API version, keeping track of "session added" might be separate from "total history".
    // For now returning 0,0 as we haven't implemented fetching per-store-live-sales yet efficiently.
    return { p1: 0, p4: 0 };
  };

  return (
    <SalesContext.Provider value={{ 
      data, 
      totals, 
      rawData,
      loading, 
      addSale, 
      addComment, 
      comments, 
      getStoreSales,
      specialists,
      schedules,
      historyEdits: {}, // No longer needed as separate state
      updateDailySales,
      updateUserStatus,
      settings,
      updateSetting,
      updateUserTarget
    }}>
      {children}
    </SalesContext.Provider>
  );
}

export function useSales() {
  const context = useContext(SalesContext);
  if (context === undefined) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
}
