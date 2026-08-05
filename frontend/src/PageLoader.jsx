import React from 'react';
import { PawPrint } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full bg-[#FAF7F2]">
      <div className="relative">
        <PawPrint className="text-[#F87B68] animate-bounce w-12 h-12" />
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-1 bg-black/10 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
}
