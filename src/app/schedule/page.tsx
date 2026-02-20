"use client";
import { useState } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import AdvancedScheduleTable from '@/components/Schedule/AdvancedScheduleTable';
import AddShiftsModal from '@/components/Schedule/AddShiftsModal'; // Import Modal
import { useAuth } from '@/context/AuthContext';
import { Lock, Unlock, Plus } from 'lucide-react';

export default function SchedulePage() {
  const { user, loading } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isScheduleLocked, setIsScheduleLocked] = useState(false); // Simple lock state
  const [triggerRefresh, setTriggerRefresh] = useState(0); // To force table reload

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 overflow-hidden">
        <div className="mb-6 flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
                    Schedule Management
                    {isScheduleLocked && <Lock className="text-red-500" size={24} />}
                </h1>
                <p className="text-gray-500">
                    {user?.role === 'specialist' 
                        ? 'View your shifts and update your daily status.' 
                        : 'Manage team shifts, assign stores, and track attendance.'}
                </p>
            </div>
            
            {user?.role !== 'specialist' && (
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsScheduleLocked(!isScheduleLocked)}
                        className={`px-4 py-2 rounded-lg font-bold shadow-sm border flex items-center gap-2 transition-colors ${isScheduleLocked ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        {isScheduleLocked ? <><Unlock size={18}/> Unlock Schedule</> : <><Lock size={18}/> Close Schedule</>}
                    </button>

                    <button 
                        onClick={() => setShowAddModal(true)}
                        disabled={isScheduleLocked}
                        className="bg-primary text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} />
                        Add Shifts
                    </button>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-hidden">
            <AdvancedScheduleTable key={triggerRefresh} isLocked={isScheduleLocked} />
        </div>

        {/* Modal */}
        {showAddModal && (
            <AddShiftsModal 
                onClose={() => setShowAddModal(false)} 
                onSave={() => {
                    setShowAddModal(false);
                    setTriggerRefresh(prev => prev + 1); // Refresh table
                }} 
            />
        )}
      </div>
    </AppLayout>
  );
}
