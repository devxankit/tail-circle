import React, { useState, useEffect } from 'react';
import { Plus, Edit, Eye, Package, Store, Box, ShoppingBag, Scissors, Activity, HeartPulse, Home, BookOpen, X, Image as ImageIcon, Check } from 'lucide-react';
import { fetchAdminConfig, createAdminConfig, updateAdminConfig } from '../../../../../services/admin';

const ICONS = { Box, ShoppingBag, Package, Scissors, Activity, HeartPulse, Home, BookOpen };
const renderIcon = (name, props) => {
  const Ico = ICONS[name] || Box;
  return <Ico {...props} />;
};

export function ProductCategories() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: '', subcategories: '' });
  const [selectedIcon, setSelectedIcon] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [categories, setCategories] = useState([]);

  const load = () => fetchAdminConfig('product_category').then(setCategories).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggleCategoryStatus = async (id) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    const newStatus = cat.status === 'Active' ? 'Inactive' : 'Active';
    setCategories(categories.map(c => c.id === id ? { ...c, status: newStatus } : c));
    showToast(`${cat.name} is now ${newStatus}`);
    try { await updateAdminConfig(id, { status: newStatus }); } catch { load(); }
  };

  const handleIconChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedIcon(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSaveCategory = async () => {
    if (!newCategory.name) {
      alert("Please enter a category name");
      return;
    }
    try {
      await createAdminConfig('product_category', {
        name: newCategory.name,
        products: 0,
        vendors: 0,
        subcategories: newCategory.subcategories ? newCategory.subcategories.split(',').map(s => s.trim()).filter(Boolean) : [],
        status: 'Active',
        iconName: 'Box',
        iconColor: 'text-[#599D9A]',
        iconBg: 'bg-[#FAF7F2]',
      });
      await load();
      setIsModalOpen(false);
      showToast('Category saved successfully');
      setNewCategory({ name: '', subcategories: '' });
      setSelectedIcon(null);
    } catch {
      showToast('Save failed', 'error');
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-[1400px] mx-auto bg-[#FAF7F2] min-h-screen pb-20 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={14}/></div>
             <p className="text-[13px] font-bold text-gray-800">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Product Categories</h1>
          <p className="text-[13px] text-gray-500 mt-1">{categories.filter(c => c.status === 'Active').length} active categories</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#66B4B1] hover:bg-[#66B4B1] text-white text-[13px] font-semibold rounded-lg transition shadow-sm">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Total Categories</h3>
          <p className="text-2xl font-semibold text-gray-900">{categories.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Total Products</h3>
          <p className="text-2xl font-semibold text-gray-900">{categories.reduce((s, c) => s + (c.products || 0), 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Active Vendors</h3>
          <p className="text-2xl font-semibold text-gray-900">48</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#FAF7F2] shadow-sm">
          <h3 className="text-[13px] text-gray-500 mb-1">Avg Products/Category</h3>
          <p className="text-2xl font-semibold text-gray-900">230</p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {categories.map(cat => (
          <div key={cat.id} className={`bg-white rounded-xl border border-[#FAF7F2] p-6 shadow-sm transition-opacity ${cat.status === 'Inactive' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
             <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cat.iconBg}`}>
                  {renderIcon(cat.iconName, { size: 24, className: cat.iconColor })}
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-gray-900">{cat.name}</h3>
                </div>
             </div>

             <div className="space-y-2 mb-5 border-b border-gray-100 pb-5">
               <div className="flex items-center gap-2 text-gray-600">
                 <Package size={14} className="text-gray-400" />
                 <span className="text-[13px] font-medium">{cat.products} products listed</span>
               </div>
               <div className="flex items-center gap-2 text-gray-600">
                 <Store size={14} className="text-gray-400" />
                 <span className="text-[13px] font-medium">{cat.vendors} active vendors</span>
               </div>
             </div>

             <div className="mb-5">
               <p className="text-[12px] font-medium text-gray-500 mb-2">Subcategories:</p>
               <div className="flex flex-wrap gap-1.5">
                  {cat.subcategories.slice(0, 5).map((sub, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-[#FAF7F2] text-[#66B4B1] rounded text-[11px] font-medium">
                      {sub}
                    </span>
                  ))}
                  {cat.subcategories.length > 5 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-medium">
                      +{cat.subcategories.length - 5}
                    </span>
                  )}
               </div>
             </div>

             <div className="flex items-center justify-between border-t border-gray-100 pt-5">
                <div className="flex items-center gap-2">
                   <p className="text-[12px] font-medium text-gray-500">Status:</p>
                   <div className="flex items-center gap-1.5">
                     <span className={`w-2 h-2 rounded-full ${cat.status === 'Active' ? 'bg-[#66B4B1]' : 'bg-gray-400'}`}></span>
                     <span className="text-[13px] font-semibold text-gray-900">{cat.status}</span>
                   </div>
                   <div onClick={() => toggleCategoryStatus(cat.id)} className={`w-8 h-4 rounded-full relative cursor-pointer ml-2 transition-colors ${cat.status === 'Active' ? 'bg-[#66B4B1]' : 'bg-gray-300'}`}>
                     <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${cat.status === 'Active' ? 'right-0.5' : 'left-0.5'}`}></div>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => alert("Action triggered: Edit Category")} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded transition" title="Edit Category">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => alert("Action triggered: View Products")} className="px-3 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded text-[12px] font-semibold transition">
                    View Products
                  </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-all duration-300 pb-safe sm:pb-0">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-[500px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] sm:max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Add New Category</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Category Name</label>
                <input type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] outline-none" placeholder="e.g. Aquarium Supplies" />
              </div>
              
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Icon Upload</label>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <label className="w-12 h-12 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition overflow-hidden">
                    <input type="file" accept="image/*" onChange={handleIconChange} className="hidden" />
                    {selectedIcon ? <img src={selectedIcon} className="w-full h-full object-cover" alt="icon" /> : <ImageIcon size={20} className="text-gray-400" />}
                  </label>
                  <span className="text-[12px] text-gray-500">Click to upload SVG or PNG icon</span>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] outline-none" placeholder="Category description..."></textarea>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Subcategories (comma separated)</label>
                <input type="text" value={newCategory.subcategories} onChange={e => setNewCategory({...newCategory, subcategories: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:border-[#66B4B1] focus:ring-1 focus:ring-[#66B4B1] outline-none" placeholder="e.g. Filters, Tanks, Decor" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">SEO Slug</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] bg-gray-50 outline-none" placeholder="auto-generated" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Display Order</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:border-[#66B4B1] outline-none" placeholder="1" />
                </div>
              </div>

              <div className="flex items-center justify-between border border-gray-200 p-3 rounded-lg bg-gray-50/50">
                <div>
                  <p className="text-[13px] font-medium text-gray-900">Category Status</p>
                  <p className="text-[11px] text-gray-500">Make it visible to customers</p>
                </div>
                <div className="w-10 h-6 bg-[#66B4B1] rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                </div>
              </div>

            </div>
            
            <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50 shrink-0 pb-10 sm:pb-5">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-[13px] font-medium hover:bg-white transition">
                Cancel
              </button>
              <button onClick={handleSaveCategory} className="px-6 py-2 bg-[#66B4B1] text-white rounded-lg text-[13px] font-medium hover:bg-[#66B4B1] transition shadow-sm">
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
