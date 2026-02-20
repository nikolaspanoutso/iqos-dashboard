import React from 'react';
import { MapPin } from 'lucide-react';

interface StoresListProps {
  stores: any[];
  onSelectStore: (store: any) => void;
}

export default function StoresList({ stores, onSelectStore, onAddStore, canAddStore }: { 
  stores: any[], 
  onSelectStore: (store: any) => void,
  onAddStore?: () => void,
  canAddStore?: boolean
}) {
  return (
    <div className="h-full w-full bg-gray-50 p-6 overflow-y-auto pt-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              Registered Stores 
              <span className="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{stores.length}</span>
            </h2>
            
            {canAddStore && (
                <button 
                    onClick={onAddStore}
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-dark transition-colors shadow-sm text-sm font-medium"
                >
                    + Add Store
                </button>
            )}
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stores.map((store) => (
              <div 
                key={store.id} 
                onClick={() => onSelectStore(store)}
                className="bg-white p-4 rounded-xl shadow-sm border hover:shadow-md cursor-pointer transition-all flex flex-col gap-2 group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-gray-800 group-hover:text-primary transition-colors text-base truncate flex-1">{store.name}</h3>
                  <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wide shrink-0 ${store.type === 'Kiosk' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {store.type}
                  </span>
                </div>
                
                <div className="flex items-start gap-1.5 text-xs text-gray-500 min-h-[2.5em]">
                  <MapPin size={12} className="mt-0.5 shrink-0 opacity-70" />
                  <p className="line-clamp-2">{store.address}</p>
                </div>
                
                <div className="mt-auto pt-3 border-t flex justify-between items-center text-xs text-gray-400">
                   <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">{store.area}</span>
                   {store.activatorName && <span className="font-medium text-gray-500">TA: {store.activatorName.split(' ')[0]}</span>}
                </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
