import React, { useState, useEffect } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UpdateAllergies() {
  const navigate = useNavigate();
  const [allergies, setAllergies] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    import('../../../../../services/meals').then(({ fetchMealAccount }) =>
      fetchMealAccount().then((account) => setAllergies(account.allergies || []))
    ).catch(() => setAllergies([]));
  }, []);

  const handleAdd = () => {
    if (input.trim() && !allergies.includes(input.trim())) {
      setAllergies([...allergies, input.trim()]);
      setInput('');
    }
  };

  const handleRemove = (item) => {
    setAllergies(allergies.filter(a => a !== item));
  };

  const handleSave = async () => {
    try {
      const { updateMealAllergies } = await import('../../../../../services/meals');
      await updateMealAllergies(allergies);
      alert("Allergies saved successfully!");
      navigate('/app/meals');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] absolute inset-0 z-50 animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-gray-100 z-10 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary hover:bg-gray-150 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-black text-text-primary ml-2 flex-1 tracking-tight">Update Allergies</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="text-xs text-gray-500 font-bold mb-6 text-center">We will ensure none of these ingredients are included in your meals.</p>
        
        <div className="flex flex-wrap gap-2 mb-6 max-w-[400px] mx-auto justify-center">
          {allergies.map(item => (
            <div key={item} className="flex items-center gap-2 bg-white border border-gray-200 px-3.5 py-1.5 rounded-full shadow-sm text-xs font-black text-gray-700">
              {item}
              <button onClick={() => handleRemove(item)} className="text-gray-400 hover:text-error transition-colors">
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-8 max-w-[400px] mx-auto">
          <input 
            type="text" 
            placeholder="E.g. Beef, Soy..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-text-primary font-bold text-xs focus:outline-none focus:border-[#F87B68] focus:ring-1 focus:ring-[#F87B68] transition-colors shadow-sm"
          />
          <button 
            onClick={handleAdd} 
            className="bg-[#599D9A] text-white font-black px-6 rounded-2xl hover:bg-[#4C8684] transition-all shadow-sm text-xs active:scale-95"
          >
            Add
          </button>
        </div>

        <div className="max-w-[400px] mx-auto">
          <button 
            onClick={handleSave} 
            className="w-full bg-[#F87B68] hover:bg-[#F87B68] text-white font-black rounded-2xl py-4 shadow-sm transition-all uppercase tracking-wider text-xs active:scale-95"
          >
            Save Allergies
          </button>
        </div>
      </div>
    </div>
  );
}
