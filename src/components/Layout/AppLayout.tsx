"use client";
import React from 'react';
import Sidebar from './Sidebar';
import { Suspense } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Suspense fallback={<div className="w-80 h-full bg-white animate-pulse" />}>
        <Sidebar />
      </Suspense>
      <div className="flex-1 relative h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
