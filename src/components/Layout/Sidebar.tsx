"use client";
import React, { useState } from 'react';
import { Users, Calendar, Map as MapIcon, List, Menu, X, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import TeamPerformanceModal from '@/components/UI/TeamPerformanceModal';
import ScheduleModal from '@/components/UI/ScheduleModal';

interface SidebarProps {
  currentView?: 'map' | 'list';
  onViewChange?: (view: 'map' | 'list') => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const { logout, user, login, users } = useAuth();

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      <button 
        onClick={toggleSidebar} 
        className="fixed top-4 left-4 z-[1000] p-2 bg-white rounded shadow-md text-primary"
      >
        {isOpen ? <X /> : <Menu />}
      </button>

      <div className={`fixed top-0 left-0 h-full bg-white shadow-xl transition-transform duration-300 z-[999] overflow-y-auto w-80 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="p-6 mt-12 flex-1">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-primary">Sales Network</h2>
            {user ? (
              <div className="text-xs text-gray-500 mt-1">
                Logged in as: <span className="font-semibold text-gray-700">{user.name}</span>
              </div>
            ) : (
                <div className="mt-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Select User</label>
                    <select 
                        className="w-full border p-2 rounded mt-1 text-sm"
                        onChange={(e) => login(e.target.value)}
                        defaultValue=""
                    >
                        <option value="" disabled>Choose User...</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                    </select>
                </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2 mb-8">
            <div className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Main Views</div>
            
            <NavItem 
              icon={<MapIcon size={20} />} 
              label="Map View" 
              isActive={currentView === 'map'} 
              onClick={() => onViewChange?.('map')} 
            />
            <NavItem 
              icon={<List size={20} />} 
              label="Stores List" 
              isActive={currentView === 'list'} 
              onClick={() => onViewChange?.('list')} 
            />

            <div className="text-xs font-bold text-gray-400 uppercase mb-2 mt-6 tracking-wider">Management</div>

            <NavItem 
              icon={<Users size={20} />} 
              label="Team Performance" 
              isActive={showPerformanceModal} 
              onClick={() => setShowPerformanceModal(true)} 
            />
            <NavItem 
              icon={<Calendar size={20} />} 
              label="Schedule" 
              isActive={window.location.pathname === '/schedule'} 
              onClick={() => window.location.href = '/schedule'} 
            />
          </nav>

        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t bg-gray-50">
           <button 
             onClick={logout}
             className="flex items-center gap-2 text-red-600 hover:bg-red-50 w-full p-2 rounded transition-colors text-sm font-medium"
           >
             <LogOut size={16} />
             Sign Out
           </button>
        </div>
      </div>

      {showPerformanceModal && (
        <TeamPerformanceModal onClose={() => setShowPerformanceModal(false)} />
      )}
      
      {showScheduleModal && (
        <ScheduleModal onClose={() => setShowScheduleModal(false)} />
      )}
    </>
  );
}

const NavItem = ({ icon, label, isActive, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md transform scale-102' : 'hover:bg-gray-100 text-gray-600'}`}
  >
    {icon}
    <span className="font-medium">{label}</span>
    {isActive && <ChevronRight size={16} className="ml-auto opacity-75" />}
  </button>
);
