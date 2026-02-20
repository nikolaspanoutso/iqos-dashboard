"use client";
import React, { useState } from 'react';
import { X, Search, Save, Edit2 } from 'lucide-react';
import { useSales } from '@/context/SalesContext';
import { useAuth } from '@/context/AuthContext';

interface HistoryModalProps {
  onClose: () => void;
}

export default function HistoryModal({ onClose }: HistoryModalProps) {
  const { data, updateDailySales, updateUserStatus, specialists, schedules } = useSales();
  const { user } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState('02'); // Default to February
  const [viewedUser, setViewedUser] = useState(
    (user?.role === 'specialist') ? user.name : (specialists[0] || 'Maria Tasiou')
  );
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');

  // Update viewedUser if specialists list loads after initial render for non-specialists
  React.useEffect(() => {
    if (user?.role !== 'specialist' && specialists.length > 0 && !specialists.includes(viewedUser)) {
        setViewedUser(specialists[0]);
    }
  }, [specialists, user, viewedUser]);

  // Helper to generate all days of the selected month
  const generateMonthDays = (month: string) => {
    const year = 2026; // Current operating year
    const now = new Date();
    const currentMonthNum = (now.getMonth() + 1).toString().padStart(2, '0');
    
    const daysInMonth = new Date(year, parseInt(month), 0).getDate();
    // If month is current, limit to current day
    const limit = (month === currentMonthNum) ? now.getDate() : daysInMonth;

    const days = [];
    for (let i = 1; i <= limit; i++) {
        const dayStr = i.toString().padStart(2, '0');
        days.push(`${dayStr}/${month}/${year}`);
    }
    return days;
  };

  // Filter Data based on Month and User
  const allMonthDates = generateMonthDays(selectedMonth);
  
  // Transform data into a lookup map for easy access
  const statsMap: Record<string, any> = {};
  data.forEach((day: any) => {
      if (day.people[viewedUser]) {
          statsMap[day.date] = day.people[viewedUser];
      }
  });

  // Schedule lookup map
  const statusMap: Record<string, string> = {};
  schedules?.forEach(s => {
      if (s.userId === viewedUser) {
          statusMap[s.date] = s.status;
      }
  });

  const getStatusStyle = (status: string) => {
      switch (status) {
          case 'Work': return 'bg-teal-100 text-teal-800 border-teal-200';
          case 'Sick': return 'bg-red-100 text-red-800 border-red-200';
          case 'Off': return 'bg-gray-100 text-gray-800 border-gray-200';
          case 'Leave': return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'Training': return 'bg-purple-100 text-purple-800 border-purple-200';
          case 'AB': return 'bg-orange-100 text-orange-800 border-orange-200';
          default: return 'bg-gray-50 text-gray-400 border-gray-100';
      }
  };

  const filteredRows = allMonthDates.map(date => {
    const stats = statsMap[date] || { acquisitionP1: 0, acquisitionP4: 0, offtakeP5: 0 };
    const status = statusMap[date] || 'Off'; // Default to Off if no schedule
    return {
      date,
      status,
      ...stats
    };
  });

  const handleStartEdit = (key: string, currentValue: number) => {
    setEditingCell(key);
    setTempValue(currentValue.toString());
  };

  const handleSaveEdit = (date: string, field: 'p1' | 'p4' | 'p5', stats: any) => {
    const val = parseInt(tempValue);
    if (!isNaN(val)) {
        // Ensure we pass all 3 values to the update function to preserve existing data
      if (field === 'p1') {
        updateDailySales(date, viewedUser, val, stats.p4, stats.p5);
      } else if (field === 'p4') {
        updateDailySales(date, viewedUser, stats.p1, val, stats.p5);
      } else {
        updateDailySales(date, viewedUser, stats.p1, stats.p4, val);
      }
    }
    setEditingCell(null);
  };
  
  const canEdit = () => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'activator') return true;
    return user.role === 'specialist' && user.name === viewedUser;
  };

  const isEditable = canEdit();

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden relative border border-gray-300">
        
        {/* Header content ... */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               <span className="bg-teal-600 text-white text-xs px-2 py-1 rounded">XLS</span>
               History
             </h2>
             
             {/* Admin User Selector - Only shows Specialists */}
             {(user?.role === 'admin' || user?.role === 'activator') && (
               <select 
                 value={viewedUser} 
                 onChange={(e) => setViewedUser(e.target.value)}
                 className="text-sm p-1 border rounded bg-white font-medium text-teal-700"
               >
                 {specialists.map(u => <option key={u} value={u}>{u}</option>)}
                 {specialists.length === 0 && <option value={viewedUser}>{viewedUser}</option>}
               </select>
             )}
             
             {/* Specialist Name Display */}
             {user?.role === 'specialist' && (
                <span className="font-medium text-teal-700 border-l pl-4">{user.name}</span>
             )}
          </div>

          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Month Tabs */}
        <div className="flex bg-gray-100 border-b">
          <button 
            onClick={() => setSelectedMonth('01')}
            className={`px-6 py-2 text-sm font-bold transition-colors border-r ${selectedMonth === '01' ? 'bg-white text-teal-700 border-t-2 border-t-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            January
          </button>
          <button 
            onClick={() => setSelectedMonth('02')}
            className={`px-6 py-2 text-sm font-bold transition-colors border-r ${selectedMonth === '02' ? 'bg-white text-teal-700 border-t-2 border-t-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            February
          </button>
        </div>

        {/* Excel Table */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="p-2 border border-gray-300 font-semibold text-gray-700 w-[20%] bg-gray-100">Date</th>
                <th className="p-2 border border-gray-300 font-semibold text-gray-700 text-center w-[15%] bg-gray-100">Status</th>
                <th className="p-2 border border-gray-300 font-semibold text-gray-700 text-center w-[20%] bg-gray-100">P1</th>
                <th className="p-2 border border-gray-300 font-semibold text-gray-700 text-center w-[20%] bg-gray-100">P4</th>
                <th className="p-2 border border-gray-300 font-semibold text-purple-700 text-center w-[25%] bg-gray-100">P5 Offtake</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row: any, index: number) => {
                 const currentStats = {  
                   p1: row.acquisitionP1, 
                   p4: row.acquisitionP4,
                   p5: row.offtakeP5
                 };

                 const isToday = row.date === new Date().toLocaleDateString('en-GB');

                 return (
                  <tr key={row.date} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isToday ? 'border-l-4 border-l-teal-600' : ''}`}>
                    <td className="p-3 border border-gray-300">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800">{row.date}</span>
                        {isToday && <span className="text-[10px] text-teal-600 font-bold uppercase">Today</span>}
                      </div>
                    </td>

                    <td className="p-2 border border-gray-300 text-center">
                        {isEditable ? (
                            <select
                                value={row.status}
                                onChange={(e) => updateUserStatus(row.date, viewedUser, e.target.value)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border outline-none cursor-pointer ${getStatusStyle(row.status)}`}
                            >
                                <option value="Work">WORK</option>
                                <option value="Sick">SICK</option>
                                <option value="Off">OFF</option>
                                <option value="Leave">LEAVE</option>
                                <option value="Training">TRAINING</option>
                                <option value="AB">AB</option>
                            </select>
                        ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(row.status)}`}>
                                {row.status.toUpperCase()}
                            </span>
                        )}
                    </td>
                    
                    {/* P1 Cell */}
                    <td className="p-0 border border-gray-300 text-center relative h-12 align-middle">
                      {editingCell === `${row.date}_${viewedUser}_p1` ? (
                        <div className="flex items-center h-full">
                           <button 
                            onClick={() => setTempValue((parseInt(tempValue) - 1).toString())}
                            className="w-8 h-full bg-red-50 hover:bg-red-100 text-red-600 font-bold border-r"
                           >-</button>
                           <input 
                            autoFocus
                            type="number" 
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(row.date, 'p1', currentStats)}
                            className="flex-1 w-full h-full text-center focus:bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                           />
                           <button 
                            onClick={() => setTempValue((parseInt(tempValue) + 1).toString())}
                            className="w-8 h-full bg-green-50 hover:bg-green-100 text-green-600 font-bold border-l"
                           >+</button>
                           <div className="absolute right-[-40px] top-0 bottom-0 flex items-center gap-1 z-20">
                             <button 
                                onClick={() => handleSaveEdit(row.date, 'p1', currentStats)}
                                className="p-1.5 bg-green-600 text-white rounded shadow-sm hover:bg-green-700"
                                title="Save"
                             >
                               <Save size={14} />
                             </button>
                             <button 
                                onClick={() => setEditingCell(null)}
                                className="p-1.5 bg-gray-500 text-white rounded shadow-sm hover:bg-gray-600"
                                title="Cancel"
                             >
                               <X size={14} />
                             </button>
                           </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => isEditable && handleStartEdit(`${row.date}_${viewedUser}_p1`, currentStats.p1)}
                          className={`w-full h-full flex items-center justify-center text-lg font-medium group ${isEditable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                        >
                           {currentStats.p1}
                           {isEditable && <Edit2 size={12} className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100" />}
                        </div>
                      )}
                    </td>

                     {/* P4 Cell */}
                    <td className="p-0 border border-gray-300 text-center relative h-12 align-middle">
                      {editingCell === `${row.date}_${viewedUser}_p4` ? (
                        <div className="flex items-center h-full">
                            <button 
                              onClick={() => setTempValue((parseInt(tempValue) - 1).toString())}
                              className="w-8 h-full bg-red-50 hover:bg-red-100 text-red-600 font-bold border-r"
                            >-</button>
                            <input 
                              autoFocus
                              type="number" 
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(row.date, 'p4', currentStats)}
                              className="flex-1 w-full h-full text-center focus:bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                            />
                            <button 
                              onClick={() => setTempValue((parseInt(tempValue) + 1).toString())}
                              className="w-8 h-full bg-green-50 hover:bg-green-100 text-green-600 font-bold border-l"
                            >+</button>
                            <div className="absolute right-[-40px] top-0 bottom-0 flex items-center gap-1 z-20">
                             <button 
                                onClick={() => handleSaveEdit(row.date, 'p4', currentStats)}
                                className="p-1.5 bg-green-600 text-white rounded shadow-sm hover:bg-green-700"
                                title="Save"
                             >
                               <Save size={14} />
                             </button>
                             <button 
                                onClick={() => setEditingCell(null)}
                                className="p-1.5 bg-gray-500 text-white rounded shadow-sm hover:bg-gray-600"
                                title="Cancel"
                             >
                               <X size={14} />
                             </button>
                           </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => isEditable && handleStartEdit(`${row.date}_${viewedUser}_p4`, currentStats.p4)}
                          className={`w-full h-full flex items-center justify-center text-lg font-medium group ${isEditable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                        >
                           {currentStats.p4}
                           {isEditable && <Edit2 size={12} className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100" />}
                        </div>
                      )}
                    </td>

                    {/* P5 Cell */}
                    <td className="p-0 border border-gray-300 text-center relative h-12 align-middle">
                      {editingCell === `${row.date}_${viewedUser}_p5` ? (
                        <div className="flex items-center h-full">
                            <button 
                              onClick={() => setTempValue((parseInt(tempValue) - 1).toString())}
                              className="w-8 h-full bg-red-50 hover:bg-red-100 text-red-600 font-bold border-r"
                            >-</button>
                            <input 
                              autoFocus
                              type="number" 
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(row.date, 'p5', currentStats)}
                              className="flex-1 w-full h-full text-center focus:bg-purple-50 focus:ring-2 focus:ring-purple-500 outline-none font-bold text-lg text-purple-700"
                            />
                            <button 
                              onClick={() => setTempValue((parseInt(tempValue) + 1).toString())}
                              className="w-8 h-full bg-green-50 hover:bg-green-100 text-green-600 font-bold border-l"
                            >+</button>
                            <div className="absolute right-[-40px] top-0 bottom-0 flex items-center gap-1 z-20">
                             <button 
                                onClick={() => handleSaveEdit(row.date, 'p5', currentStats)}
                                className="p-1.5 bg-green-600 text-white rounded shadow-sm hover:bg-green-700"
                                title="Save"
                             >
                               <Save size={14} />
                             </button>
                             <button 
                                onClick={() => setEditingCell(null)}
                                className="p-1.5 bg-gray-500 text-white rounded shadow-sm hover:bg-gray-600"
                                title="Cancel"
                             >
                               <X size={14} />
                             </button>
                           </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => isEditable && handleStartEdit(`${row.date}_${viewedUser}_p5`, currentStats.p5)}
                          className={`w-full h-full flex items-center justify-center text-lg font-medium text-purple-700 group ${isEditable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                        >
                           {currentStats.p5}
                           {isEditable && <Edit2 size={12} className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100" />}
                        </div>
                      )}
                    </td>
                  </tr>
                 );
              })}
            </tbody>
          </table>
          
          {filteredRows.length === 0 && (
             <div className="p-8 text-center text-gray-500">No data found for this month.</div>
          )}
        </div>
      </div>
    </div>
  );
}
