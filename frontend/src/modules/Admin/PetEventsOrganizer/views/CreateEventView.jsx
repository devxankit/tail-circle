import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePetEvents } from '../context/PetEventsContext';
import { uploadVendorFile } from '../../../../services/vendor';
import {
  ArrowLeft, ArrowRight, Check, Image as ImageIcon,
  MapPin, Calendar, Clock, Upload, IndianRupee, Eye, Users, MessageSquare, Loader2, ShieldCheck
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { StickyActionBar, PrimaryButton, BottomSheet, InlineError, fieldClass, textareaClass, labelClass, FieldPair } from '../../vendor/mobile';

const EMPTY_TRAINER = { provision: 'none', pricePerPet: 300, note: '' };

const EMPTY_FORM = {
  title: '', category: 'Social Meetup', date: '', time: '',
  location: '', capacity: 20, price: 500, description: '', image: null,
  trainer: EMPTY_TRAINER,
};

/*
 * Owners mark their own pets as reactive, and the app suggests handler support
 * to them at checkout. That only works if you have said whether a handler is
 * on site and what it costs. If someone books one, the fee comes to you with
 * the ticket and providing the handler on the day is yours to arrange.
 *
 * 'Included' and 'Paid' are separate answers rather than a price of zero,
 * because "the handler is free" and "there is no handler" must not look the
 * same to an owner deciding whether it is safe to bring their pet.
 */
const TRAINER_OPTIONS = [
  { value: 'none', label: 'Not provided', hint: 'No handler on site' },
  { value: 'included', label: 'Included', hint: 'Free with every ticket' },
  { value: 'paid', label: 'Paid add-on', hint: 'Owners pay per pet' },
];

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
  const trainer = formData.trainer || EMPTY_TRAINER;
  const setTrainer = (patch) =>
    setFormData((f) => ({ ...f, trainer: { ...(f.trainer || EMPTY_TRAINER), ...patch } }));

  useEffect(() => {
    if (isEdit) {
      const source = events.find((e) => e.id === id);
      if (source) {
        setFormData({
          title: source.title, category: source.category, date: source.date, time: source.time,
          location: source.location, capacity: source.capacity, price: source.price,
          description: source.description || '', image: source.image || null,
          trainer: { ...EMPTY_TRAINER, ...(source.trainer || {}) },
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
      // ApiClientError carries the server's message directly; it has no
      // `.response`, so the axios-shaped read here always fell through.
      setError(err?.message || 'Could not upload image');
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
      setError(err?.message || 'Could not save this event');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1: return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Event Title</label>
            <input
              type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Golden Retriever Meetup"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
              className={fieldClass}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="What will happen at this event?"
              rows={5}
              className={cn(textareaClass, 'resize-none')}
            />
          </div>
        </div>
      );
      case 2: return (
        <div className="space-y-4">
          <FieldPair>
            <div>
              <label className={labelClass}><Calendar size={13} className="inline mr-1 -mt-0.5"/> Date</label>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={cn(fieldClass, 'px-3')}/>
            </div>
            <div>
              <label className={labelClass}><Clock size={13} className="inline mr-1 -mt-0.5"/> Time</label>
              <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className={cn(fieldClass, 'px-3')}/>
            </div>
          </FieldPair>
          <div>
            <label className={labelClass}><MapPin size={13} className="inline mr-1 -mt-0.5"/> Location / Venue</label>
            <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. Cubbon Park Dog Park" className={fieldClass}/>
          </div>
          <FieldPair>
            <div>
              <label className={labelClass}><Users size={13} className="inline mr-1 -mt-0.5"/> Max Capacity</label>
              <input type="number" inputMode="numeric" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} className={fieldClass}/>
            </div>
            <div>
              <label className={labelClass}><IndianRupee size={13} className="inline mr-1 -mt-0.5"/> Ticket Price</label>
              <input type="number" inputMode="numeric" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value)})} className={fieldClass}/>
            </div>
          </FieldPair>

          {/* -- Handler / trainer support -- */}
          <div className="border-t border-border-light pt-4">
            <label className={labelClass}>
              <ShieldCheck size={13} className="inline mr-1 -mt-0.5"/> Trainer / Handler Support
            </label>
            <p className="text-xs font-medium text-text-secondary mb-3 leading-relaxed">
              Optional for the owner. We suggest it to anyone whose pet is marked reactive; if they
              take it, the fee comes to you with the ticket and you arrange the handler on the day.
            </p>

            <div className="space-y-2">
              {TRAINER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTrainer({ provision: opt.value })}
                  className={cn(
                    "w-full min-h-[56px] px-4 py-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3",
                    trainer.provision === opt.value
                      ? "border-primary-main bg-primary-light/15 ring-2 ring-primary-main/15"
                      : "border-border-light bg-white"
                  )}
                >
                  <span className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', trainer.provision === opt.value ? 'border-primary-main bg-primary-main' : 'border-text-disabled')}>
                    {trainer.provision === opt.value && <span className="w-2 h-2 bg-white rounded-full" />}
                  </span>
                  <span>
                    <span className="block text-sm font-black text-text-primary">{opt.label}</span>
                    <span className="block text-[11px] font-medium text-text-secondary mt-0.5">{opt.hint}</span>
                  </span>
                </button>
              ))}
            </div>

            {trainer.provision !== 'none' && (
              <div className="mt-4 space-y-4">
                {trainer.provision === 'paid' && (
                  <div>
                    <label className={labelClass}>
                      <IndianRupee size={13} className="inline mr-1 -mt-0.5"/> Price Per Pet
                    </label>
                    <input
                      type="number" min="1" inputMode="numeric"
                      value={trainer.pricePerPet}
                      onChange={(e) => setTrainer({ pricePerPet: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                )}

                <div>
                  <label className={labelClass}>What The Handler Does</label>
                  <textarea
                    rows={3}
                    value={trainer.note}
                    onChange={(e) => setTrainer({ note: e.target.value })}
                    placeholder="e.g. Certified handler stays with the pet for the full session and manages introductions."
                    className={cn(textareaClass, 'resize-none')}
                  />
                </div>

                <p className="text-[11px] font-medium text-text-secondary bg-bg-primary border border-border-light rounded-xl px-4 py-3 leading-relaxed">
                  Every booking that includes a handler is flagged in your Bookings list and sent to
                  you as a notification. Arranging the trainer on the day is your responsibility.
                </p>
              </div>
            )}
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Event Cover Image</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            {formData.image ? (
              <div className="relative border border-border-light rounded-[24px] overflow-hidden aspect-video">
                <img src={formData.image} alt="Event Cover Preview" className="w-full h-full object-cover" />
                {/* Always shown: a phone has no hover to reveal it. */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex justify-center">
                  <button type="button" disabled={uploadingImage} onClick={() => fileInputRef.current?.click()} className="min-h-[44px] px-5 bg-white text-text-primary rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-2">
                    {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />} {uploadingImage ? 'Uploading…' : 'Change Photo'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !uploadingImage && fileInputRef.current?.click()}
                className="border-2 border-dashed border-accent-teal/50 rounded-[24px] p-8 flex flex-col items-center justify-center text-center bg-bg-primary transition cursor-pointer min-h-[240px]"
              >
                <div className="w-16 h-16 bg-primary-light/30 rounded-full flex items-center justify-center text-primary-main mb-4 shadow-sm">
                  {uploadingImage ? <Loader2 size={28} className="animate-spin" /> : <ImageIcon size={28} />}
                </div>
                <h4 className="text-sm font-black text-text-primary mb-1">{uploadingImage ? 'Uploading...' : 'Upload Cover Photo'}</h4>
                <p className="text-xs font-medium text-text-secondary max-w-xs mb-5">High quality photos make your event 3x more likely to be booked. (16:9 ratio recommended)</p>
                <span className="min-h-[40px] px-5 bg-text-primary text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 pointer-events-none">
                  <Upload size={14}/> Browse Files
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">

      {/* Step header (the title and Back are in the app bar). */}
      <div className="px-1">
        <p className="text-sm font-bold text-text-primary">Step {step} of 3: {step === 1 ? 'Basic Details' : step === 2 ? 'Logistics & Pricing' : 'Media & Cover'}</p>
        <div className="flex gap-2 mt-2">
          {[1,2,3].map(i => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", i <= step ? "bg-primary-main" : "bg-border-light")} />
          ))}
        </div>
      </div>

      <InlineError>{error}</InlineError>

      {/* Form Container */}
      <div className="bg-white p-4 rounded-[20px] border border-border-light shadow-sm">
        {renderStep()}
      </div>

      {step === 3 && (
        <button
          onClick={() => setShowPreview(true)}
          className="w-full min-h-[48px] bg-white border border-border-light text-text-primary text-sm font-bold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Eye size={18}/> Preview Event
        </button>
      )}

      {/* Footer Controls */}
      <StickyActionBar>
        <PrimaryButton
          tone="soft"
          className="flex-none px-5"
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/vendor/events-organizer/events')}
        >
          {step > 1 ? 'Back' : 'Cancel'}
        </PrimaryButton>

        {step < 3 ? (
          <PrimaryButton onClick={handleNext}>
            Next Step <ArrowRight size={18}/>
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={handlePublish} disabled={saving} loading={saving} icon={saving ? undefined : Check}>
            {isEdit ? 'Save Changes' : 'Publish Event'}
          </PrimaryButton>
        )}
      </StickyActionBar>

      {/* Preview — what a pet parent sees, as a full-screen sheet. */}
      <BottomSheet open={showPreview} onClose={() => setShowPreview(false)} fullScreen title="Preview" bodyClassName="px-0 pt-0">
        <div className="bg-gray-50 min-h-full">
          <div className="h-56 bg-slate-200 relative overflow-hidden">
            {formData.image ? (
              <img src={formData.image} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                <ImageIcon size={40} className="opacity-50" />
              </div>
            )}
            <button onClick={() => setShowPreview(false)} aria-label="Close preview" className="absolute top-4 left-4 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow cursor-pointer">
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

          {/* The customer screen's bottom bar, shown for reference only. */}
          <div className="bg-white p-4 border-t border-gray-100 flex gap-3">
            <button className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <MessageSquare size={20} />
            </button>
            <button className="flex-1 bg-[#F87B68] text-white rounded-xl font-bold text-sm shadow-lg">
              Book Ticket
            </button>
          </div>
        </div>
      </BottomSheet>

    </div>
  );
}
