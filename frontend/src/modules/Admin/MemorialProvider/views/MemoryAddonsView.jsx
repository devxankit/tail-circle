import React, { useState, useRef } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { Gift, Plus, MoreVertical, Image as ImageIcon, X } from 'lucide-react';

export function MemoryAddonsView() {
  const { addons, addAddon, updateAddon, removeAddon } = useMemorialProvider();
  const [showAddModal, setShowAddModal] = useState(false);
  const fileInputRef = useRef(null);
  
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const editFileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    image: null
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditFormData({ ...editFormData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Memory Add-ons</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Manage optional remembrance items available to customers.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg cursor-pointer"
        >
          <Plus size={18} /> Add New Item
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {addons.map(addon => (
          <div key={addon.id} className={`bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition relative ${activeDropdown === addon.id ? 'z-50' : 'z-10'}`}>
            <div className="h-40 bg-slate-50 border-b border-slate-100 flex flex-col items-center justify-center text-slate-300 relative group overflow-hidden rounded-t-3xl">
              {addon.image ? (
                <img src={addon.image} className="w-full h-full object-cover" alt={addon.name} />
              ) : (
                <>
                  <ImageIcon size={32} className="mb-2 group-hover:text-slate-400 transition" />
                  <span className="text-[10px] font-bold">No Image Uploaded</span>
                </>
              )}
              <button 
                onClick={() => setActiveDropdown(activeDropdown === addon.id ? null : addon.id)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition shadow-sm border border-slate-200 cursor-pointer"
              >
                <MoreVertical size={16} />
              </button>
            </div>
            
            {activeDropdown === addon.id && (
              <div className="absolute right-4 top-14 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                <button 
                  onClick={() => {
                    setEditFormData({...addon, price: addon.price.replace('₹', '')});
                    setShowEditModal(true);
                    setActiveDropdown(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Edit Item
                </button>
                <div className="my-1 border-t border-slate-100"></div>
                <button 
                  onClick={() => {
                    removeAddon(addon.id);
                    setActiveDropdown(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  Delete Item
                </button>
              </div>
            )}
            <div className="p-5">
              <h3 className="text-base font-black text-slate-900 mb-1 truncate">{addon.name}</h3>
              <p className="text-xs font-medium text-slate-500 line-clamp-2 mb-4 h-8">{addon.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <p className="text-lg font-black text-emerald-600">{addon.price}</p>
                <div className="flex items-center gap-2">
                  <div 
                    onClick={() => updateAddon(addon.id, { status: addon.status === 'Active' ? 'Inactive' : 'Active' })}
                    className={`w-10 h-6 rounded-full relative cursor-pointer shadow-inner transition-colors ${addon.status === 'Active' ? 'bg-slate-900' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${addon.status === 'Active' ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">Add Memory Item</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shadow-sm border border-slate-200 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div 
                className="h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 transition cursor-pointer relative overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.image ? (
                  <img src={formData.image} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <>
                    <Plus size={24} className="mb-2" />
                    <span className="text-xs font-bold text-slate-500">Upload Item Image</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Item Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Memory Stone" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Price (₹)</label>
                <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="1200" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Brief description of the item..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer">
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (formData.name) {
                    addAddon({ ...formData, price: `₹${formData.price}` });
                    setShowAddModal(false);
                    setFormData({ name: '', price: '', description: '', image: null });
                  }
                }} 
                className="flex-1 py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">Edit Memory Item</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shadow-sm border border-slate-200 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div 
                className="h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 transition cursor-pointer relative overflow-hidden"
                onClick={() => editFileInputRef.current?.click()}
              >
                {editFormData.image ? (
                  <img src={editFormData.image} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <>
                    <Plus size={24} className="mb-2" />
                    <span className="text-xs font-bold text-slate-500">Upload Item Image</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" ref={editFileInputRef} onChange={handleEditImageUpload} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Item Name</label>
                <input type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Price (₹)</label>
                <input type="number" value={editFormData.price} onChange={e => setEditFormData({...editFormData, price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                <textarea rows="2" value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer">
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (editFormData.name) {
                    updateAddon(editFormData.id, { ...editFormData, price: `₹${editFormData.price}` });
                    setShowEditModal(false);
                  }
                }} 
                className="flex-1 py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
