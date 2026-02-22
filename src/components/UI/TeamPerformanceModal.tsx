"use client";
import React, { useState, useEffect } from 'react';
import { X, Loader2, CalendarDays, CheckCircle2, Users, Target, Trophy, TrendingUp } from 'lucide-react';
import { useSales } from '@/context/SalesContext';
import { useAuth } from '@/context/AuthContext';

interface TeamPerformanceModalProps {
  onClose: () => void;
}

export default function TeamPerformanceModal({ onClose }: TeamPerformanceModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { totals, loading: salesLoading, rawData, settings, updateSetting, updateUserTarget } = useSales();
  const activatorTotals = rawData?.activatorTotals || {};
  const usersWithData = rawData?.users || []; // Need to fetch all users to get targets even if no sales

  const teamBonusTarget = parseInt(settings.team_bonus_target || '0');
  const [rainTimestamp, setRainTimestamp] = useState<number | null>(null);
  const [storeTotal, setStoreTotal] = useState(0);
  const [storesList, setStoresList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
     setLoading(true);
     Promise.all([
        fetch('/api/stores?all=true').then(res => res.json()),
        fetch('/api/users').then(res => res.json())
     ]).then(([storesData, usersData]) => {
        if (Array.isArray(storesData)) {
           const sum = storesData.reduce((acc, store) => acc + (parseInt(store.totalAcquisition) || 0), 0);
           setStoreTotal(sum);
           setStoresList(storesData.sort((a, b) => (b.totalAcquisition || 0) - (a.totalAcquisition || 0)));
        }
        if (Array.isArray(usersData)) {
            setAllUsers(usersData);
        }
     }).finally(() => setLoading(false));
  }, [salesLoading]); // Re-fetch when sales context refreshes (e.g. after history save)

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

  const totalP1 = Object.values(totals).reduce((acc: number, curr: any) => acc + curr.acquisitionP1, 0);
  const totalP4 = Object.values(totals).reduce((acc: number, curr: any) => acc + curr.acquisitionP4, 0);
  const totalP5 = Object.values(totals).reduce((acc: number, curr: any) => acc + curr.offtakeP5, 0);

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden relative">
        
        {rainTimestamp && <MoneyRain key={rainTimestamp} />}

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

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          
          <div className="bg-gradient-to-r from-teal-800 to-teal-600 text-white p-8 rounded-xl shadow-lg mb-8 flex flex-col items-center justify-center text-center transform transition-all hover:shadow-teal-200/50">
              <h3 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">Total Team Acquisitions</h3>
              <div className="flex items-center gap-6">
                  <div className="text-7xl font-black tracking-tight drop-shadow-lg">
                    {storeTotal}
                  </div>
                  {teamBonusTarget > 0 && (
                      <div className="h-16 w-[2px] bg-white/20 hidden sm:block"></div>
                  )}
                  {teamBonusTarget > 0 && (
                      <div className="text-left">
                          <div className="text-sm opacity-60 font-bold uppercase">Bonus Target</div>
                          <div className="text-3xl font-black">{teamBonusTarget}</div>
                          <div className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded mt-1">
                              {Math.round((storeTotal / teamBonusTarget) * 100)}% Reached
                          </div>
                      </div>
                  )}
              </div>
              
              {isAdmin && (
                  <div className="mt-6 flex items-center gap-2 bg-black/20 p-2 rounded-lg backdrop-blur-sm border border-white/10">
                      <Target size={14} className="text-teal-300" />
                      <input 
                        type="number"
                        placeholder="Set Team Bonus..."
                        className="bg-transparent border-none outline-none text-xs font-bold w-32 placeholder:text-white/40"
                        onBlur={(e) => updateSetting('team_bonus_target', e.target.value)}
                        defaultValue={teamBonusTarget || ''}
                      />
                  </div>
              )}
          </div>

          {/* Activator Performance Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {Object.entries(activatorTotals).map(([id, data]: any) => {
                const dbUser = allUsers.find(u => u.id === id);
                const target = dbUser?.activatorTarget || 0;
                return (
                    <div key={id} className="bg-white p-6 rounded-xl border-2 border-indigo-50 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Trade Activator</h3>
                                    <div className="text-lg font-black text-gray-800">{data.name}</div>
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="flex items-center gap-2 bg-gray-50 border p-1 px-2 rounded-lg">
                                    <Target size={12} className="text-gray-400" />
                                    <input 
                                       type="number"
                                       className="bg-transparent border-none outline-none text-[10px] font-bold w-16"
                                       placeholder="Set Target"
                                       onBlur={(e) => updateUserTarget(data.name, { activatorTarget: e.target.value })}
                                       defaultValue={target || ''}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-3xl font-black text-indigo-600 leading-none">
                                    {data.total}
                                    {target > 0 && <span className="text-gray-300 mx-1">/</span>}
                                    {target > 0 && <span className="text-gray-400 text-xl">{target}</span>}
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">
                                    {target > 0 ? `${Math.round((data.total / target) * 100)}% of Performance Target` : 'Attributed Acquisitions'}
                                </div>
                            </div>
                            <div className={`text-right ${data.total >= target && target > 0 ? 'text-green-500' : 'opacity-20'}`}>
                                 <CheckCircle2 size={40} />
                            </div>
                        </div>
                    </div>
                );
            })}
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-6">Individual Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(totals).map(([name, stats]: any) => {
              const dbUser = allUsers.find(u => u.name === name);
              const wd = stats.workingDays;
              
              // Dynamic Target Logic
              const bonusValue = dbUser?.bonusTarget || 1.7;
              const bonusType = dbUser?.bonusTargetType || 'multiplier';
              const pillarValue = dbUser?.pillarGoal || 1.9;
              const pillarType = dbUser?.pillarGoalType || 'multiplier';

              const targets = {
                targetP1: bonusType === 'multiplier' ? wd * bonusValue : bonusValue,
                overP1: pillarType === 'multiplier' ? wd * pillarValue : pillarValue,
                targetP4: wd * 0.7, // P4 static target for now
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
                  isAdmin={isAdmin}
                  onTargetUpdate={(data: any) => updateUserTarget(name, data)}
                  dbUser={dbUser}
                />
              );
            })}
          </div>

          {/* Lower Summary Section (Moved from top) */}
          <div className="mt-12 pt-10 border-t border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Acquisition & Offtake Totals</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                <SummaryCard 
                  title="Acquisition P1" 
                  actual={totalP1} 
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
          </div>


        </div>
      </div>
    </div>
  );
}

const PersonStatsCard = ({ name, stats, workingDays, targets, onGoldHover, isAdmin, onTargetUpdate, dbUser }: any) => {
  const { targetP1, overP1, targetP4, overP4 } = targets;
  const [showP1Over, setShowP1Over] = useState(false);
  const [showP4Over, setShowP4Over] = useState(false);

  const bonusValue = dbUser?.bonusTarget || 1.7;
  const bonusType = dbUser?.bonusTargetType || 'multiplier';
  const pillarValue = dbUser?.pillarGoal || 1.9;
  const pillarType = dbUser?.pillarGoalType || 'multiplier';

  const p1Progress = Math.min((stats.acquisitionP1 / targetP1) * 100, 100);
  const p1OverProgress = Math.min((stats.acquisitionP1 / overP1) * 100, 100);
  const isP1Over = stats.acquisitionP1 >= overP1;
  const isP1TargetMet = stats.acquisitionP1 >= targetP1;

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

      {isAdmin && (
          <div className="flex gap-2 mb-6 p-2 bg-gray-50 rounded-lg border border-dashed">
              <div className="flex-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Set Bonus</label>
                  <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        step="0.1"
                        className="w-full text-xs p-1 border rounded"
                        defaultValue={bonusValue}
                        onBlur={(e) => onTargetUpdate({ bonusTarget: e.target.value })}
                      />
                      <select 
                        className="text-[10px] border rounded p-1"
                        defaultValue={bonusType}
                        onChange={(e) => onTargetUpdate({ bonusTargetType: e.target.value })}
                      >
                          <option value="multiplier">xWD</option>
                          <option value="fixed">Fix</option>
                      </select>
                  </div>
              </div>
              <div className="flex-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Set Pillar</label>
                  <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        step="0.1"
                        className="w-full text-xs p-1 border rounded"
                        defaultValue={pillarValue}
                        onBlur={(e) => onTargetUpdate({ pillarGoal: e.target.value })}
                      />
                      <select 
                        className="text-[10px] border rounded p-1"
                        defaultValue={pillarType}
                        onChange={(e) => onTargetUpdate({ pillarGoalType: e.target.value })}
                      >
                          <option value="multiplier">xWD</option>
                          <option value="fixed">Fix</option>
                      </select>
                  </div>
              </div>
          </div>
      )}


      <div className="mb-6">
        <div className="flex justify-between items-end mb-1">
          <span className="font-bold text-sm text-gray-700">Acquisition P1</span>
          <div className="text-right">
             <span className="text-lg font-bold text-gray-800">{stats.acquisitionP1}</span>
             <span className="text-xs text-gray-400 ml-1">/ {currentTargetP1.toFixed(1)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="flex-1 bg-gray-100 rounded-full h-5 relative group cursor-pointer overflow-hidden"
            onMouseEnter={() => setShowP1Over(false)}
          >
            <div className={`h-full rounded-full flex items-center justify-end px-2 ${isP1TargetMet ? 'bg-green-500' : 'bg-teal-500'}`} style={{ width: `${p1Progress}%` }}>
              <span className="text-[10px] text-white font-bold drop-shadow-md">Target: {targetP1.toFixed(1)}</span>
            </div>
          </div>
          <span className="text-lg">{isP1TargetMet ? '✅' : '🔜'}</span>
        </div>
        
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

      <div className="mb-6">
        <div className="flex justify-between items-end mb-1">
          <span className="font-bold text-sm text-gray-700">Acquisition P4</span>
           <div className="text-right">
             <span className="text-lg font-bold text-gray-800">{stats.acquisitionP4}</span>
             <span className="text-xs text-gray-400 ml-1">/ {currentTargetP4.toFixed(1)}</span>
          </div>
        </div>
        
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

const MoneyRain = () => {
  const [emojis, setEmojis] = useState<any[]>([]);

  useEffect(() => {
    const newEmojis = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, 
      delay: Math.random() * 0.5, 
      duration: 1 + Math.random(), 
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
