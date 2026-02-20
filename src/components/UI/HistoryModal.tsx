"use client";
import React, { useState } from 'react';
import { X, Search, Save, Edit2 } from 'lucide-react';
import { useSales } from '@/context/SalesContext';
import { useAuth } from '@/context/AuthContext';

interface HistoryModalProps {
  onClose: () => void;
}

export default function HistoryModal({ onClose }: HistoryModalProps) {
  const { data, updateDailySales } = useSales();
  const { user } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState('02'); // Default to February
  const [viewedUser, setViewedUser] = useState(user?.name || 'Maria Tasiou');
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');

  // Extract available users for Admin selector
  const availableUsers = [
    'Maria Tasiou', 'Nikos Mousas', 'Giwrgos Grimanis', 
    'Nikolas Panoutsopoulos', 'Nefeli Merko'
  ];

  // Filter Data based on Month and User
  const filteredRows = data.filter((day: any) => {
    // Date format: DD/MM/YYYY. Extract MM.
    const month = day.date.split('/')[1];
    return month === selectedMonth;
  }).map((day: any) => {
    const stats = day.people[viewedUser] || { acquisitionP1: 0, acquisitionP4: 0, offtakeP5: 0 };
    return {
      date: day.date,
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
    if (user.role === 'admin') return true;
    return user.role === 'specialist' && user.name === viewedUser;
  };

  const isEditable = canEdit();

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden relative border border-gray-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
               <span className="bg-teal-600 text-white text-xs px-2 py-1 rounded">XLS</span>
               History
             </h2>
             
             {/* Admin User Selector */}
             {(user?.role === 'admin' || user?.role === 'activator') && (
               <select 
                 value={viewedUser} 
                 onChange={(e) => setViewedUser(e.target.value)}
                 className="text-sm p-1 border rounded bg-white"
               >
                 {availableUsers.map(u => <option key={u} value={u}>{u}</option>)}
               </select>
             )}
             
             {/* Specialist Name Display */}
             {user?.role === 'specialist' && (
                <span className="font-medium text-gray-600 border-l pl-4">{user.name}</span>
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
                <th className="p-2 border border-gray-300 font-semibold text-gray-700 w-1/4 bg-gray-100">Date</th>
                <th className="p-2 border border-gray-300 font-semibold text-gray-700 text-center w-1/4 bg-gray-100">P1</th>
                <th className="p-2 border border-gray-300 font-semibold text-gray-700 text-center w-1/4 bg-gray-100">P4</th>
                 <th className="p-2 border border-gray-300 font-semibold text-purple-700 text-center w-1/4 bg-gray-100">P5 Offtake</th>
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
