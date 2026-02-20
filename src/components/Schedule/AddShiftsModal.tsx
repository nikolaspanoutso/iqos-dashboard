"use client";
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, User, Clock } from 'lucide-react';

interface AddShiftsModalProps {
  onClose: () => void;
  onSave: () => void;
}

export default function AddShiftsModal({ onClose, onSave }: AddShiftsModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [userId, setUserId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [shift, setShift] = useState('09:00 - 17:00');
  const [status, setStatus] = useState('Pending');

  useEffect(() => {
    Promise.all([
        fetch('/api/users').then(res => res.json()),
        fetch('/api/stores').then(res => res.json())
    ]).then(([usersData, storesData]) => {
        if(Array.isArray(usersData)) setUsers(usersData);
        if(Array.isArray(storesData)) setStores(storesData);
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const payload = {
            userId,
            date,
            storeId: storeId || undefined,
            shift,
            status,
            requestingUserRole: 'admin', // Assume admin/activator for this modal
            requestingUserId: 'admin' 
        };

        const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            onSave();
        } else {
            alert('Failed to add shift');
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
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                    >
                        <option value="">Choose a user...</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
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

            {/* Store */}
            <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Store (Optional)</label>
                 <select 
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      value={storeId}
                      onChange={(e) => setStoreId(e.target.value)}
                    >
                        <option value="">No Store / Office</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.area})</option>)}
                    </select>
            </div>

             {/* Shift */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Shift Time</label>
                <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      placeholder="e.g. 09:00 - 17:00"
                      className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      value={shift}
                      onChange={(e) => setShift(e.target.value)}
                    />
                </div>
            </div>
            
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
