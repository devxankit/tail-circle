import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageCircle, FileText, CalendarClock, Share2, ChevronRight } from 'lucide-react';
import { getMyAdoptions } from '../../../../../services/adoptApi';

export function MyAdoptions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Ongoing');
  const [adoptions, setAdoptions] = useState([]);

  useEffect(() => {
    getMyAdoptions().then(setAdoptions).catch(() => setAdoptions([]));
  }, []);

  const filteredAdoptions = activeTab === 'All' ? adoptions : adoptions.filter(a => a.status === activeTab);

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-10">
      {/* Header */}
      <div className="flex items-center px-5 pt-12 pb-4 bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate('/app/profile')} className="p-2 -ml-2 text-gray-900">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-black text-gray-900 ml-2">My Adoptions</h1>
      </div>

      <div className="px-5 pt-6 flex-1">
        {/* Tabs */}
        <div className="flex bg-white rounded-full p-1 mb-6 shadow-sm border border-gray-100">
          {['All', 'Ongoing', 'Completed'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-full text-[13px] font-bold transition-all ${activeTab === tab ? 'bg-[#66B4B1] text-white shadow-sm' : 'text-gray-500'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-4">
          {filteredAdoptions.map(adoption => (
            <div key={adoption.id} className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
              <div className="flex gap-4 mb-5 border-b border-gray-100 pb-5">
                <img src={adoption.image} className="w-20 h-20 rounded-[16px] object-cover" />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-[16px] font-black text-gray-900">{adoption.petName}</h3>
                    <div className={`px-2 py-1 rounded-[8px] text-[10px] font-bold ${adoption.status === 'Ongoing' ? 'bg-[#FAF7F2] text-[#66B4B1]' : 'bg-gray-100 text-gray-600'}`}>
                      {adoption.status}
                    </div>
                  </div>
                  <p className="text-[12px] text-gray-500 font-medium mb-2">{adoption.age} • {adoption.gender} • {adoption.breed}</p>
                  <p className="text-[11px] text-gray-400 font-medium">Adopted on {adoption.date}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between py-2 active:scale-95 transition-transform">
                  <div className="flex items-center gap-3">
                    <MessageCircle size={18} className="text-gray-400" />
                    <span className="text-[14px] font-bold text-gray-700">Chat with Shelter</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between py-2 active:scale-95 transition-transform">
                  <div className="flex items-center gap-3">
                    <CalendarClock size={18} className="text-gray-400" />
                    <span className="text-[14px] font-bold text-gray-700">Request Follow-up</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between py-2 active:scale-95 transition-transform">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-gray-400" />
                    <span className="text-[14px] font-bold text-gray-700">View Documents</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              </div>

              <button className="w-full mt-5 bg-[#FAF7F2] text-[#66B4B1] border border-gray-200 py-3 rounded-[12px] text-[13px] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Share2 size={16} /> Share Update
              </button>
            </div>
          ))}

          {filteredAdoptions.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500 font-medium">No {activeTab.toLowerCase()} adoptions found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
