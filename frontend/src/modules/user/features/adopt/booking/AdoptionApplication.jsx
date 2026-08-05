import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Edit2 } from 'lucide-react';
import { useAdoptStore } from '../../../../../store/useAdoptStore';

export function AdoptionApplication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setApplicationData = useAdoptStore(state => state.setApplicationData);
  
  const [formData, setFormData] = useState({
    fullName: 'Rohit Sharma',
    phone: '9876543210',
    email: 'rohit.sharma@email.com',
    address: '12, 4th Cross, Koramangala, Bangalore',
    hasExperience: true,
    hasCurrentPets: false,
    reason: 'I want a loving companion and want to give a homeless pet a better life.'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContinue = async () => {
    setApplicationData(formData);
    try {
      const { applyForAdoption } = await import('../../../../../services/adoptApi');
      await applyForAdoption(id, formData);
      navigate(`/app/adopt/home-check/${id}`);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-10">
      {/* Header */}
      <div className="flex items-center px-5 pt-12 pb-4 bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-900">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-black text-gray-900 ml-2">Adoption Application</h1>
      </div>

      <div className="px-5 pt-6">
        <h2 className="text-[16px] font-black text-gray-900 mb-4">Personal Information</h2>
        
        {/* Form Fields */}
        <div className="space-y-4 mb-8">
          <div className="bg-white p-4 rounded-[16px] border border-gray-100 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] text-gray-500 font-medium mb-1">Full Name</p>
              <input 
                type="text" 
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full text-[14px] font-bold text-gray-900 outline-none"
              />
            </div>
            <Edit2 size={16} className="text-gray-400" />
          </div>

          <div className="bg-white p-4 rounded-[16px] border border-gray-100 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] text-gray-500 font-medium mb-1">Phone Number</p>
              <input 
                type="text" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full text-[14px] font-bold text-gray-900 outline-none"
              />
            </div>
            <Edit2 size={16} className="text-gray-400" />
          </div>

          <div className="bg-white p-4 rounded-[16px] border border-gray-100 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] text-gray-500 font-medium mb-1">Email</p>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full text-[14px] font-bold text-gray-900 outline-none"
              />
            </div>
            <Edit2 size={16} className="text-gray-400" />
          </div>

          <div className="bg-white p-4 rounded-[16px] border border-gray-100 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] text-gray-500 font-medium mb-1">Address</p>
              <input 
                type="text" 
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full text-[14px] font-bold text-gray-900 outline-none"
              />
            </div>
            <Edit2 size={16} className="text-gray-400" />
          </div>
        </div>

        <h2 className="text-[16px] font-black text-gray-900 mb-4">Experience with Pets</h2>
        
        {/* Experience Questions */}
        <div className="space-y-6 mb-8">
          <div>
            <p className="text-[13px] font-bold text-gray-900 mb-3">Do you have experience with pets?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setFormData(prev => ({ ...prev, hasExperience: true }))}
                className={`flex-1 py-3 rounded-[12px] text-[14px] font-bold transition-colors ${formData.hasExperience ? 'bg-[#66B4B1] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
              >
                Yes
              </button>
              <button 
                onClick={() => setFormData(prev => ({ ...prev, hasExperience: false }))}
                className={`flex-1 py-3 rounded-[12px] text-[14px] font-bold transition-colors ${!formData.hasExperience ? 'bg-[#66B4B1] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
              >
                No
              </button>
            </div>
          </div>

          <div>
            <p className="text-[13px] font-bold text-gray-900 mb-3">Do you have any pets currently?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setFormData(prev => ({ ...prev, hasCurrentPets: true }))}
                className={`flex-1 py-3 rounded-[12px] text-[14px] font-bold transition-colors ${formData.hasCurrentPets ? 'bg-[#66B4B1] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
              >
                Yes
              </button>
              <button 
                onClick={() => setFormData(prev => ({ ...prev, hasCurrentPets: false }))}
                className={`flex-1 py-3 rounded-[12px] text-[14px] font-bold transition-colors ${!formData.hasCurrentPets ? 'bg-[#66B4B1] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
              >
                No
              </button>
            </div>
          </div>

          <div>
            <p className="text-[13px] font-bold text-gray-900 mb-3">Why do you want to adopt?</p>
            <textarea 
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="4"
              className="w-full bg-white border border-gray-200 rounded-[16px] p-4 text-[14px] font-medium outline-none focus:border-[#66B4B1] transition-colors resize-none"
            ></textarea>
          </div>
        </div>

        <button 
          onClick={handleContinue}
          className="w-full bg-[#66B4B1] text-white py-4 rounded-[16px] text-[16px] font-bold shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-transform"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
