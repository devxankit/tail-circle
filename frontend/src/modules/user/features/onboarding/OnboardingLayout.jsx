import React from 'react';
import { Outlet } from 'react-router-dom';

export function OnboardingLayout() {
  return (
    <div className="flex flex-col flex-1 h-full w-full bg-bg-primary overflow-y-auto hide-scrollbar">
      <div className="flex-1 w-full px-6 py-8 flex flex-col relative">
        <Outlet />
      </div>
    </div>
  );
}
