import React, { useRef, useState } from 'react';
import { usePetEvents } from '../context/PetEventsContext';
import { uploadVendorFile } from '../../../../services/vendor';
import {
  Image as ImageIcon, Upload, Trash2, Plus, Loader2
} from 'lucide-react';

/** Real gallery — GET/POST/DELETE /vendor/event-gallery. */
export function EventGalleryView() {
  const { gallery, addGalleryItem, removeGalleryItem } = usePetEvents();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

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
    if (!window.confirm('Remove this photo from the gallery?')) return;
    try {
      await removeGalleryItem(id);
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not remove item');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Event Gallery</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Real photos uploaded to your event gallery.</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 bg-[#F87B68] hover:bg-[#F87B68] disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-orange-900/20 cursor-pointer">
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} {uploading ? 'Uploading…' : 'Upload Photos'}
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

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-2xl p-4">{error}</div>}

      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total: {gallery.length} photos</p>

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {gallery.map(item => (
          <div key={item.id} className="break-inside-avoid bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group relative">
            <div className="relative overflow-hidden bg-slate-100">
              <img src={item.url} alt={item.caption || 'Event'} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
                <div className="flex justify-end gap-2">
                  <button onClick={() => handleDelete(item.id)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white flex items-center justify-center text-white hover:text-slate-900 backdrop-blur transition cursor-pointer">
                    <Trash2 size={14}/>
                  </button>
                </div>
                {item.caption && (
                  <p className="text-sm font-black text-white line-clamp-1">{item.caption}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        <div
          onClick={() => fileInputRef.current?.click()}
          className="break-inside-avoid bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 h-64 flex flex-col items-center justify-center text-center p-6 hover:bg-slate-100 hover:border-orange-500/50 transition cursor-pointer group"
        >
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-400 group-hover:text-orange-500 shadow-sm transition mb-4">
            {uploading ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} />}
          </div>
          <h3 className="text-sm font-black text-slate-900 mb-1">Add New Media</h3>
          <p className="text-xs font-medium text-slate-500">Click here to upload photos</p>
        </div>

        {gallery.length === 0 && (
          <div className="break-inside-avoid text-center py-10 text-slate-400">
            <ImageIcon size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No photos uploaded yet.</p>
          </div>
        )}
      </div>

    </div>
  );
}
