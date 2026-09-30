import React, { useRef, useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import { uploadVendorFile } from '../../../../services/vendor';
import {
  Image as ImageIcon, Upload, Trash2, Plus, Loader2
} from 'lucide-react';
import { InlineError, useConfirm, useVendorToast } from '../../vendor/mobile';

/** Real gallery — GET/POST/DELETE /vendor/event-gallery. */
export function EventGalleryView() {
  const { gallery, addGalleryItem, removeGalleryItem } = usePetEvents();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const confirm = useConfirm();
  const { addToast } = useVendorToast();

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = null;
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      for (const file of files) {
        const url = await uploadVendorFile(file, 'event-gallery');
        await addGalleryItem({ url, caption: file.name });
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not upload one or more files');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirm({ title: 'Remove this photo from the gallery?', confirmLabel: 'Remove', danger: true }))) return;
    try {
      await removeGalleryItem(id);
    } catch (err) {
      addToast({ message: err?.response?.data?.message || 'Could not remove item', type: 'error' });
    }
  };

  return (
    <div className="space-y-4">

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-text-primary leading-tight">Event Gallery</h2>
          <p className="text-xs text-text-secondary mt-1">Real photos uploaded to your event gallery.</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-11 px-4 rounded-full bg-primary-main disabled:opacity-60 text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-primary-main/25 shrink-0 cursor-pointer">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {uploading ? 'Uploading…' : 'Upload Photos'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          multiple
          className="hidden"
        />
      </div>

      <InlineError>{error}</InlineError>

      <p className="text-xs font-bold text-text-secondary uppercase tracking-widest px-1">Total: {gallery.length} photos</p>

      {/* 2-column grid; delete is always visible (it was hover-only). */}
      <div className="grid grid-cols-2 gap-3">
        {gallery.map(item => (
          <div key={item.id} className="bg-white rounded-[20px] border border-border-light shadow-sm overflow-hidden relative aspect-square">
            <img src={item.url} alt={item.caption || 'Event'} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
            <button
              onClick={() => handleDelete(item.id)}
              aria-label="Remove photo"
              className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center text-error shadow-sm cursor-pointer"
            >
              <Trash2 size={16}/>
            </button>
            {item.caption && (
              <p className="absolute bottom-2 left-3 right-3 text-xs font-black text-white line-clamp-1">{item.caption}</p>
            )}
          </div>
        ))}

        <div
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square bg-bg-primary rounded-[20px] border-2 border-dashed border-accent-teal/50 flex flex-col items-center justify-center text-center p-4 transition cursor-pointer"
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-accent-teal shadow-sm mb-2">
            {uploading ? <Loader2 size={22} className="animate-spin" /> : <Plus size={22} />}
          </div>
          <h3 className="text-sm font-black text-text-primary">Add New Media</h3>
          <p className="text-[11px] font-medium text-text-secondary">Tap to upload photos</p>
        </div>
      </div>

      {gallery.length === 0 && (
        <div className="text-center py-6 text-text-secondary">
          <ImageIcon size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm font-semibold">No photos uploaded yet.</p>
        </div>
      )}

    </div>
  );
}
