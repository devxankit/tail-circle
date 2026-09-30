import React, { useState, useRef } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { Gift, Plus, MoreVertical, Image as ImageIcon, Pencil, Trash2 } from 'lucide-react';
import { BottomSheet, ActionSheet, PrimaryButton, EmptyState, fieldClass, textareaClass, labelClass } from '../../vendor/mobile';

/** The item form's fields, shared by Add and Edit (each keeps its own state and file input). */
function AddonFields({ data, setData, inputRef, onImage, withPlaceholders }) {
  return (
    <div className="space-y-4 pb-2">
      <div
        className="h-36 bg-bg-primary border-2 border-dashed border-accent-teal/50 rounded-2xl flex flex-col items-center justify-center text-text-secondary transition cursor-pointer relative overflow-hidden"
        onClick={() => inputRef.current?.click()}
      >
        {data.image ? (
          <img src={data.image} className="w-full h-full object-cover" alt="Preview" />
        ) : (
          <>
            <Plus size={24} className="mb-2" />
            <span className="text-xs font-bold text-text-secondary">Upload Item Image</span>
          </>
        )}
        <input type="file" accept="image/*" className="hidden" ref={inputRef} onChange={onImage} />
      </div>
      <div>
        <label className={labelClass}>Item Name</label>
        <input type="text" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder={withPlaceholders ? 'e.g., Memory Stone' : undefined} className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>Price (₹)</label>
        <input type="number" inputMode="decimal" value={data.price} onChange={e => setData({...data, price: e.target.value})} placeholder={withPlaceholders ? '1200' : undefined} className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea rows="2" value={data.description} onChange={e => setData({...data, description: e.target.value})} placeholder={withPlaceholders ? 'Brief description of the item...' : undefined} className={textareaClass}></textarea>
      </div>
    </div>
  );
}

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

  const dropdownAddon = addons.find((a) => a.id === activeDropdown);

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text-primary leading-tight">Memory Add-ons</h2>
          <p className="text-xs text-text-secondary mt-1">Manage optional remembrance items available to customers.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-11 px-4 rounded-full bg-primary-main text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25 shrink-0 cursor-pointer"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {addons.length === 0 && <EmptyState icon={Gift} text="No memory add-ons yet." />}

      <div className="grid grid-cols-2 gap-3">
        {addons.map(addon => (
          <div key={addon.id} className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden flex flex-col">
            <div className="aspect-square bg-bg-primary border-b border-border-light flex flex-col items-center justify-center text-text-disabled relative overflow-hidden">
              {addon.image ? (
                <img src={addon.image} className="w-full h-full object-cover" alt={addon.name} />
              ) : (
                <>
                  <ImageIcon size={28} className="mb-1.5" />
                  <span className="text-[10px] font-bold">No Image Uploaded</span>
                </>
              )}
              <button
                onClick={() => setActiveDropdown(activeDropdown === addon.id ? null : addon.id)}
                aria-label="Item actions"
                className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center text-text-secondary transition shadow-sm cursor-pointer"
              >
                <MoreVertical size={16} />
              </button>
            </div>
            <div className="p-3 flex-1 flex flex-col">
              <h3 className="text-sm font-black text-text-primary truncate">{addon.name}</h3>
              <p className="text-[11px] font-medium text-text-secondary line-clamp-2 mt-0.5 mb-2">{addon.description}</p>

              <div className="mt-auto flex items-center justify-between pt-2 border-t border-border-light">
                <p className="text-sm font-black text-success">{addon.price}</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={addon.status === 'Active'}
                  aria-label={addon.status === 'Active' ? 'Active — tap to deactivate' : 'Inactive — tap to activate'}
                  onClick={() => updateAddon(addon.id, { status: addon.status === 'Active' ? 'Inactive' : 'Active' })}
                  className="h-11 -mr-1 px-1 flex items-center cursor-pointer"
                >
                  <span className={`w-10 h-6 rounded-full relative transition-colors ${addon.status === 'Active' ? 'bg-accent-teal' : 'bg-text-disabled'}`}>
                    <span className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${addon.status === 'Active' ? 'right-1' : 'left-1'}`}></span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* The item dropdown, as an action sheet. */}
      <ActionSheet
        open={!!dropdownAddon}
        onClose={() => setActiveDropdown(null)}
        title={dropdownAddon?.name}
        actions={dropdownAddon ? [
          {
            key: 'edit',
            label: 'Edit Item',
            icon: Pencil,
            onClick: () => {
              setEditFormData({...dropdownAddon, price: dropdownAddon.price.replace('₹', '')});
              setShowEditModal(true);
              setActiveDropdown(null);
            },
          },
          {
            key: 'delete',
            label: 'Delete Item',
            icon: Trash2,
            danger: true,
            onClick: () => {
              removeAddon(dropdownAddon.id);
              setActiveDropdown(null);
            },
          },
        ] : []}
      />

      <BottomSheet
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Memory Item"
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setShowAddModal(false)}>Cancel</PrimaryButton>
            <PrimaryButton
              tone="dark"
              onClick={() => {
                if (formData.name) {
                  addAddon({ ...formData, price: `₹${formData.price}` });
                  setShowAddModal(false);
                  setFormData({ name: '', price: '', description: '', image: null });
                }
              }}
            >
              Save Item
            </PrimaryButton>
          </div>
        )}
      >
        <AddonFields data={formData} setData={setFormData} inputRef={fileInputRef} onImage={handleImageUpload} withPlaceholders />
      </BottomSheet>

      {/* Edit sheet */}
      <BottomSheet
        open={showEditModal && !!editFormData}
        onClose={() => setShowEditModal(false)}
        title="Edit Memory Item"
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setShowEditModal(false)}>Cancel</PrimaryButton>
            <PrimaryButton
              tone="dark"
              onClick={() => {
                if (editFormData.name) {
                  updateAddon(editFormData.id, { ...editFormData, price: `₹${editFormData.price}` });
                  setShowEditModal(false);
                }
              }}
            >
              Save Changes
            </PrimaryButton>
          </div>
        )}
      >
        {editFormData && (
          <AddonFields data={editFormData} setData={setEditFormData} inputRef={editFileInputRef} onImage={handleEditImageUpload} />
        )}
      </BottomSheet>
    </div>
  );
}
