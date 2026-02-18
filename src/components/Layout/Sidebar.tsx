"use client";
import React, { useState } from 'react';
import { Users, Calendar, Phone, MessageSquare, Menu, X, ChevronRight, Store, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { schedule } from '@/data/mockData';
import TeamPerformanceModal from '@/components/UI/TeamPerformanceModal';
import ScheduleModal from '@/components/UI/ScheduleModal';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('stores'); 
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const { logout, user } = useAuth();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleNavClick = (tab: string) => {
    if (tab === 'performance') {
      setShowPerformanceModal(true);
    } else if (tab === 'schedule') {
        setShowScheduleModal(true);
    } else {
      setActiveTab(tab);
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
            {user && (
              <div className="text-xs text-gray-500 mt-1">
                Logged in as: <span className="font-semibold text-gray-700">{user.name}</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2 mb-8">
            <NavItem 
              icon={<Users size={20} />} 
              label="Team Performance" 
              isActive={showPerformanceModal} 
              onClick={() => handleNavClick('performance')} 
            />
            <NavItem 
              icon={<Calendar size={20} />} 
              label="Schedule" 
              isActive={showScheduleModal} 
              onClick={() => handleNavClick('schedule')} 
            />
            <NavItem 
              icon={<Store size={20} />} 
              label="Stores" 
              isActive={activeTab === 'stores'} 
              onClick={() => handleNavClick('stores')} 
            />
            <NavItem 
              icon={<Phone size={20} />} 
              label="Support Directory" 
              isActive={activeTab === 'phones'} 
              onClick={() => handleNavClick('phones')} 
            />
            <NavItem 
              icon={<MessageSquare size={20} />} 
              label="Group Chat" 
              isActive={activeTab === 'chat'} 
              onClick={() => handleNavClick('chat')} 
            />
          </nav>

          {/* Dynamic Content */}
          <div className="mt-4">
            {activeTab === 'stores' && <StoresView />}
            {activeTab === 'phones' && <DirectoryView />}
            {activeTab === 'chat' && <ChatView />}
          </div>
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
    className={`flex items-center gap-3 w-full p-3 rounded transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'}`}
  >
    {icon}
    <span className="font-medium">{label}</span>
    {isActive && <ChevronRight size={16} className="ml-auto" />}
  </button>
);

const StoresView = () => (
  <div className="space-y-3 animate-fade-in">
    <div className="p-3 bg-white border rounded shadow-sm">
      <div className="font-bold text-gray-800">Pick it</div>
      <div className="text-sm text-gray-600 mt-1">Lamias 23, Athens 115 23</div>
      <a href="tel:+302100000000" className="text-xs text-teal-600 block mt-1 font-medium hover:underline">
        +30 210 000 0000
      </a>
    </div>
    <div className="p-3 bg-white border rounded shadow-sm">
      <div className="font-bold text-gray-800">PAPAZIKOS</div>
      <div className="text-sm text-gray-600 mt-1">Dimitsanas 54, Ampelokipoi, 115 22</div>
      <a href="tel:+302106423224" className="text-xs text-teal-600 block mt-1 font-medium hover:underline">
        +30 210 6423224
      </a>
    </div>
  </div>
);

const DirectoryView = () => (
  <div className="space-y-2 animate-fade-in">
    <PhoneItem name="Area Manager" number="+30 690 000 0000" />
    <PhoneItem name="IT Support" number="+30 210 000 0000" />
    <PhoneItem name="Warehouse" number="+30 210 000 0001" />
  </div>
);

const PhoneItem = ({ name, number }: any) => (
  <div className="flex justify-between items-center p-2 border-b">
    <span className="text-sm font-medium">{name}</span>
    <a href={`tel:${number}`} className="text-teal-600 text-sm">{number}</a>
  </div>
);

const ChatView = () => (
  <div className="h-64 flex flex-col bg-gray-50 rounded border animate-fade-in">
    <div className="flex-1 p-3 overflow-y-auto text-sm space-y-2">
      <div className="bg-white p-2 rounded self-start max-w-[80%] shadow-sm">
        <span className="text-xs font-bold block text-teal-600">Maria</span>
        Anyone near Kolonaki? Need extra stock.
      </div>
      <div className="bg-blue-100 p-2 rounded self-end max-w-[80%] shadow-sm ml-auto">
        <span className="text-xs font-bold block text-blue-800">Me</span>
        I'll be there in 20.
      </div>
    </div>
    <div className="p-2 border-t flex gap-2">
      <input className="flex-1 text-sm p-1 border rounded" placeholder="Type..." />
      <button className="bg-blue-600 text-white p-1 rounded px-3">Send</button>
    </div>
  </div>
);
