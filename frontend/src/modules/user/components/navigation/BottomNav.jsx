import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Heart, Users, ShoppingBag, User } from 'lucide-react';
import { cn } from '../../utils/cn';

export function BottomNav() {
  const navItems = [
    { name: 'Home', path: '/app/home', icon: Home },
    { name: 'Matches', path: '/app/matches', icon: Heart },
    { name: 'Community', path: '/app/community', icon: Users },
    { name: 'Shop', path: '/app/shop', icon: ShoppingBag },
    { name: 'Profile', path: '/app/profile', icon: User },
  ];

  return (
    <div 
      className="absolute bottom-0 w-full bg-white/70 backdrop-blur-lg border-t border-white/50 flex justify-around items-center px-2 z-50 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
      style={{
        height: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive ? "text-primary-main" : "text-text-disabled hover:text-text-secondary"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-2 rounded-2xl transition-all duration-300 flex items-center justify-center",
                  isActive ? "bg-primary-light/20" : "bg-transparent"
                )}>
                  <Icon 
                    size={24} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={cn("transition-transform duration-300", isActive && "scale-110")}
                  />
                </div>
                {isActive && (
                  <span className="text-[10px] font-semibold animate-in slide-in-from-bottom-1 fade-in">
                    {item.name}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}
