import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, ShoppingBag, Stethoscope, User, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Comprehensive mock database for global search
const SEARCH_DATABASE = [
  { id: 't1', type: 'toy', name: 'Squeaky Rubber Bone', category: 'Shop', path: '/app/shop', icon: ShoppingBag },
  { id: 't2', type: 'toy', name: 'Rope Tug Toy', category: 'Shop', path: '/app/shop', icon: ShoppingBag },
  { id: 't3', type: 'food', name: 'Premium Beef Kibble', category: 'Shop', path: '/app/shop', icon: ShoppingBag },
  { id: 'v1', type: 'vet', name: 'Dr. Sarah Jenkins', category: 'Vets', path: '/app/services/doctors', icon: Stethoscope },
  { id: 'v2', type: 'vet', name: 'City Paws Clinic', category: 'Vets', path: '/app/services/doctors', icon: Stethoscope },
  { id: 'v3', type: 'vet', name: 'Dr. Michael Chen', category: 'Vets', path: '/app/services/doctors', icon: Stethoscope },
  { id: 'f1', type: 'friend', name: 'Bella (Frenchie)', category: 'Friends', path: '/app/matches', icon: User },
  { id: 'f2', type: 'friend', name: 'Rocky (Pug)', category: 'Friends', path: '/app/matches', icon: User },
  { id: 'f3', type: 'friend', name: 'Luna (Samoyed)', category: 'Friends', path: '/app/matches', icon: User },
  { id: 'f4', type: 'friend', name: 'Charlie (Golden)', category: 'Friends', path: '/app/matches', icon: User },
];

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Optimized filtering using useMemo
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    
    return SEARCH_DATABASE.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) || 
      item.category.toLowerCase().includes(lowerQuery) ||
      item.type.toLowerCase().includes(lowerQuery)
    ).slice(0, 5); // Limit to top 5 results for performance
  }, [query]);

  const handleResultClick = (path) => {
    setQuery('');
    setIsFocused(false);
    navigate(path);
  };

  const clearSearch = () => {
    setQuery('');
    // keep focus if wanted, but generally good to just clear
  };

  return (
    <div ref={searchRef} className="px-4 mt-4 mb-6 relative z-30">
      <div className="relative flex items-center">
        <Search className={`absolute left-4 transition-colors ${isFocused ? 'text-primary-main' : 'text-text-secondary'}`} size={20} />
        
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search for toys, vets, or friends..." 
          className="w-full h-12 bg-white rounded-2xl pl-12 pr-12 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary-main/20 border border-border-light focus:border-primary-main transition-all shadow-sm"
        />
        
        {query && (
          <button 
            onClick={clearSearch}
            className="absolute right-4 text-text-disabled hover:text-text-primary p-1"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Optimized Search Results Dropdown */}
      {isFocused && query.trim().length > 0 && (
        <div className="absolute top-full mt-2 left-4 right-4 bg-white rounded-2xl shadow-xl border border-border-light overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {searchResults.length > 0 ? (
            <div className="flex flex-col">
              {searchResults.map((result) => {
                const Icon = result.icon;
                return (
                  <div 
                    key={result.id}
                    onClick={() => handleResultClick(result.path)}
                    className="flex items-center gap-3 p-4 hover:bg-bg-secondary cursor-pointer transition-colors border-b border-border-light last:border-0"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-light/20 text-primary-main flex items-center justify-center shrink-0">
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-text-primary">{result.name}</h4>
                      <span className="text-xs text-text-secondary">{result.category}</span>
                    </div>
                    <ArrowRight size={16} className="text-text-disabled" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center">
              <Search className="mx-auto text-border-light mb-2" size={32} />
              <p className="text-sm text-text-secondary">No results found for "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
