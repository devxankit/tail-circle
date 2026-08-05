import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePetEvents } from '../context/PetEventsContext';
import { uploadVendorFile } from '../../../../services/vendor';
import {
  ArrowLeft, ArrowRight, Check, Image as ImageIcon,
  MapPin, Calendar, Clock, Upload, IndianRupee, Eye, Users, MessageSquare, Loader2
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

const EMPTY_FORM = {
  title: '', category: 'Social Meetup', date: '', time: '',
  location: '', capacity: 20, price: 500, description: '', image: null
};

export function CreateEventView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { events, addEvent, updateEvent } = usePetEvents();
  const isEdit = Boolean(id);
  const [step, setStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef(null);

  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (isEdit) {
      const source = events.find((e) => e.id === id);
      if (source) {
        setFormData({
          title: source.title, category: source.category, date: source.date, time: source.time,
          location: source.location, capacity: source.capacity, price: source.price,
          description: source.description || '', image: source.image || null,
        });
      }
    }
  }, [isEdit, id, events]);

  const categories = ['Social Meetup', 'Training Camp', 'Pet Birthday', 'Workshop', 'Competition'];

  const handleNext = () => {
    if (step < 3) setStep(s => s + 1);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = null;
    if (!file) return;
    setUploadingImage(true);
    setError('');
    try {
      const url = await uploadVendorFile(file, 'event-cover');
      setFormData((f) => ({ ...f, image: url }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await updateEvent(id, { ...formData });
      } else {
        await addEvent({ ...formData, booked: 0, status: 'Published' });
      }
      navigate('/vendor/events-organizer/events');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save this event');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1: return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Title</label>
              <input
                type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. Golden Retriever Meetup"
                className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
              <select
                value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-slate-900"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
              <textarea
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="What will happen at this event?"
                rows={4}
                className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-slate-900 resize-none"
              />
            </div>
          </div>
        </div>
      );
      case 2: return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><Calendar size={14} className="inline mr-1 -mt-0.5"/> Date</label>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-slate-900"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><Clock size={14} className="inline mr-1 -mt-0.5"/> Time</label>
              <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-slate-900"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><MapPin size={14} className="inline mr-1 -mt-0.5"/> Location / Venue</label>
            <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. Cubbon Park Dog Park" className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-slate-900"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><Users size={14} className="inline mr-1 -mt-0.5"/> Max Capacity</label>
              <input type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-slate-900"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><IndianRupee size={14} className="inline mr-1 -mt-0.5"/> Ticket Price</label>
              <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value)})} className="w-full px-5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold text-slate-900"/>
            </div>
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Cover Image</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            {formData.image ? (
              <div className="relative border-2 border-slate-200 rounded-3xl overflow-hidden group h-64">
                <img src={formData.image} alt="Event Cover Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <button type="button" disabled={uploadingImage} onClick={() => fileInputRef.current?.click()} className="px-5 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-md hover:bg-slate-100 transition cursor-pointer">
                    {uploadingImage ? 'Uploading…' : 'Change Photo'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !uploadingImage && fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-orange-500/50 transition cursor-pointer h-64"
              >
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-[#F87B68] mb-4 shadow-sm">
                  {uploadingImage ? <Loader2 size={28} className="animate-spin" /> : <ImageIcon size={28} />}
                </div>
                <h4 className="text-sm font-black text-slate-900 mb-1">{uploadingImage ? 'Uploading...' : 'Upload Cover Photo'}</h4>
                <p className="text-xs font-medium text-slate-500 max-w-xs mb-6">High quality photos make your event 3x more likely to be booked. (16:9 ratio recommended)</p>
                <button type="button" className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-black transition flex items-center gap-2 pointer-events-none">
                  <Upload size={14}/> Browse Files
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <button onClick={() => navigate('/vendor/events-organizer/events')} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{isEdit ? 'Edit Event' : 'Create New Event'}</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Step {step} of 3: {step === 1 ? 'Basic Details' : step === 2 ? 'Logistics & Pricing' : 'Media & Cover'}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-2xl p-4">{error}</div>}

      {/* Progress */}
      <div className="flex gap-2">
        {[1,2,3].map(i => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", i <= step ? "bg-[#F87B68]" : "bg-slate-200")} />
        ))}
      </div>

      {/* Form Container */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[400px]">
        {renderStep()}
      </div>

      {/* Footer Controls */}
      <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/vendor/events-organizer/events')}
          className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition cursor-pointer"
        >
          {step > 1 ? 'Back' : 'Cancel'}
        </button>

        <div className="flex gap-3">
          {step === 3 && (
            <button
              onClick={() => setShowPreview(true)}
              className="px-6 py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Eye size={18}/> Preview Event
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-[#F87B68] hover:bg-[#F87B68] text-white text-sm font-bold rounded-xl transition shadow-lg shadow-orange-900/20 flex items-center gap-2 cursor-pointer"
            >
              Next Step <ArrowRight size={18}/>
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="px-6 py-3 bg-[#F87B68] hover:bg-[#F87B68] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-orange-900/20 flex items-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18}/>} {isEdit ? 'Save Changes' : 'Publish Event'}
            </button>
          )}
        </div>
      </div>

      {/* Preview Modal (User App Simulator) */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPreview(false)}></div>
          <div className="relative bg-white w-full max-w-[400px] h-[800px] max-h-[90vh] rounded-[3rem] border-8 border-slate-900 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10">
            {/* Phone notch */}
            <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50">
              <div className="w-32 h-full bg-slate-900 rounded-b-3xl"></div>
            </div>

            {/* User App UI */}
            <div className="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
              <div className="h-64 bg-slate-200 relative overflow-hidden">
                {formData.image ? (
                  <img src={formData.image} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <ImageIcon size={40} className="opacity-50" />
                  </div>
                )}
                <button onClick={() => setShowPreview(false)} className="absolute top-10 left-4 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow cursor-pointer">
                  <ArrowLeft size={20} />
                </button>
              </div>
              <div className="p-5 -mt-6 relative bg-gray-50 rounded-t-3xl">
                <span className="px-3 py-1 bg-[#F87B68] text-white text-[10px] font-black uppercase rounded-lg shadow-sm">
                  {formData.category}
                </span>
                <h1 className="text-2xl font-black text-gray-900 mt-3">{formData.title || 'Untitled Event'}</h1>
                <p className="text-[#F87B68] font-black text-xl mt-1">₹{formData.price}</p>

                <div className="flex gap-4 mt-6 border-b border-gray-200 pb-6">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Date & Time</p>
                    <p className="text-sm font-bold text-gray-800 mt-1">{formData.date || 'TBD'} • {formData.time || 'TBD'}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Location</p>
                    <p className="text-sm font-bold text-gray-800 mt-1">{formData.location || 'TBD'}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-black text-gray-900 text-lg mb-2">About Event</h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    {formData.description || 'No description provided.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Fixed Bottom Bar */}
            <div className="bg-white p-4 border-t border-gray-100 flex gap-3 pb-8 shrink-0">
              <button className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <MessageSquare size={20} />
              </button>
              <button className="flex-1 bg-[#F87B68] text-white rounded-xl font-bold text-sm shadow-lg">
                Book Ticket
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
