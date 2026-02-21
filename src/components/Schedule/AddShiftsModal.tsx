"use client";
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, User, Clock, Search } from 'lucide-react';

interface AddShiftsModalProps {
  onClose: () => void;
  onSave: () => void;
}

import { useAuth } from '@/context/AuthContext';

export default function AddShiftsModal({ onClose, onSave }: AddShiftsModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user: currentUser } = useAuth();

  // Form State
  const [userName, setUserName] = useState(''); // Use Name as identifier
  const [storeId, setStoreId] = useState('');
  const [storeId2, setStoreId2] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTerm2, setSearchTerm2] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [shift, setShift] = useState('09:00 - 13:00');
  const [shift2, setShift2] = useState('13:00 - 17:00');
  const [status, setStatus] = useState('Pending');
  const [isSplit, setIsSplit] = useState(false);

  useEffect(() => {
    Promise.all([
        fetch('/api/users').then(res => res.json()),
        fetch('/api/stores').then(res => res.json())
    ]).then(([usersData, storesData]) => {
        if(Array.isArray(usersData)) setUsers(usersData);
        if(Array.isArray(storesData)) {
            // Global UI Filter
            setStores(storesData.filter((s: any) => s.name !== 'System - Specialist Adjustments'));
        }
    }).finally(() => setLoading(false));
  }, []);

  const filteredStores = stores.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.area || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStores2 = stores
    .filter(s => s.id !== storeId)
    .filter(s => 
      s.name.toLowerCase().includes(searchTerm2.toLowerCase()) || 
      (s.area || '').toLowerCase().includes(searchTerm2.toLowerCase())
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
        if (isSplit && !storeId2) {
            alert('Please select the second store for the split shift.');
            return;
        }

        if (isSplit && storeId === storeId2) {
            alert('Shop 1 and Shop 2 must be different for a split shift.');
            return;
        }

        const payload = {
            userId: userName, // Schema expects User.name
            date,
            storeId: storeId || undefined,
            shift,
            storeId2: isSplit ? storeId2 : undefined,
            shift2: isSplit ? shift2 : undefined,
            status,
            requestingUserRole: currentUser.role,
            requestingUserId: currentUser.id 
        };

        const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            onSave();
        } else {
            const err = await res.json();
            alert(`Failed to add shift: ${err.details || err.error}`);
        }
    } catch (error) {
        console.error(error);
        alert('Error adding shift');
    }
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Add New Shift</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {/* User */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Select User</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select 
                      required 
                      className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    >
                        <option value="">Choose a user...</option>
                        {users.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                    </select>
                </div>
            </div>

            {/* Date */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                <div className="relative">
                     <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                     <input 
                       type="date"
                       required
                       className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                       value={date}
                       onChange={(e) => setDate(e.target.value)}
                     />
                </div>
            </div>

             {/* Split Shift Toggle */}
             <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <div>
                    <div className="text-sm font-bold text-blue-800">Split Shift</div>
                    <div className="text-[10px] text-blue-600">4 hours in Shop A + 4 hours in Shop B</div>
                </div>
                <button 
                    type="button"
                    onClick={() => {
                        setIsSplit(!isSplit);
                        if (!isSplit) setShift('09:00 - 13:00');
                        else setShift('09:00 - 17:00');
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative ${isSplit ? 'bg-primary' : 'bg-gray-300'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSplit ? 'left-7' : 'left-1'}`} />
                </button>
             </div>

            {/* Store 1 */}
            <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">
                    {isSplit ? 'Shop 1 (Morning)' : 'Store (Optional)'}
                 </label>
                 <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                            type="text"
                            placeholder="Search store..."
                            className="w-full pl-9 p-1.5 text-xs border rounded-lg bg-gray-50 focus:ring-1 focus:ring-primary outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        value={storeId}
                        onChange={(e) => setStoreId(e.target.value)}
                    >
                        <option value="">No Store / Office</option>
                        {filteredStores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.area})</option>)}
                    </select>
                 </div>
            </div>

             {/* Shift 1 */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                    {isSplit ? 'Hours (Shop 1)' : 'Shift Time'}
                </label>
                <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      placeholder="e.g. 09:00 - 13:00"
                      className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      value={shift}
                      onChange={(e) => setShift(e.target.value)}
                    />
                </div>
            </div>

            {isSplit && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                    {/* Store 2 */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1 text-primary">Shop 2 (Afternoon)</label>
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" size={14} />
                                <input 
                                    type="text"
                                    placeholder="Search shop 2..."
                                    className="w-full pl-9 p-1.5 text-xs border border-primary/20 rounded-lg bg-primary/5 focus:ring-1 focus:ring-primary outline-none"
                                    value={searchTerm2}
                                    onChange={(e) => setSearchTerm2(e.target.value)}
                                />
                            </div>
                            <select 
                                required
                                className="w-full p-2 border-2 border-primary/20 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-primary/5"
                                value={storeId2}
                                onChange={(e) => setStoreId2(e.target.value)}
                            >
                                <option value="">Choose Shop 2...</option>
                                {filteredStores2.map(s => <option key={s.id} value={s.id}>{s.name} ({s.area})</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Shift 2 */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1 text-primary">Hours (Shop 2)</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" size={18} />
                            <input 
                                type="text"
                                className="w-full pl-10 p-2 border-2 border-primary/20 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-primary/5"
                                value={shift2}
                                onChange={(e) => setShift2(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}
            
            <div className="mt-4 flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">
                    Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark shadow-md flex items-center justify-center gap-2">
                    <Save size={18} />
                    Save Shift
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}
