"use client";
import { useState } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import AdvancedScheduleTable from '@/components/Schedule/AdvancedScheduleTable';
import AddShiftsModal from '@/components/Schedule/AddShiftsModal'; // Import Modal
import { useAuth } from '@/context/AuthContext';
import { Plus, X as CloseIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SchedulePage() {
  const { user, loading } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [triggerRefresh, setTriggerRefresh] = useState(0); // To force table reload
  const router = useRouter();

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 overflow-hidden relative">
        {/* Navigation / Exit Button */}
        <button 
            onClick={() => router.push('/')}
            className="absolute top-6 right-6 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200 shadow-sm bg-white"
        >
            <CloseIcon size={24} />
        </button>

        <div className="mb-6 flex justify-between items-end pr-14">
            <div>
                <h1 className="text-3xl font-black text-gray-900 mb-2">
                    Schedule Management
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
                        onClick={() => setShowAddModal(true)}
                        className="bg-primary text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-primary-dark transition-colors flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add Shifts
                    </button>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-hidden">
            <AdvancedScheduleTable key={triggerRefresh} isLocked={false} />
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
