import React, { useState } from 'react';
import { useMemorialProvider } from '../context/MemorialProviderContext';
import { Leaf, Plus, MoreVertical, Check, X, Clock, MapPin, Users, Pencil, Power, Trash2 } from 'lucide-react';
import { BottomSheet, ActionSheet, PrimaryButton, StatusBadge, EmptyState, FieldPair, fieldClass, textareaClass, labelClass } from '../../vendor/mobile';

/** The service form's fields, shared by Add and Edit (each keeps its own state). */
function ServiceFields({ data, setData, withPlaceholders }) {
  return (
    <div className="space-y-4 pb-4">
      <div>
        <label className={labelClass}>Service Name</label>
        <input type="text" value={data.name} onChange={(e) => setData({...data, name: e.target.value})} placeholder={withPlaceholders ? 'e.g., Premium Burial Service' : undefined} className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>Category</label>
        <select value={data.category} onChange={(e) => setData({...data, category: e.target.value})} className={fieldClass}>
          <option>Burial</option>
          <option>Grave Preparation</option>
          <option>Cremation Support</option>
          <option>Tree Plantation</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Base Price (₹)</label>
        <input type="text" inputMode="decimal" value={data.price} onChange={(e) => setData({...data, price: e.target.value})} placeholder={withPlaceholders ? '4500' : undefined} className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea value={data.description} onChange={(e) => setData({...data, description: e.target.value})} rows="3" placeholder={withPlaceholders ? 'Describe the service details respectfully...' : undefined} className={textareaClass}></textarea>
      </div>
      <FieldPair>
        <div>
          <label className={labelClass}>Duration</label>
          <input type="text" value={data.duration} onChange={(e) => setData({...data, duration: e.target.value})} placeholder={withPlaceholders ? 'e.g. 2 Hours' : undefined} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Distance Limit</label>
          <input type="text" value={data.distance} onChange={(e) => setData({...data, distance: e.target.value})} placeholder={withPlaceholders ? 'e.g. 15 km' : undefined} className={fieldClass} />
        </div>
      </FieldPair>
      <div>
        <label className={labelClass}>Staff Required</label>
        <input type="number" inputMode="numeric" value={data.staff} onChange={(e) => setData({...data, staff: Number(e.target.value)})} placeholder={withPlaceholders ? '2' : undefined} className={fieldClass} />
      </div>
    </div>
  );
}

export function MemorialServicesView() {
  const { services, addService, updateService, removeService } = useMemorialProvider();
  const [showAddService, setShowAddService] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showEditService, setShowEditService] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Burial',
    price: '',
    description: '',
    duration: '',
    distance: '',
    staff: 1
  });

  const dropdownService = services.find((s) => s.id === activeDropdown);

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text-primary leading-tight">Memorial Services</h2>
          <p className="text-xs text-text-secondary mt-1">Configure the core services you offer to grieving pet parents.</p>
        </div>
        <button
          onClick={() => setShowAddService(true)}
          className="h-11 px-4 rounded-full bg-primary-main text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25 shrink-0 cursor-pointer"
        >
          <Plus size={16} /> Add Service
        </button>
      </div>

      {services.length === 0 && <EmptyState icon={Leaf} text="No services yet." />}

      <div className="space-y-3">
        {services.map(service => (
          <div key={service.id} className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden">
            <div className="p-4 relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === service.id ? null : service.id)}
                aria-label="Service actions"
                className="absolute top-2 right-2 w-11 h-11 rounded-full flex items-center justify-center text-text-secondary active:bg-bg-secondary transition cursor-pointer"
              >
                <MoreVertical size={18} />
              </button>
              <span className="inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-bg-secondary text-text-secondary rounded-md mb-2">
                {service.category}
              </span>
              <h3 className="text-[15px] font-black text-text-primary mb-1.5 pr-10">{service.name}</h3>
              <p className="text-xs font-medium text-text-secondary leading-relaxed">{service.description}</p>
            </div>

            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xl font-black text-success">{service.price}</p>
                <StatusBadge
                  tone={service.status === 'Active' ? 'success' : 'neutral'}
                  label={<span className="inline-flex items-center gap-1">{service.status === 'Active' ? <Check size={11}/> : <X size={11}/>}{service.status}</span>}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-bg-primary p-2.5 rounded-xl border border-border-light text-center">
                  <Clock size={14} className="mx-auto text-text-secondary mb-1" />
                  <p className="text-[11px] font-bold text-text-primary">{service.duration}</p>
                </div>
                <div className="bg-bg-primary p-2.5 rounded-xl border border-border-light text-center">
                  <MapPin size={14} className="mx-auto text-text-secondary mb-1" />
                  <p className="text-[11px] font-bold text-text-primary">{service.distance}</p>
                </div>
                <div className="bg-bg-primary p-2.5 rounded-xl border border-border-light text-center">
                  <Users size={14} className="mx-auto text-text-secondary mb-1" />
                  <p className="text-[11px] font-bold text-text-primary">{service.staff} Staff</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* The service dropdown, as an action sheet — same three actions. */}
      <ActionSheet
        open={!!dropdownService}
        onClose={() => setActiveDropdown(null)}
        title={dropdownService?.name}
        actions={dropdownService ? [
          {
            key: 'edit',
            label: 'Edit Service',
            icon: Pencil,
            onClick: () => {
              setEditFormData({...dropdownService, price: dropdownService.price.replace('₹', '')}); // Strip formatting for edit
              setShowEditService(true);
              setActiveDropdown(null);
            },
          },
          {
            key: 'toggle',
            label: `Mark as ${dropdownService.status === 'Active' ? 'Inactive' : 'Active'}`,
            icon: Power,
            onClick: () => {
              updateService(dropdownService.id, { status: dropdownService.status === 'Active' ? 'Inactive' : 'Active' });
              setActiveDropdown(null);
            },
          },
          {
            key: 'delete',
            label: 'Delete Service',
            icon: Trash2,
            danger: true,
            onClick: () => {
              removeService(dropdownService.id);
              setActiveDropdown(null);
            },
          },
        ] : []}
      />

      <BottomSheet
        open={showAddService}
        onClose={() => setShowAddService(false)}
        fullScreen
        title="Add Memorial Service"
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setShowAddService(false)}>Cancel</PrimaryButton>
            <PrimaryButton
              tone="dark"
              onClick={() => {
                if (formData.name) {
                  addService({ ...formData, price: `₹${formData.price}` });
                  setShowAddService(false);
                  setFormData({ name: '', category: 'Burial', price: '', description: '', duration: '', distance: '', staff: 1 });
                }
              }}
            >
              Save Service
            </PrimaryButton>
          </div>
        )}
      >
        <ServiceFields data={formData} setData={setFormData} withPlaceholders />
      </BottomSheet>

      {/* Edit Service sheet */}
      <BottomSheet
        open={showEditService && !!editFormData}
        onClose={() => setShowEditService(false)}
        fullScreen
        title="Edit Memorial Service"
        footer={(
          <div className="flex gap-2">
            <PrimaryButton tone="soft" onClick={() => setShowEditService(false)}>Cancel</PrimaryButton>
            <PrimaryButton
              tone="dark"
              onClick={() => {
                if (editFormData.name) {
                  updateService(editFormData.id, { ...editFormData, price: `₹${editFormData.price}` });
                  setShowEditService(false);
                }
              }}
            >
              Save Changes
            </PrimaryButton>
          </div>
        )}
      >
        {editFormData && <ServiceFields data={editFormData} setData={setEditFormData} />}
      </BottomSheet>
    </div>
  );
}
