"use client";
import React from 'react';
import { X, Calendar, Clock, MapPin } from 'lucide-react';

interface ScheduleModalProps {
  onClose: () => void;
}

const TEAM_MEMBERS = [
  'Maria Tasiou',
  'Nikos Mousas',
  'Giwrgos Grimanis',
  'Nikolas Panoutsopoulos',
  'Nefeli Merko'
];

const WORKING_DAYS = ['Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const LOCATIONS = ['Pick it (Lamias 23)', 'PAPAZIKOS (Dimitsanas 54)'];

export default function ScheduleModal({ onClose }: ScheduleModalProps) {
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-primary">Weekly Schedule</h2>
            <p className="text-sm text-gray-500">Working Hours & Locations</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="grid gap-6">
            {TEAM_MEMBERS.map((member, index) => (
              <div key={member} className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4 mb-4 border-b pb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                    {member.charAt(0)}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">{member}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {WORKING_DAYS.map((day) => (
                    <div key={day} className="bg-gray-50 p-3 rounded border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={14} className="text-teal-600" />
                        <span className="font-bold text-sm text-gray-700">{day}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock size={12} />
                          <span>10:00 - 18:00</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-gray-600">
                          <MapPin size={12} className="mt-0.5" />
                          <span>
                            {/* Rotate locations for variety or list both as requested */}
                            {index % 2 === 0 ? LOCATIONS[0] : LOCATIONS[1]}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
