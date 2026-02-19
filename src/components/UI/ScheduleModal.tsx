"use client";
import React from 'react';
import { X } from 'lucide-react';
import ScheduleTable from '../Schedule/ScheduleTable';

interface ScheduleModalProps {
  onClose: () => void;
}

export default function ScheduleModal({ onClose }: ScheduleModalProps) {
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-primary">Weekly Schedule</h2>
            <p className="text-sm text-gray-500">Working Hours & Shifts</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-100 p-4 flex flex-col">
           <ScheduleTable />
        </div>

      </div>
    </div>
  );
}
