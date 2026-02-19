"use client";
import React, { useState, useEffect } from 'react';
import { X, Loader2, CalendarDays, CheckCircle2 } from 'lucide-react';
import { useSales } from '@/context/SalesContext';

interface TeamPerformanceModalProps {
  onClose: () => void;
}

export default function TeamPerformanceModal({ onClose }: TeamPerformanceModalProps) {
  const { totals, loading: salesLoading } = useSales(); // Renamed to avoid specific loading conflict if needed
  const [rainTimestamp, setRainTimestamp] = useState<number | null>(null);
  const [storeTotal, setStoreTotal] = useState(0); // Holds the sum of 'Total Acquisitions' from stores
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     fetch('/api/stores')
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data)) {
              // Sum up totalAcquisition from all stores
              const sum = data.reduce((acc, store) => acc + (store.totalAcquisition || 0), 0);
              setStoreTotal(sum);
           }
        })
        .finally(() => setLoading(false));
  }, []);

  const triggerRain = () => {
    setRainTimestamp(Date.now());
  };

  if (loading || salesLoading) {
    return (
      <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white p-6 rounded shadow-lg flex flex-col items-center">
          <Loader2 className="animate-spin text-teal-600 mb-2" size={32} />
          <span>Loading Performance Data...</span>
        </div>
      </div>
    );
  }

  // Calculate grand totals from individual sales entries (if needed separately)
  const totalP1 = Object.values(totals).reduce((acc: number, curr: any) => acc + curr.acquisitionP1, 0);
  const totalP4 = Object.values(totals).reduce((acc: number, curr: any) => acc + curr.acquisitionP4, 0);
  const totalP5 = Object.values(totals).reduce((acc: number, curr: any) => acc + curr.offtakeP5, 0);
  
  // The user stated "Team Total is 750" and "Do not calculate them again" (meaning don't add sales to store total).
  // storeTotal (from DB stores) already includes these sales.
  // So we just display storeTotal.

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden relative">
        
        {/* Money Rain Effect */}
        {rainTimestamp && <MoneyRain key={rainTimestamp} />}

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-primary">Team Performance Overview</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <span>Sales & Acquisitions Dashboard</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          
          {/* Main Metric Banner */}
          <div className="bg-gradient-to-r from-teal-800 to-teal-600 text-white p-8 rounded-xl shadow-lg mb-8 flex items-center justify-center text-center transform transition-transform hover:scale-[1.01]">
              <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">Total Team Acquisitions</h3>
                  <div className="text-6xl font-black tracking-tight drop-shadow-lg">
                    {storeTotal > 0 ? storeTotal : 'Loading...'}
                  </div>
                  <div className="text-xs opacity-60 mt-2 font-mono uppercase">Validated Store Data</div>
              </div>
          </div>

          {/* Team Summary Breakdown (Derived from individual reports, just for info) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 opacity-70 hover:opacity-100 transition-opacity">
            <SummaryCard 
              title="Acquisition P1" 
              actual={totalP1} 
              // Sum of all individual targets
              target={Object.values(totals).reduce((acc: number, curr: any) => acc + (curr.workingDays * 1.7), 0)} 
              color="teal"
            />
            <SummaryCard 
              title="Acquisition P4" 
              actual={totalP4} 
              target={Object.values(totals).reduce((acc: number, curr: any) => acc + (curr.workingDays * 0.7), 0)} 
              color="blue"
            />
             <SummaryCard 
              title="Offtake P5" 
              actual={totalP5} 
              color="purple"
            />
          </div>

          {/* Individual Stats Grid */}
          <h3 className="text-xl font-bold text-gray-800 mb-6">Individual Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(totals).map(([name, stats]: any) => {
              const wd = stats.workingDays;
              const targets = {
                targetP1: wd * 1.7,
                overP1: wd * 1.9,
                targetP4: wd * 0.7,
                overP4: wd * 0.9,
              };

              return (
                <PersonStatsCard 
                  key={name}
                  name={name}
                  stats={stats}
                  workingDays={wd}
                  targets={targets}
                  onGoldHover={triggerRain}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const PersonStatsCard = ({ name, stats, workingDays, targets, onGoldHover }: any) => {
  const { targetP1, overP1, targetP4, overP4 } = targets;
  
  // State to toggle which target is displayed in the fraction (Base vs Over)
  // Default to Base Target (false)
  const [showP1Over, setShowP1Over] = useState(false);
  const [showP4Over, setShowP4Over] = useState(false);

  // P1 Calculations
  const p1Progress = Math.min((stats.acquisitionP1 / targetP1) * 100, 100);
  const p1OverProgress = Math.min((stats.acquisitionP1 / overP1) * 100, 100);
  const isP1Over = stats.acquisitionP1 >= overP1;
  const isP1TargetMet = stats.acquisitionP1 >= targetP1;

  // P4 Calculations
  const p4Progress = Math.min((stats.acquisitionP4 / targetP4) * 100, 100);
  const p4OverProgress = Math.min((stats.acquisitionP4 / overP4) * 100, 100);
  const isP4Over = stats.acquisitionP4 >= overP4;
  const isP4TargetMet = stats.acquisitionP4 >= targetP4;

  const currentTargetP1 = showP1Over ? overP1 : targetP1;
  const currentTargetP4 = showP4Over ? overP4 : targetP4;

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
            {name.charAt(0)}
          </div>
          <div>
            <h4 className="font-bold text-gray-800">{name}</h4>
            <span className="text-xs text-gray-500">Sales Rep</span>
          </div>
        </div>
        <div className="bg-gray-100 px-2 py-1 rounded text-xs font-semibold text-gray-600" title="Working Days">
          {workingDays} days
        </div>
      </div>
      
      {/* P1 Stats */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-1">
          <span className="font-bold text-sm text-gray-700">Acquisition P1</span>
          <div className="text-right">
             <span className="text-lg font-bold text-gray-800">{stats.acquisitionP1}</span>
             <span className="text-xs text-gray-400 ml-1">/ {currentTargetP1.toFixed(1)}</span>
          </div>
        </div>
        
        {/* Primary Target Bar */}
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="flex-1 bg-gray-100 rounded-full h-5 relative group cursor-pointer overflow-hidden"
            onMouseEnter={() => setShowP1Over(false)}
          >
            <div className={`h-full rounded-full flex items-center justify-end px-2 ${isP1TargetMet ? 'bg-green-500' : 'bg-teal-500'}`} style={{ width: `${p1Progress}%` }}>
              <span className="text-[10px] text-white font-bold drop-shadow-md">Target: {targetP1.toFixed(1)}</span>
            </div>
             {/* If progress is low, show text outside or leave hidden - sticking to inside as requested */}
          </div>
          <span className="text-lg">{isP1TargetMet ? '✅' : '🔜'}</span>
        </div>
        
        {/* Gold Overachievement Bar */}
        <div className="flex items-center gap-2">
          <div 
            className="flex-1 bg-yellow-50 rounded-full h-5 relative group cursor-pointer hover:bg-yellow-100 transition-colors overflow-hidden"
            onMouseEnter={() => {
              setShowP1Over(true);
              if (isP1Over) onGoldHover();
            }}
          >
            <div className={`h-full rounded-full flex items-center justify-end px-2 bg-yellow-400 ${isP1Over ? 'shadow-[0_0_8px_rgba(250,204,21,0.6)]' : ''}`} style={{ width: `${p1OverProgress}%` }}>
              <span className="text-[10px] text-yellow-900 font-bold">Pillar: {overP1.toFixed(1)}</span>
            </div>
          </div>
          <span className="text-lg">{isP1Over ? '✅' : '🔜'}</span>
        </div>
      </div>

      {/* P4 Stats */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-1">
          <span className="font-bold text-sm text-gray-700">Acquisition P4</span>
           <div className="text-right">
             <span className="text-lg font-bold text-gray-800">{stats.acquisitionP4}</span>
             <span className="text-xs text-gray-400 ml-1">/ {currentTargetP4.toFixed(1)}</span>
          </div>
        </div>
        
        {/* Primary Target Bar */}
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="flex-1 bg-gray-100 rounded-full h-5 relative group cursor-pointer overflow-hidden"
            onMouseEnter={() => setShowP4Over(false)}
          >
             <div className={`h-full rounded-full flex items-center justify-end px-2 ${isP4TargetMet ? 'bg-blue-600' : 'bg-blue-400'}`} style={{ width: `${p4Progress}%` }}>
               <span className="text-[10px] text-white font-bold drop-shadow-md">Target: {targetP4.toFixed(1)}</span>
             </div>
          </div>
          <span className="text-lg">{isP4TargetMet ? '✅' : '🔜'}</span>
        </div>

        {/* Gold Overachievement Bar */}
        <div className="flex items-center gap-2">
          <div 
            className="flex-1 bg-yellow-50 rounded-full h-5 relative group cursor-pointer hover:bg-yellow-100 transition-colors overflow-hidden"
            onMouseEnter={() => {
              setShowP4Over(true);
              if (isP4Over) onGoldHover();
            }}
          >
             <div className={`h-full rounded-full flex items-center justify-end px-2 bg-yellow-400 ${isP4Over ? 'shadow-[0_0_8px_rgba(250,204,21,0.6)]' : ''}`} style={{ width: `${p4OverProgress}%` }}>
               <span className="text-[10px] text-yellow-900 font-bold">Pillar: {overP4.toFixed(1)}</span>
             </div>
          </div>
          <span className="text-lg">{isP4Over ? '✅' : '🔜'}</span>
        </div>
      </div>

      {/* P5 Stat (Simple Box) */}
      <div className="bg-purple-50 p-2 rounded border border-purple-100 flex justify-between items-center">
        <span className="text-xs font-bold text-purple-700">Offtake P5</span>
        <span className="text-lg font-bold text-purple-800">{stats.offtakeP5}</span>
      </div>

    </div>
  );
};

const SummaryCard = ({ title, actual, target, color }: any) => {
  const colors: any = {
    teal: 'bg-teal-50 border-teal-100 text-teal-800',
    blue: 'bg-blue-50 border-blue-100 text-blue-800',
    purple: 'bg-purple-50 border-purple-100 text-purple-800',
  };
  
  const percent = target ? (actual / target) * 100 : 0;

  return (
    <div className={`p-6 rounded-xl border ${colors[color] || colors.teal} shadow-sm`}>
      <h3 className="text-sm font-bold opacity-70 uppercase tracking-wider mb-2">{title}</h3>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold">{actual}</span>
        {target && (
           <div className="text-right">
             <span className="text-xs block opacity-70">Target: {target.toFixed(0)}</span>
             <span className={`text-sm font-bold ${percent >= 100 ? 'text-green-600' : ''}`}>
               {percent.toFixed(1)}%
             </span>
           </div>
        )}
      </div>
      {target && (
         <div className="w-full bg-white/50 rounded-full h-1.5 mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full ${percent >= 100 ? 'bg-green-500' : 'bg-current'} opacity-80`} 
              style={{ width: `${Math.min(percent, 100)}%` }} 
            />
         </div>
      )}
    </div>
  );
};

// Money Rain Component
const MoneyRain = () => {
  const [emojis, setEmojis] = useState<any[]>([]);

  useEffect(() => {
    const newEmojis = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // Random horizontal position 0-100%
      delay: Math.random() * 0.5, // Random delay
      duration: 1 + Math.random(), // Random fall duration
      char: Math.random() > 0.5 ? '💲' : '💰'
    }));
    setEmojis(newEmojis);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {emojis.map((emoji) => (
        <div
          key={emoji.id}
          className="absolute top-[-50px] text-2xl animate-fall"
          style={{
            left: `${emoji.left}%`,
            animationDuration: `${emoji.duration}s`,
            animationDelay: `${emoji.delay}s`,
            animationFillMode: 'forwards'
          }}
        >
          {emoji.char}
        </div>
      ))}
      <style jsx>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
        }
      `}</style>
    </div>
  );
};
