"use client";
import React, { useState, useEffect } from 'react';
import { X, User2, Package, Tag, MessageSquare, Plus, Minus, Save, ShoppingBag } from 'lucide-react';
import { useSales } from '@/context/SalesContext';
import { useAuth } from '@/context/AuthContext';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export default function Drawer({ isOpen, onClose, data }: DrawerProps) {
  const { user } = useAuth();
  const { addSale, addComment, getStoreSales, comments } = useSales();
  
  const [activeTab, setActiveTab] = useState('stock');
  const [commentText, setCommentText] = useState('');
  
  // Local state for the widget before saving? 
  // Getting live updates from context is safer for persistence
  const [p1Count, setP1Count] = useState(0);
  const [p4Count, setP4Count] = useState(0);

  // When opening a store, reset counts or load today's? 
  // For this demo, let's keep it simple: Adding *new* sales in this session.
  // Or showing the total added today? 
  // Let's show "Session Adds"
  
  const handleSaveSales = () => {
    if (p1Count !== 0) addSale(data.id, 'P1', p1Count);
    if (p4Count !== 0) addSale(data.id, 'P4', p4Count);
    
    // Reset after save
    setP1Count(0);
    setP4Count(0);
  };

  const handleSaveComment = () => {
    if (commentText.trim()) {
      addComment(data.id, commentText);
      setCommentText('');
    }
  };
  
  const storeComments = comments.filter(c => c.storeId === data?.id).sort((a,b) => b.timestamp - a.timestamp);

  // If user is Specialist, show Sales Entry. Everyone sees Notes.
  const canEdit = user?.role === 'specialist' || user?.role === 'admin';

  // Default to Sales if can edit, otherwise Notes
  useEffect(() => {
    if (canEdit && activeTab === 'stock') setActiveTab('sales');
    else if (!canEdit && activeTab === 'stock') setActiveTab('notes');
  }, [canEdit]);

  return (
    <>
      {/* Backdrop for click-outside-to-close */}
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
          <div className="h-40 bg-gradient-to-br from-primary to-primary-dark relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="absolute bottom-6 left-6 text-white">
              <h2 className="text-2xl font-bold">{data.name}</h2>
              <p className="text-white/80 text-sm flex items-center gap-1">
                <Tag size={12} /> {data.type}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex border-b">
             {canEdit && (
              <TabButton 
                active={activeTab === 'sales'} 
                onClick={() => setActiveTab('sales')} 
                icon={<ShoppingBag size={16} />} 
                label="Sales" 
              />
            )}
            <TabButton 
              active={activeTab === 'notes'} 
              onClick={() => setActiveTab('notes')} 
              icon={<MessageSquare size={16} />} 
              label="Notes" 
            />
          </div>

          {/* Content */}
          <div className="p-6 h-[calc(100vh-250px)] overflow-y-auto">
            
            {activeTab === 'sales' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase">Register New Sales</h3>
                  
                  {/* P1 Widget */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-gray-800">Acquisition P1</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setP1Count(p => p - 1)} className="p-1 rounded bg-gray-200 hover:bg-gray-300"><Minus size={16} /></button>
                      <span className={`font-mono font-bold w-8 text-center ${p1Count !== 0 ? 'text-teal-600' : 'text-gray-400'}`}>{p1Count > 0 ? `+${p1Count}` : p1Count}</span>
                      <button onClick={() => setP1Count(p => p + 1)} className="p-1 rounded bg-teal-100 text-teal-700 hover:bg-teal-200"><Plus size={16} /></button>
                    </div>
                  </div>

                  {/* P4 Widget */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-bold text-gray-800">Acquisition P4</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setP4Count(p => p - 1)} className="p-1 rounded bg-gray-200 hover:bg-gray-300"><Minus size={16} /></button>
                      <span className={`font-mono font-bold w-8 text-center ${p4Count !== 0 ? 'text-teal-600' : 'text-gray-400'}`}>{p4Count > 0 ? `+${p4Count}` : p4Count}</span>
                      <button onClick={() => setP4Count(p => p + 1)} className="p-1 rounded bg-teal-100 text-teal-700 hover:bg-teal-200"><Plus size={16} /></button>
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveSales}
                    disabled={p1Count === 0 && p4Count === 0}
                    className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white p-2 rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save size={16} />
                    Confirm Updates
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="animate-fade-in h-full flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                  {storeComments.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm mt-10">No comments yet.</div>
                  ) : (
                    storeComments.map((c, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded text-sm border">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span className="font-bold">{c.userId}</span>
                          <span>{new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-gray-700">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>
                
                {canEdit && (
                  <div className="mt-auto">
                    <textarea 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                      rows={3}
                    />
                    <button 
                      onClick={handleSaveComment}
                      className="mt-2 w-full bg-indigo-600 text-white p-2 rounded text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Post Comment
                    </button>
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
