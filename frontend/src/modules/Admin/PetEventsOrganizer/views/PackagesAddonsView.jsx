import React, { useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import {
  Package, Plus, Edit2, Trash2, CheckCircle
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import {
  SegmentedTabs, BottomSheet, PrimaryButton, StatusBadge, CardAction, EmptyState, InlineError, ListCard,
  fieldClass, labelClass, FieldPair, useConfirm, useVendorToast,
} from '../../vendor/mobile';

export function PackagesAddonsView() {
  const { packages, addOns, addPackage, editPackage, removePackage, addAddon, editAddon, removeAddon } = usePetEvents();
  const [activeTab, setActiveTab] = useState('packages');
  const [modalItem, setModalItem] = useState(null); // { isNew, id?, name, price, duration, maxPets, status }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const confirm = useConfirm();
  const { addToast } = useVendorToast();

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
      setError(err?.response?.data?.message || err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePackage = async (id) => {
    if (!(await confirm({ title: 'Delete this package?', confirmLabel: 'Delete', danger: true }))) return;
    try { await removePackage(id); } catch (err) { addToast({ message: err?.response?.data?.message || err?.message || 'Could not delete', type: 'error' }); }
  };
  const handleDeleteAddon = async (id) => {
    if (!(await confirm({ title: 'Delete this add-on?', confirmLabel: 'Delete', danger: true }))) return;
    try { await removeAddon(id); } catch (err) { addToast({ message: err?.response?.data?.message || err?.message || 'Could not delete', type: 'error' }); }
  };

  return (
    <div className="space-y-4">

      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Packages & Add-ons</h2>
        <p className="text-xs text-text-secondary mt-1">Manage predefined service bundles and up-sells.</p>
      </div>

      <SegmentedTabs
        items={[{ key: 'packages', label: 'Service Packages' }, { key: 'addons', label: 'Extra Add-ons' }]}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      <button onClick={openCreate} className="w-full h-12 flex items-center justify-center gap-2 bg-primary-main text-white rounded-2xl text-sm font-bold transition shadow-md shadow-primary-main/25 cursor-pointer">
        <Plus size={18} /> Create New {activeTab === 'packages' ? 'Package' : 'Add-on'}
      </button>

      {activeTab === 'packages' ? (
        <div className="space-y-3">
          {packages.map(pkg => (
            <div key={pkg.id} className={cn(
              "bg-white rounded-[20px] border shadow-sm p-4 relative overflow-hidden",
              pkg.status === 'Inactive' ? "border-border-light opacity-75" : "border-border-light"
            )}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-light/30 flex items-center justify-center text-primary-main shrink-0">
                  <Package size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[15px] font-black text-text-primary">{pkg.name}</h3>
                    <StatusBadge
                      tone={pkg.status === 'Active' ? 'success' : 'neutral'}
                      label={<span className="inline-flex items-center gap-1">{pkg.status === 'Active' && <CheckCircle size={10} />}{pkg.status}</span>}
                    />
                  </div>
                  <div className="flex items-end gap-1 mt-1">
                    <span className="text-xl font-black text-primary-main">₹{pkg.price.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">/ event</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-semibold text-text-secondary">
                    <span>Duration: {pkg.duration}</span>
                    <span>Up to {pkg.maxPets} Pets</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <CardAction icon={Edit2} className="flex-1" onClick={() => openEdit(pkg)}>Edit</CardAction>
                <CardAction icon={Trash2} tone="danger" onClick={() => handleDeletePackage(pkg.id)}>Delete</CardAction>
              </div>
            </div>
          ))}
          {!packages.length && <EmptyState icon={Package} text="No packages yet." />}
        </div>
      ) : (
        <div className="space-y-3">
          {addOns.map(addon => (
            <ListCard
              key={addon.id}
              title={addon.name}
              subtitle={`ID: ${addon.id}`}
              badge={<StatusBadge label={addon.status} tone={addon.status === 'Active' ? 'success' : 'neutral'} />}
              amount={<span className="text-primary-main">₹{addon.price.toLocaleString()}</span>}
              footer={(
                <>
                  <CardAction icon={Edit2} className="flex-1" onClick={() => openEdit(addon)}>Edit</CardAction>
                  <CardAction icon={Trash2} tone="danger" onClick={() => handleDeleteAddon(addon.id)}>Delete</CardAction>
                </>
              )}
            />
          ))}
          {!addOns.length && <EmptyState text="No add-ons yet." />}
        </div>
      )}

      {/* Create/Edit sheet */}
      <BottomSheet
        open={!!modalItem}
        onClose={() => setModalItem(null)}
        title={modalItem ? `${modalItem.isNew ? 'Create' : 'Edit'} ${activeTab === 'packages' ? 'Package' : 'Add-on'}` : ''}
        footer={modalItem && (
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setModalItem(null)}>Cancel</PrimaryButton>
            <PrimaryButton tone="dark" onClick={handleSave} disabled={saving || !modalItem.name} loading={saving}>Save</PrimaryButton>
          </div>
        )}
      >
        {modalItem && (
          <div className="space-y-4 pb-2">
            <InlineError>{error}</InlineError>
            <div>
              <label className={labelClass}>Name</label>
              <input type="text" value={modalItem.name} onChange={e => setModalItem({ ...modalItem, name: e.target.value })} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Price (₹)</label>
              <input type="number" inputMode="decimal" value={modalItem.price} onChange={e => setModalItem({ ...modalItem, price: e.target.value })} className={fieldClass} />
            </div>
            {activeTab === 'packages' && (
              <FieldPair>
                <div>
                  <label className={labelClass}>Duration</label>
                  <input type="text" placeholder="e.g. 3 hours" value={modalItem.duration || ''} onChange={e => setModalItem({ ...modalItem, duration: e.target.value })} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Max Pets</label>
                  <input type="number" min="1" inputMode="numeric" value={modalItem.maxPets || 1} onChange={e => setModalItem({ ...modalItem, maxPets: e.target.value })} className={fieldClass} />
                </div>
              </FieldPair>
            )}
            <div>
              <label className={labelClass}>Status</label>
              <select value={modalItem.status} onChange={e => setModalItem({ ...modalItem, status: e.target.value })} className={cn(fieldClass, 'cursor-pointer')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
