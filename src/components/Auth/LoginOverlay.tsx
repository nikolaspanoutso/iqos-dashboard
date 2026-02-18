"use client";
import React, { useState } from 'react';
import { useAuth, USERS } from '@/context/AuthContext';
import { Lock, User as UserIcon } from 'lucide-react';

export default function LoginOverlay() {
  const { user, login, users } = useAuth();
  const [selectedId, setSelectedId] = useState('');

  if (user) return null;
  
  // If users list is empty (loading or failed), show loading state or fallback
  const isLoading = users.length === 0;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedId) {
      login(selectedId);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">IQOS Dashboard</h1>
          <p className="text-gray-500">Sales Network Management</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select User Profile
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <UserIcon size={18} />
              </div>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
                required
              >
                <option value="" disabled>
                   {isLoading ? "Loading users..." : "Select your name..."}
                </option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedId}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Access Dashboard
          </button>
        </form>
        
        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; 2026 Sales Network System
        </p>
      </div>
    </div>
  );
}
