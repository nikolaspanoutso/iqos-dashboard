"use client";
import React, { useState, useEffect } from 'react';
import { X, User2, Package, Tag, MessageSquare, Plus, Minus, Save, ShoppingBag } from 'lucide-react';
import { useSales } from '@/context/SalesContext';
import { useAuth } from '@/context/AuthContext';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onStoreUpdate?: () => void; // Callback to refresh list
}

export default function Drawer({ isOpen, onClose, data, onStoreUpdate }: DrawerProps) {
  const { user } = useAuth();
  const { addSale, addComment, getStoreSales, comments } = useSales();
  
  const [activeTab, setActiveTab] = useState('stock');
  const [commentText, setCommentText] = useState('');
  
  // Local state for the widget
  const [p1Count, setP1Count] = useState(0);
  const [p4Count, setP4Count] = useState(0);
  const [p5Count, setP5Count] = useState(0);

  const handleSaveSales = () => {
    if (p1Count !== 0) addSale(data.id, 'P1', p1Count);
    if (p4Count !== 0) addSale(data.id, 'P4', p4Count);
    if (p5Count !== 0) addSale(data.id, 'P5', p5Count);
    
    // Reset after save
    setP1Count(0);
    setP4Count(0);
    setP5Count(0);
  };

  const handleSaveComment = () => {
    if (commentText.trim()) {
      addComment(data.id, commentText);
      setCommentText('');
    }
  };
  
  const handleRemoveStore = async () => {
     if (!confirm('Are you sure you want to remove this store? It will be hidden from your list but performance data will be kept.')) return;

     try {
         const res = await fetch('/api/stores', {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ id: data.id, action: 'delete' })
         });
         
         if (res.ok) {
             onClose();
             if (onStoreUpdate) onStoreUpdate();
         } else {
             alert('Failed to remove store');
         }
     } catch (e) {
         console.error(e);
         alert('Error removing store');
     }
  };
  
  const storeComments = comments
    .filter(c => c.storeId === data?.id)
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // If user is Specialist, show Sales Entry. Everyone sees Notes.
  const canEdit = user?.role === 'specialist' || user?.role === 'admin';
  const isOwner = (user?.role === 'activator' && user?.id === data?.activatorId) || user?.role === 'admin';

  // Default to Sales if can edit, otherwise Notes
  useEffect(() => {
    if (canEdit && activeTab === 'stock') setActiveTab('sales');
    else if (!canEdit && activeTab === 'stock') setActiveTab('notes');
  }, [canEdit]);

const storeSales = comments
    .filter(c => c.storeId === data?.id) // Reusing comments filter logic for now, should be sales
    // We need to fetch actual sales history here or pass it down
    // For now, let's display the Total Acquisition from props
;

  const totalAcquisition = data?.totalAcquisition || 0;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-[1000] backdrop-blur-[1px] transition-opacity"
          onClick={onClose}
        />
      )}

      <div 
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-[1001] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
      {/* Header */}
      {data && (
        <>
          <div className="h-48 bg-gradient-to-br from-primary to-primary-dark relative p-6 flex flex-col justify-end">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="mt-auto text-white">
              <div className="flex justify-between items-start mb-2">
                 <h2 className="text-2xl font-bold leading-tight">{data.name}</h2>
                 <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold backdrop-blur-sm">{data.type}</span>
              </div>
              
              <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
                <Tag size={12} /> {data.address || 'No address'}
              </div>

              {/* METRICS BADGE */}
              <div className="flex gap-4 mt-2">
                 <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 pr-4 flex-1 border border-white/10">
                    <span className="block text-[10px] uppercase tracking-wider opacity-70">Total Acquisitions</span>
                    <span className="text-2xl font-bold">{totalAcquisition}</span>
                 </div>
                 
                 {/* Area or Remove Button */}
                 <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 pr-4 flex-1 border border-white/10 flex flex-col justify-center">
                    {isOwner ? (
                        <button 
                            onClick={handleRemoveStore}
                            className="text-xs font-bold bg-red-500/80 hover:bg-red-600 text-white px-2 py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
                        >
                            Remove Store
                        </button>
                    ) : (
                        <>
                            <span className="block text-[10px] uppercase tracking-wider opacity-70">Area</span>
                            <span className="text-lg font-bold truncate">{data.area || '-'}</span>
                        </>
                    )}
                 </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex border-b bg-gray-50">
             {canEdit && (
              <TabButton 
                active={activeTab === 'sales'} 
                onClick={() => setActiveTab('sales')} 
                icon={<ShoppingBag size={16} />} 
                label="Register Sales" 
              />
            )}
            <TabButton 
              active={activeTab === 'notes'} 
              onClick={() => setActiveTab('notes')} 
              icon={<MessageSquare size={16} />} 
              label="History & Notes" 
            />
          </div>

          {/* Content */}
          <div className="p-6 h-[calc(100vh-290px)] overflow-y-auto">
            
            {activeTab === 'sales' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 mb-6 uppercase tracking-wider">New Entry</h3>
                  
                  {/* P1 Widget */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                        <span className="font-bold text-gray-800 block">Acquisition P1</span>
                        <span className="text-xs text-gray-400">New User Registration</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setP1Count(p => Math.max(0, p - 1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"><Minus size={16} /></button>
                      <span className={`font-mono font-bold w-6 text-center text-lg ${p1Count > 0 ? 'text-primary' : 'text-gray-300'}`}>{p1Count}</span>
                      <button onClick={() => setP1Count(p => p + 1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"><Plus size={16} /></button>
                    </div>
                  </div>

                  {/* P4 Widget */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                        <span className="font-bold text-gray-800 block">Acquisition P4</span>
                        <span className="text-xs text-gray-400">Device Upgrade</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setP4Count(p => Math.max(0, p - 1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"><Minus size={16} /></button>
                      <span className={`font-mono font-bold w-6 text-center text-lg ${p4Count > 0 ? 'text-primary' : 'text-gray-300'}`}>{p4Count}</span>
                      <button onClick={() => setP4Count(p => p + 1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"><Plus size={16} /></button>
                    </div>
                  </div>
                  
                  {/* P5 Widget (Offtake) */}
                  <div className="flex items-center justify-between mb-8 pb-8 border-b border-dashed">
                    <div>
                        <span className="font-bold text-purple-900 block">Offtake P5</span>
                        <span className="text-xs text-gray-400">Consumables</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setP5Count(p => Math.max(0, p - 1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"><Minus size={16} /></button>
                      <span className={`font-mono font-bold w-6 text-center text-lg ${p5Count > 0 ? 'text-purple-600' : 'text-gray-300'}`}>{p5Count}</span>
                      <button onClick={() => setP5Count(p => p + 1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"><Plus size={16} /></button>
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveSales}
                    disabled={p1Count === 0 && p4Count === 0 && p5Count === 0}
                    className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-white p-2 rounded-lg font-bold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
                  >
                    <Save size={18} />
                    Submit Report
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="animate-fade-in h-full flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
                  {storeComments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2 border-2 border-dashed rounded-lg">
                          <MessageSquare size={24} className="opacity-20" />
                          <span className="text-sm">No activity recorded yet.</span>
                      </div>
                  ) : (
                    storeComments.map((c, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl text-sm border shadow-sm relative pl-4">
                        <div className="absolute left-0 top-4 bottom-4 w-1 bg-gray-200 rounded-r"></div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-gray-800">{c.userId}</span>
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{new Date(c.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>
                
                {canEdit && (
                  <div className="mt-auto bg-gray-50 p-3 rounded-xl border">
                    <textarea 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Type a note or report..."
                      className="w-full bg-white border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none shadow-sm transition-shadow"
                      rows={3}
                    />
                    <div className="flex justify-end mt-2">
                        <button 
                          onClick={handleSaveComment}
                          disabled={!commentText.trim()}
                          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Post Note
                        </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </>
      )}
      </div>
    </>
  );
}

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${active ? 'border-primary text-primary bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
  >
    {icon}
    {label}
  </button>
);

const StockItem = ({ name, count, color }: any) => (
  <div className="flex items-center justify-between p-3 bg-white border rounded shadow-sm">
    <span className="font-medium text-gray-700">{name}</span>
    <span className={`px-3 py-1 rounded-full text-sm font-bold ${color}`}>{count} ctns</span>
  </div>
);
