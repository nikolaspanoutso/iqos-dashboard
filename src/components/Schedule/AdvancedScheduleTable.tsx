"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Save, X, Check, ChevronLeft, ChevronRight, Search } from 'lucide-react';

// --- Types ---
interface ScheduleEntry {
  id?: string;
  userId: string;
  user?: { name: string; role: string };
  date: string; // ISO string
  shift: string;
  storeId: string;
  store?: { name: string };
  status: string;
  notes?: string;
}

// --- Status Options ---
const STATUS_OPTIONS = ['Pending', 'Present', 'Sick', 'Off', 'Leave'];

export default function AdvancedScheduleTable() {
  const { user } = useAuth();
  const [data, setData] = useState<ScheduleEntry[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');

  // Date Range (Default to current month)
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    try {
        // Fetch Schedules
        const resSchedule = await fetch(`/api/schedule?start=${startOfMonth}&end=${endOfMonth}&userId=${user?.id}&role=${user?.role}`);
        const scheduleData = await resSchedule.json();
        
        // Fetch Stores (for dropdown) - Only needed if Activator/Admin
        if (user?.role !== 'specialist') {
            const resStores = await fetch('/api/stores'); // Assuming returns all stores
            setStores(await resStores.json());
            
            const resUsers = await fetch('/api/users'); // Need endpoint for users list
            setUsers(await resUsers.json());
        }

        if (Array.isArray(scheduleData)) {
            setData(scheduleData);
        }
    } catch (e) {
        console.error("Failed to load data", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user, currentDate]); // Reload when month changes

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
            userId: row.userId,
            date: row.date,
            status: row.status, // Default to existing
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

        if (!res.ok) throw new Error('Failed to save');
        
        // Refresh data to get ID/Associations if it was a new entry
        // For simplicity in this demo, strictly relying on optimistic usually requires a re-fetch or ID update
    } catch (e) {
        console.error("Save failed", e);
        // Revert?
        alert("Failed to save change. Please refresh.");
    }
  };

  // --- Columns Configuration ---
  const columnHelper = createColumnHelper<ScheduleEntry>();

  const columns = useMemo(() => [
    columnHelper.accessor('date', {
        header: 'Date',
        cell: info => new Date(info.getValue()).toLocaleDateString('el-GR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        enableSorting: true,
    }),
    columnHelper.accessor('user.name', {
        header: 'Specialist',
        cell: info => <span className="font-medium text-gray-700">{info.getValue() || info.row.original.userId}</span>
    }),
    columnHelper.accessor('storeId', {
        header: 'Store',
        cell: ({ row, getValue }) => {
            const val = getValue();
            const isAdmin = user?.role !== 'specialist';
            
            if (!isAdmin) return row.original.store?.name || '-';

            return (
                <select 
                    className="w-full bg-transparent border-none focus:ring-0 text-sm p-1 rounded hover:bg-gray-100"
                    value={val || ''}
                    onChange={(e) => handleUpdate(row.index, 'storeId', e.target.value)}
                >
                    <option value="">Select Store</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            )
        }
    }),
    columnHelper.accessor('shift', {
        header: 'Shift',
        cell: ({ row, getValue }) => {
            const val = getValue() || '';
            const isAdmin = user?.role !== 'specialist';

            if (!isAdmin) return val;

            return (
                <input 
                    className="w-full bg-transparent border-none focus:ring-0 text-sm p-1 rounded hover:bg-gray-100"
                    value={val}
                    onChange={(e) => {
                         // Interactive input usually needs local state for debounce, 
                         // but for quick demo relying on blur or simple change
                         // Let's rely on onBlur for API save to avoid too many reqs
                         const updated = [...data];
                         updated[row.index].shift = e.target.value;
                         setData(updated);
                    }}
                    onBlur={(e) => handleUpdate(row.index, 'shift', e.target.value)}
                    placeholder="09:00-17:00"
                />
            )
        }
    }),
    columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row, getValue }) => {
            const val = getValue();
            // All roles can edit status (with different permissions enforced by API)
            
            let colorClass = 'bg-gray-100 text-gray-600';
            if (val === 'Present') colorClass = 'bg-green-100 text-green-700';
            if (val === 'Sick') colorClass = 'bg-red-100 text-red-700';
            if (val === 'Off') colorClass = 'bg-orange-100 text-orange-700';

            return (
                <select 
                    className={`w-full border-none focus:ring-0 text-xs font-bold py-1 px-2 rounded appearance-none cursor-pointer ${colorClass}`}
                    value={val || 'Pending'}
                    onChange={(e) => handleUpdate(row.index, 'status', e.target.value)}
                >
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            )
        }
    })
  ], [data, stores, user]);

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
    getPaginationRowModel: getPaginationRowModel(),
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
        
        {/* Pagination */}
        <div className="p-3 border-t bg-gray-50 text-xs flex justify-end gap-2 text-gray-600">
            <span>{table.getRowModel().rows.length} rows</span>
        </div>
    </div>
  );
}
