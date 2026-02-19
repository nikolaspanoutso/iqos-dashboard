"use client";
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const STATUS_OPTIONS = [
  { value: 'off', label: 'OFF', color: 'bg-gray-100 text-gray-400' },
  { value: 'work', label: 'WORK', color: 'bg-green-100 text-green-700' },
  { value: 'leave', label: 'LEAVE', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'sick', label: 'SICK', color: 'bg-red-100 text-red-700' },
];

export default function ScheduleTable() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dummy users for now - ideally fetch from API
  const users = [
      { id: '1', name: 'Maria' },
      { id: '2', name: 'John' },
      { id: '3', name: 'Nikos' },
      { id: '4', name: 'Anna' }
  ];

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const fetchSchedule = async () => {
    setLoading(true);
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
    
    try {
        const res = await fetch(`/api/schedule?start=${start}&end=${end}`);
        const data = await res.json();
        setSchedules(data);
    } catch (error) {
        console.error("Failed to fetch schedule", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [currentDate]);

  const handleStatusChange = async (userId: string, day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    // Find current status
    const currentEntry = schedules.find(s => 
        s.userId === userId && 
        new Date(s.date).getDate() === day
    );
    
    // Cycle through statuses
    const currentIndex = STATUS_OPTIONS.findIndex(opt => opt.value === (currentEntry?.status || 'off'));
    const nextStatus = STATUS_OPTIONS[(currentIndex + 1) % STATUS_OPTIONS.length];

    // Optimistic Update
    const newEntry = { 
        userId, 
        date: date.toISOString(), 
        status: nextStatus.value 
    };
    
    setSchedules(prev => {
        const filtered = prev.filter(s => !(s.userId === userId && new Date(s.date).getDate() === day));
        return [...filtered, newEntry];
    });

    // API Call
    try {
        await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEntry)
        });
    } catch (error) {
        console.error("Failed to save schedule", error);
        // Revert on error (could reload)
    }
  };

  const getStatus = (userId: string, day: number) => {
    const entry = schedules.find(s => 
        s.userId === userId && 
        new Date(s.date).getDate() === day
    );
    return STATUS_OPTIONS.find(opt => opt.value === (entry?.status || 'off')) || STATUS_OPTIONS[0];
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border overflow-hidden flex flex-col h-[600px] w-full max-w-[95vw] mx-auto">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="bg-primary/10 text-primary p-2 rounded-lg">📅</span>
                Team Schedule
            </h2>
            <div className="flex items-center gap-4">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                <span className="font-bold text-lg min-w-[150px] text-center">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ChevronRight size={20} /></button>
            </div>
            <div className="flex gap-2 text-xs">
                {STATUS_OPTIONS.map(opt => (
                    <div key={opt.value} className={`px-2 py-1 rounded font-bold ${opt.color}`}>{opt.label}</div>
                ))}
            </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">
            {loading ? (
                <div className="h-full flex items-center justify-center text-gray-400 gap-2">
                    <Loader2 className="animate-spin" /> Loading schedule...
                </div>
            ) : (
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky top-0 left-0 z-20 bg-gray-100 p-2 border-b w-40 text-left text-xs font-bold text-gray-500 uppercase tracking-wider backdrop-blur-sm shadow-sm">
                                Specialist
                            </th>
                            {days.map(day => {
                                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                return (
                                    <th 
                                        key={day} 
                                        className={`sticky top-0 z-10 bg-gray-50 p-2 border-b text-center text-xs min-w-[40px] ${isWeekend ? 'bg-orange-50/50 text-orange-800' : 'text-gray-600'}`}
                                    >
                                        <div className="font-bold">{day}</div>
                                        <div className="text-[9px] opacity-70">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td className="sticky left-0 bg-white z-10 p-3 border-b border-r font-medium text-sm text-gray-700 shadow-sm">
                                    {u.name}
                                </td>
                                {days.map(day => {
                                    const status = getStatus(u.id, day);
                                    return (
                                        <td 
                                            key={day} 
                                            onClick={() => handleStatusChange(u.id, day)}
                                            className="border-b border-r p-1 text-center cursor-pointer hover:brightness-95 transition-all text-[10px] font-bold h-12 select-none relative group"
                                        >
                                           <div className={`w-full h-full rounded flex items-center justify-center ${status.color}`}>
                                              {status.label === 'OFF' ? '' : status.label.substring(0,1)}
                                           </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
  );
}
