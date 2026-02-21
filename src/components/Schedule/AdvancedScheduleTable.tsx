"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Save, X, Check, ChevronLeft, ChevronRight, Search, Trash2, Pencil } from 'lucide-react';
import AddShiftsModal from './AddShiftsModal';

// --- Types ---
interface ScheduleEntry {
  id?: string;
  userId: string;
  user?: { name: string; role: string };
  date: string; // ISO string
  shift: string;
  storeId: string;
  store?: { name: string };
  shift2?: string;
  storeId2?: string;
  store2?: { name: string };
  status: string;
  notes?: string;
}

// --- Status Options ---
// --- Status Options ---
const STATUS_OPTIONS = ['Pending', 'Present', 'Sick', 'Off', 'Leave'];

interface Props {
    isLocked?: boolean;
}

export default function AdvancedScheduleTable({ isLocked = false }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<ScheduleEntry[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingShift, setEditingShift] = useState<ScheduleEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Date Range (Default to current month)
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const startOfMonth = useMemo(() => {
    // Force to year-month-01 in local time and return as YYYY-MM-DD
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }, [currentDate]);

  const endOfMonth = useMemo(() => {
    // Get last day of current month in local time 
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [currentDate]);

  // --- Fetch Data ---
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
        // Fetch Schedules
        // Use user.name for specialist filtering as the DB schema relates Schedule.userId to User.name
        const filterId = user?.role === 'specialist' ? user.name : user?.id;
        const resSchedule = await fetch(`/api/schedule?start=${startOfMonth}&end=${endOfMonth}&userId=${filterId}&role=${user?.role}`);
        const scheduleData = await resSchedule.json();
        
        // Fetch Stores (for dropdown) - Only needed if Activator/Admin
        if (user?.role !== 'specialist') {
            const resStores = await fetch('/api/stores');
            const storesData = await resStores.json();
            // Global UI Filter
            setStores(Array.isArray(storesData) ? storesData.filter((s: any) => s.name !== 'System - Specialist Adjustments') : []);
            
            const resUsers = await fetch('/api/users'); 
            setUsers(await resUsers.json());
        }

        if (Array.isArray(scheduleData)) {
            setData(scheduleData);
        }
    } catch (e) {
        console.error("Failed to load data", e);
    } finally {
        if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
        fetchData();
        
        // Polling for reactivity (refresh every 10 seconds silently)
        const interval = setInterval(() => {
            fetchData(true);
        }, 10000);
        
        return () => clearInterval(interval);
    }
  }, [user, currentDate, startOfMonth, endOfMonth]); 

  // --- Update Handler ---
  const handleUpdate = async (rowIndex: number, columnId: string, value: any) => {
    const row = data[rowIndex];
    const newData = [...data];
    
    // Optimistic Update
    // @ts-ignore
    newData[rowIndex] = { ...row, [columnId]: value };
    setData(newData);

    try {
        const payload = {
            userId: row.userId, // This is already the Name from the DB
            date: row.date,
            status: row.status, 
            notes: row.notes,
            storeId: row.storeId,
            shift: row.shift,
            requestingUserRole: user?.role,
            requestingUserId: user?.id,
            [columnId]: value // Overwrite changed field
        };

        const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.details || err.error || 'Failed to save');
        }
        
    } catch (e: any) {
        console.error("Save failed", e);
        alert(`Failed to save change: ${e.message}`);
        fetchData(); // Revert by re-fetching
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή τη βάρδια;')) return;

    try {
        const res = await fetch(`/api/schedule?id=${id}&role=${user?.role}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            setData(prev => prev.filter(item => item.id !== id));
        } else {
            const err = await res.json();
            alert(`Failed to delete: ${err.details || err.error}`);
        }
    } catch (e) {
        console.error("Delete failed", e);
        alert("Error deleting shift");
    }
  };

  // --- Columns Configuration ---
  const columnHelper = createColumnHelper<ScheduleEntry>();

  const columns = useMemo(() => [
    columnHelper.accessor('date', {
        header: 'Date',
        cell: (info: any) => new Date(info.getValue()).toLocaleDateString('el-GR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        enableSorting: true,
    }),
    columnHelper.accessor('user.name', {
        header: 'Specialist',
        cell: (info: any) => <span className="font-medium text-gray-700">{info.getValue() || info.row.original.userId}</span>
    }),
    columnHelper.accessor('storeId', {
        header: 'Store(s)',
        cell: ({ row, getValue }: any) => {
            const val = getValue();
            const val2 = row.original.storeId2;
            const isAdmin = user?.role !== 'specialist';
            const isSplit = !!val2;
            
            if (!isAdmin) {
                return (
                    <div className="flex flex-col gap-1">
                        <div>{row.original.store?.name || '-'}</div>
                        {isSplit && <div className="text-xs text-gray-500 border-t pt-1">{row.original.store2?.name || '-'}</div>}
                    </div>
                );
            }

            return (
                <div className="flex flex-col gap-2">
                    <select 
                        className="w-full bg-transparent border-none focus:ring-0 text-sm p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        value={val || ''}
                        disabled={isLocked}
                        onChange={(e) => handleUpdate(row.index, 'storeId', e.target.value)}
                    >
                        <option value="">Select Store 1</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    
                    <select 
                        className="w-full bg-transparent border-none focus:ring-0 text-[11px] p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed border-t border-dashed"
                        value={val2 || ''}
                        disabled={isLocked}
                        onChange={(e) => handleUpdate(row.index, 'storeId2', e.target.value)}
                    >
                        <option value="">Select Store 2 (Split)</option>
                        {stores.filter(s => s.id !== val).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            )
        }
    }),
    columnHelper.accessor('shift', {
        header: 'Shift Time(s)',
        cell: ({ row, getValue }: any) => {
            const val = getValue() || '';
            const val2 = row.original.shift2 || '';
            const isAdmin = user?.role !== 'specialist';
            const isSplit = !!row.original.storeId2;

            if (!isAdmin) {
                return (
                    <div className="flex flex-col gap-1">
                        <div>{val || '-'}</div>
                        {isSplit && <div className="text-xs text-gray-500 border-t pt-1">{val2 || '-'}</div>}
                    </div>
                );
            }

            return (
                <div className="flex flex-col gap-2">
                    <input 
                        className="w-full bg-transparent border-none focus:ring-0 text-sm p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                        value={val}
                        disabled={isLocked}
                        onChange={(e) => {
                             const updated = [...data];
                             updated[row.index].shift = e.target.value;
                             setData(updated);
                        }}
                        onBlur={(e) => handleUpdate(row.index, 'shift', e.target.value)}
                        placeholder="09:00-17:00"
                    />
                    
                    <input 
                        className="w-full bg-transparent border-none focus:ring-0 text-[11px] p-1 rounded hover:bg-gray-100 disabled:opacity-50 border-t border-dashed"
                        value={val2}
                        disabled={isLocked || !isSplit}
                        onChange={(e) => {
                             const updated = [...data];
                             // @ts-ignore
                             updated[row.index].shift2 = e.target.value;
                             setData(updated);
                        }}
                        onBlur={(e) => handleUpdate(row.index, 'shift2', e.target.value)}
                        placeholder="Second Shift"
                    />
                </div>
            )
        }
    }),
    columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row, getValue }: any) => {
            const val = getValue();
            // All roles can edit status (with different permissions enforced by API)
            
            let colorClass = 'bg-gray-100 text-gray-600';
            if (val === 'Present') colorClass = 'bg-green-100 text-green-700';
            if (val === 'Sick') colorClass = 'bg-red-100 text-red-700';
            if (val === 'Off') colorClass = 'bg-orange-100 text-orange-700';

            return (
                <select 
                    className={`w-full border-none focus:ring-0 text-xs font-bold py-1 px-2 rounded appearance-none cursor-pointer ${colorClass} disabled:opacity-50`}
                    value={val || 'Pending'}
                    disabled={isLocked}
                    onChange={(e) => handleUpdate(row.index, 'status', e.target.value)}
                >
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            )
        }
    }),
    columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
            if (user?.role === 'specialist') return null;
            return (
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => {
                            setEditingShift(row.original);
                            setShowEditModal(true);
                        }}
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Shift"
                    >
                        <Pencil size={15} />
                    </button>
                    <button 
                        onClick={() => row.original.id && handleDelete(row.original.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete Shift"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            )
        }
    })
  ], [data, stores, user, isLocked]);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
        {/* Header Actions */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} 
                  className="p-1 hover:bg-gray-200 rounded"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="font-bold text-lg text-gray-800">
                    {currentDate.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }).toUpperCase()}
                </div>
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} 
                  className="p-1 hover:bg-gray-200 rounded"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        value={globalFilter}
                        onChange={e => setGlobalFilter(e.target.value)}
                        placeholder="Search..."
                        className="pl-8 pr-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>
                {loading && <Loader2 className="animate-spin text-primary" />}
            </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 sticky top-0 z-10">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th key={header.id} className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-r last:border-r-0">
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y">
                    {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map(row => (
                            <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="p-2 border-r last:border-r-0 text-sm align-middle">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="p-8 text-center text-gray-400">
                                No schedule data found for this period.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Pagination / Footer */}
        <div className="p-3 border-t bg-gray-50 text-xs flex justify-between items-center text-gray-600">
            <span>{table.getRowModel().rows.length} rows</span>
            <div className="text-[10px] italic">Trade Activators can edit/delete shifts. Specialists have read-only access.</div>
        </div>

        {/* Edit Modal */}
        {showEditModal && editingShift && (
            <AddShiftsModal 
                editData={editingShift}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingShift(null);
                }}
                onSave={() => {
                    setShowEditModal(false);
                    setEditingShift(null);
                    fetchData(); // Refresh table after edit
                }}
            />
        )}
    </div>
  );
}
