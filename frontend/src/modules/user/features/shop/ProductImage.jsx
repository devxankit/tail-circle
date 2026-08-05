import React from 'react';
import * as Icons from 'lucide-react';

export function ProductImage({ src, alt, className }) {
  if (src && src.startsWith('lucide:')) {
    const iconName = src.replace('lucide:', '');
    const IconComponent = Icons[iconName] || Icons.Image;
    return (
      <div className={`flex items-center justify-center bg-[#FAF7F2] text-[#66B4B1] ${className}`}>
        <IconComponent className="w-1/3 h-1/3 opacity-70" strokeWidth={1.5} />
      </div>
    );
  }
  
  return <img src={src} alt={alt} className={className} />;
}
