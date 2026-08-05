import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from '../components/navigation/BottomNav';

export function MainLayout() {
  return (
    <div className="flex flex-col flex-1 h-full w-full bg-transparent relative overflow-hidden">
      {/* Scrollable Content Area */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar"
        style={{ paddingBottom: 'calc(82px + env(safe-area-inset-bottom, 0px))' }}
      >
        <Outlet />
      </div>
      
      {/* Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
