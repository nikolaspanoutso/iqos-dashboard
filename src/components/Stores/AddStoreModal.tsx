"use client";
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { X, Save, MapPin } from 'lucide-react';
import { togglePromoSuffix } from '@/lib/promo';

// Dynamic import of the Map component to avoid SSR issues with Leaflet
const AddStoreMap = dynamic(() => import('./AddStoreMap'), { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">Loading Map...</div>
});

interface AddStoreModalProps {
  onClose: () => void;
  onSave: (store: any) => Promise<void>;
  activatorId?: string;
}

export default function AddStoreModal({ onClose, onSave, activatorId }: AddStoreModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Store',
    address: '',
    area: 'Athina',
    isPromo: false, // New state
  });
  const [position, setPosition] = useState({ lat: 37.9838, lng: 23.7275 }); // Default Athens
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Apply promo suffix if toggled
    const finalName = togglePromoSuffix(formData.name, formData.isPromo);

    await onSave({
        ...formData,
        name: finalName,
        lat: position.lat,
        lng: position.lng,
        activatorId
    });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="text-primary" /> Add New Store
          </h2>
          <button onClick={onClose}><X className="text-gray-500 hover:text-gray-800" /></button>
        </div>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
             
             {/* Left: Form */}
             <form onSubmit={handleSubmit} className="p-6 w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Store Name</label>
                    <input 
                        required
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. My Kiosk"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                    <select 
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                        <option value="Store">Store</option>
                        <option value="Kiosk">Kiosk</option>
                        <option value="Mini Market">Mini Market</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Area</label>
                    <input 
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none"
                        value={formData.area}
                        onChange={e => setFormData({...formData, area: e.target.value})}
                         placeholder="e.g. Zografou"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                    <input 
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                         placeholder="e.g. Oulof Palme 15"
                    />
                </div>

                <div className="flex items-center gap-2 py-2">
                    <input 
                        type="checkbox"
                        id="promoStatus"
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                        checked={formData.isPromo}
                        onChange={e => setFormData({...formData, isPromo: e.target.checked})}
                    />
                    <label htmlFor="promoStatus" className="text-sm font-bold text-gray-700 cursor-pointer">
                        Promo Status (*)
                    </label>
                </div>

                <div className="mt-auto pt-4">
                    <div className="text-xs text-gray-500 mb-2">
                        Drag the pin on the map to set exact location.
                        <div className="font-mono mt-1">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? 'Saving...' : (
                            <>
                                <Save size={18} /> Save Store
                            </>
                        )}
                    </button>
                </div>
             </form>

             {/* Right: Map */}
             <div className="w-full md:w-2/3 bg-gray-100 h-[400px] md:h-auto relative z-0">
                <AddStoreMap position={position} setPosition={setPosition} />
             </div>
        </div>
      </div>
    </div>
  );
}
