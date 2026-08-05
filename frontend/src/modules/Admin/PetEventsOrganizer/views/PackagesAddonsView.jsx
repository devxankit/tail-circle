import React, { useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import {
  Package, Plus, Edit2, Trash2, CheckCircle, X, Loader2
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

export function PackagesAddonsView() {
  const { packages, addOns, addPackage, editPackage, removePackage, addAddon, editAddon, removeAddon } = usePetEvents();
  const [activeTab, setActiveTab] = useState('packages');
  const [modalItem, setModalItem] = useState(null); // { isNew, id?, name, price, duration, maxPets, status }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openCreate = () => setModalItem(
    activeTab === 'packages'
      ? { isNew: true, name: '', price: '', duration: '', maxPets: 1, status: 'Active' }
      : { isNew: true, name: '', price: '', status: 'Active' }
  );
  const openEdit = (item) => setModalItem({ isNew: false, ...item });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (activeTab === 'packages') {
        const body = { name: modalItem.name, price: Number(modalItem.price) || 0, duration: modalItem.duration, maxPets: Number(modalItem.maxPets) || 1, status: modalItem.status };
        if (modalItem.isNew) await addPackage(body);
        else await editPackage(modalItem.id, body);
      } else {
        const body = { name: modalItem.name, price: Number(modalItem.price) || 0, status: modalItem.status };
        if (modalItem.isNew) await addAddon(body);
        else await editAddon(modalItem.id, body);
      }
      setModalItem(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePackage = async (id) => {
    if (!window.confirm('Delete this package?')) return;
    try { await removePackage(id); } catch (err) { alert(err?.response?.data?.message || 'Could not delete'); }
  };
  const handleDeleteAddon = async (id) => {
    if (!window.confirm('Delete this add-on?')) return;
    try { await removeAddon(id); } catch (err) { alert(err?.response?.data?.message || 'Could not delete'); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Packages & Add-ons</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Manage predefined service bundles and up-sells.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#F87B68] hover:bg-[#F87B68] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-orange-900/20 cursor-pointer">
          <Plus size={18} /> Create New {activeTab === 'packages' ? 'Package' : 'Add-on'}
        </button>
      </div>

      <div className="flex bg-slate-50 p-1.5 rounded-2xl w-full max-w-md border border-slate-200">
        <button
          onClick={() => setActiveTab('packages')}
          className={cn(
            "flex-1 py-2.5 text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-300",
            activeTab === 'packages' ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Service Packages
        </button>
        <button
          onClick={() => setActiveTab('addons')}
          className={cn(
            "flex-1 py-2.5 text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-300",
            activeTab === 'addons' ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Extra Add-ons
        </button>
      </div>

      {activeTab === 'packages' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map(pkg => (
            <div key={pkg.id} className={cn(
              "bg-white rounded-3xl border shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition",
              pkg.status === 'Inactive' ? "border-slate-200 bg-slate-50 opacity-75" : "border-slate-100"
            )}>
              {pkg.status === 'Active' && <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full flex items-start justify-end p-3"><CheckCircle size={16} className="text-orange-500"/></div>}

              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-[#F87B68] mb-6">
                <Package size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{pkg.name}</h3>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-2xl font-black text-[#F87B68]">₹{pkg.price.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">/ event</span>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div> Duration: {pkg.duration}
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div> Up to {pkg.maxPets} Pets
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => openEdit(pkg)} className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2">
                  <Edit2 size={14}/> Edit
                </button>
                <button onClick={() => handleDeletePackage(pkg.id)} className="py-2.5 px-4 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-xl transition cursor-pointer">
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
          ))}
          {!packages.length && <p className="text-sm text-slate-400 col-span-full text-center py-10">No packages yet.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="p-4">Add-on Name</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {addOns.map(addon => (
                <tr key={addon.id} className="hover:bg-slate-50 transition">
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-900">{addon.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">ID: {addon.id}</p>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-sm font-black text-[#F87B68]">₹{addon.price.toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border",
                      addon.status === 'Active' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"
                    )}>
                      {addon.status}
                    </span>
                  </td>
                  <td className="p-4 flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(addon)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition cursor-pointer"><Edit2 size={16}/></button>
                    <button onClick={() => handleDeleteAddon(addon.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
              {!addOns.length && (
                <tr><td colSpan="4" className="p-10 text-center text-sm text-slate-400">No add-ons yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">{modalItem.isNew ? 'Create' : 'Edit'} {activeTab === 'packages' ? 'Package' : 'Add-on'}</h3>
              <button onClick={() => setModalItem(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shadow-sm border border-slate-200 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Name</label>
                <input type="text" value={modalItem.name} onChange={e => setModalItem({ ...modalItem, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Price (₹)</label>
                <input type="number" value={modalItem.price} onChange={e => setModalItem({ ...modalItem, price: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              {activeTab === 'packages' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Duration</label>
                    <input type="text" placeholder="e.g. 3 hours" value={modalItem.duration || ''} onChange={e => setModalItem({ ...modalItem, duration: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Max Pets</label>
                    <input type="number" min="1" value={modalItem.maxPets || 1} onChange={e => setModalItem({ ...modalItem, maxPets: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                <select value={modalItem.status} onChange={e => setModalItem({ ...modalItem, status: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button onClick={() => setModalItem(null)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !modalItem.name}
                className="flex-1 py-3 bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
