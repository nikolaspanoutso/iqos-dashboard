"use client";
import React from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import AdvancedScheduleTable from '@/components/Schedule/AdvancedScheduleTable';
import { useAuth } from '@/context/AuthContext';

export default function SchedulePage() {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 overflow-hidden">
        <div className="mb-6 flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-black text-gray-900 mb-2">Schedule Management</h1>
                <p className="text-gray-500">
                    {user?.role === 'specialist' 
                        ? 'View your shifts and update your daily status.' 
                        : 'Manage team shifts, assign stores, and track attendance.'}
                </p>
            </div>
            
            {user?.role !== 'specialist' && (
                <button className="bg-primary text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-primary-dark transition-colors">
                    + Add Shifts
                </button>
            )}
        </div>

        <div className="flex-1 overflow-hidden">
            <AdvancedScheduleTable />
        </div>
      </div>
    </AppLayout>
  );
}
