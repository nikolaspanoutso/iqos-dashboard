"use client";
import React, { useState } from 'react';
import { Users, Calendar, Map as MapIcon, List, Menu, X, ChevronRight, LogOut, Clock, MapPin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import TeamPerformanceModal from '@/components/UI/TeamPerformanceModal';
import ScheduleModal from '@/components/UI/ScheduleModal';
import { useRouter, useSearchParams } from 'next/navigation';

interface SidebarProps {
  currentView?: 'map' | 'list';
  onViewChange?: (view: 'map' | 'list') => void;
}

export default function Sidebar({ currentView: propView, onViewChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [nextShift, setNextShift] = useState<any>(null);
  const [loadingShift, setLoadingShift] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Determine current view from prop or search param
  const currentView = propView || (searchParams.get('view') as 'map' | 'list') || 'map';

  const { logout, user, login, users } = useAuth();

  React.useEffect(() => {
    if (user?.role === 'specialist') {
        const fetchNextShift = async () => {
            setLoadingShift(true);
            try {
                const res = await fetch(`/api/schedule/next?userId=${user.name}`);
                const data = await res.json();
                if (data && !data.error && !data.message) {
                    setNextShift(data);
                } else {
                    setNextShift(null);
                }
            } catch (err) {
                console.error("Failed to fetch next shift", err);
            } finally {
                setLoadingShift(false);
            }
        };
        fetchNextShift();
    }
  }, [user]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleNavClick = (view: 'map' | 'list') => {
    if (onViewChange) {
      onViewChange(view);
    } else {
      router.push(`/?view=${view}`);
    }
  };

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
              isActive={currentView === 'map' && typeof window !== 'undefined' && window.location.pathname === '/'} 
              onClick={() => handleNavClick('map')} 
            />
            <NavItem 
              icon={<List size={20} />} 
              label="Stores List" 
              isActive={currentView === 'list' && typeof window !== 'undefined' && window.location.pathname === '/'} 
              onClick={() => handleNavClick('list')} 
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
              isActive={typeof window !== 'undefined' && window.location.pathname === '/schedule'} 
              onClick={() => router.push('/schedule')} 
            />
          </nav>

          {/* Next Shift Section */}
          {user?.role === 'specialist' && (
            <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">Next Shift</div>
                {loadingShift ? (
                    <div className="animate-pulse flex flex-col gap-2">
                        <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                    </div>
                ) : nextShift ? (
                    <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100/50">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                <Clock size={16} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-800">
                                    {new Date(nextShift.date).toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'short' })}
                                </div>
                                <div className="text-[11px] text-indigo-600 font-medium">{nextShift.shift}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                           <StoreLink 
                             label={nextShift.store.name} 
                             onClick={() => router.push(`/?view=map&selectStoreId=${nextShift.storeId}`)} 
                           />
                           {nextShift.storeId2 && (
                             <StoreLink 
                               label={nextShift.store2.name} 
                               onClick={() => router.push(`/?view=map&selectStoreId=${nextShift.storeId2}`)} 
                               isSecond
                             />
                           )}
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-gray-400 italic">No upcoming shifts</div>
                )}
            </div>
          )}
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

const StoreLink = ({ label, onClick, isSecond }: any) => (
    <button 
        onClick={onClick}
        className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all group"
    >
        <MapPin size={12} className={isSecond ? "text-orange-400" : "text-indigo-400"} />
        <span className="text-sm font-semibold text-gray-700 group-hover:text-primary transition-colors truncate">{label}</span>
    </button>
);
