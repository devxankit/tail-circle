import React from 'react';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex flex-col flex-1 h-full w-full bg-white overflow-y-auto hide-scrollbar">
      <div className="flex-1 w-full flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}
