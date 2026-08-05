import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const FILTER_SECTIONS = [
  {
    title: 'Dog/Cat',
    id: 'petType',
    options: ['Dog', 'Cat']
  },
  {
    title: 'Brand',
    id: 'brand',
    options: ['NutriMeow', 'TailBark', 'SpaDog', 'DentalVet', 'MeowToys', 'TailCircle Essentials']
  },
  {
    title: 'Veg, Non-Veg',
    id: 'dietType',
    options: ['Veg', 'Non-Veg']
  },
  {
    title: 'Life Stage',
    id: 'lifeStage',
    options: ['Kitten', 'Puppy', 'Adult', 'Senior', 'All Life Stages']
  },
  {
    title: 'Product Type',
    id: 'productType',
    options: ['Dry Food', 'Wet Food', 'Treats', 'Toy', 'Accessory', 'Grooming']
  },
  {
    title: 'Special Diet',
    id: 'specialDiet',
    options: ['Easy to digest', 'High Protein', 'Protein Rich', 'Skin & Coat', 'Joint Care']
  },
  {
    title: 'Protein Source',
    id: 'proteinSource',
    options: ['Chicken', 'Fish', 'Salmon']
  },
  {
    title: 'Price',
    id: 'priceRange',
    options: ['INR 10 - INR 300', 'INR 301 - INR 500', 'INR 501 - INR 1000', 'INR 1001 - INR 2000', 'INR 2000+']
  },
  {
    title: 'Quick Filters',
    id: 'quickFilters',
    options: ['Bestseller', 'New Arrival']
  },
  {
    title: 'Discount Range',
    id: 'discountRange',
    options: ['10% and above', '20% and above', '30% and above']
  },
  {
    title: 'Weight',
    id: 'weight',
    options: ['80 gm', '400 gm', '1 kg', '6 kg', '10 kg']
  },
  {
    title: 'Sub Category',
    id: 'subCategory',
    options: ['Cat Dry Food', 'Cat Wet Food', 'Combo & Value Pack', 'Dog Dry Food', 'Cat Toys', 'Collars & Leashes', 'Shampoos', 'Dog Treats', 'Bowls & Feeders']
  }
];

export function FilterDrawer({ isOpen, onClose, onApply, currentFilters, totalProducts }) {
  const [localFilters, setLocalFilters] = useState({});

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(currentFilters || {});
    }
  }, [isOpen, currentFilters]);

  const toggleFilter = (sectionId, option) => {
    setLocalFilters(prev => {
      const currentList = prev[sectionId] || [];
      const isSelected = currentList.includes(option);
      
      let newList;
      if (isSelected) {
        newList = currentList.filter(item => item !== option);
      } else {
        newList = [...currentList, option];
      }

      if (newList.length === 0) {
        const { [sectionId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [sectionId]: newList };
    });
  };

  const handleClear = () => {
    setLocalFilters({});
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-[100] animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="fixed bottom-0 left-0 w-full h-[85vh] bg-white rounded-t-3xl z-[101] flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-border-light bg-white rounded-t-3xl sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Filter</h2>
            <p className="text-sm text-text-secondary">{totalProducts} products</p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2">
            <X size={24} className="text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-2 pb-24">
          {FILTER_SECTIONS.map((section, idx) => (
            <div key={section.id} className={`py-4 ${idx !== FILTER_SECTIONS.length - 1 ? 'border-b border-border-light/60' : ''}`}>
              <h3 className="text-[15px] font-bold text-text-primary mb-3">{section.title}</h3>
              <div className="flex flex-wrap gap-2">
                {section.options.map(option => {
                  const isSelected = localFilters[section.id]?.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => toggleFilter(section.id, option)}
                      className={`px-3 py-1.5 text-[13px] font-medium rounded-lg border transition-colors ${
                        isSelected 
                          ? 'border-[#F87B68] bg-[#FCEAE7] text-[#F87B68]' 
                          : 'border-border-light bg-[#FAF7F2] text-text-primary hover:border-border-main'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 w-full bg-white border-t border-border-light p-4 px-5 flex items-center gap-4 z-20 pb-6">
          <button 
            onClick={handleClear}
            className="flex-1 py-3 text-text-secondary font-bold text-sm bg-[#FAF7F2] rounded-xl border border-border-light"
          >
            Clear All
          </button>
          <button 
            onClick={() => onApply(localFilters)}
            className="flex-[2] bg-[#F87B68] text-white font-bold py-3 rounded-xl shadow-[0_4px_12px_rgba(234,88,12,0.3)] active:scale-95 transition-transform"
          >
            Apply
          </button>
        </div>
        
      </div>
    </>
  );
}
