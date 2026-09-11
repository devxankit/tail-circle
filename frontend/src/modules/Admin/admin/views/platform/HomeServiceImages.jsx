import { useEffect, useMemo, useState } from 'react';
import { Check, Save, Image as ImageIcon, Info, RotateCcw, Loader2, UploadCloud } from 'lucide-react';
import {
  fetchAdminBanners,
  createBannerApi,
  updateBannerApi,
  uploadAdminImage,
} from '../../../../../services/admin';
import {
  SHIPPED_SERVICE_CARDS,
  SHIPPED_MEET_MATCH,
  HOME_SERVICES_SLOT,
  HOME_FEATURE_SLOT,
  editableServiceTiles,
  editableMeetMatch,
} from '../../../../../constants/homeServiceCards';

/**
 * Home Service Images — the artwork on the user app's Home screen.
 *
 * Covers the wide Meet & Match card and the eight service tiles under it,
 * which were hardcoded asset paths in Home.jsx until this screen existed. Each
 * tile is one Banner document (slot "Home Services"), so the public
 * `GET /banners` the Home rails already read serves the new artwork too — a
 * picture changes without a redeploy.
 *
 * Uploads go to Cloudinary through `uploadAdminImage`. Pasting a path that
 * ships with the app (`/assets/…`) still works, which is what Reset writes.
 *
 * What is saved here is what Home renders — there is no shipped artwork
 * standing in behind a blank field. Clearing an image and saving leaves that
 * tile with no picture on Home, which is what Reset exists to undo. Each
 * preview is therefore built exactly like the real tile, blanks included.
 */

/** Editing state for one tile, shaped the same whether it came from the API or the defaults. */
const toDraft = (card) => ({
  key: card.key,
  name: card.name || '',
  tag: card.tag || '',
  desc: card.desc || '',
  image: card.image || '',
  path: card.path || '',
  bg: card.bg,
  imgClass: card.imgClass,
});

/** Just the stored fields, for comparing a draft against what was last saved. */
const snapshot = (d) => JSON.stringify([d.name, d.tag, d.desc, d.image, d.path]);
const snapshotsOf = (drafts) => Object.fromEntries(drafts.map((d) => [d.key, snapshot(d)]));

const INPUT_CLASS =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] text-slate-800 font-semibold ' +
  'bg-white focus:outline-none focus:border-[#66B4B1] focus:ring-2 focus:ring-[#66B4B1]/20 ' +
  'placeholder:font-normal placeholder:text-slate-400 disabled:bg-slate-50';

export function HomeServiceImages() {
  const [toastMessage, setToastMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meetMatch, setMeetMatch] = useState(() => toDraft(editableMeetMatch([])));
  const [cards, setCards] = useState(() => editableServiceTiles([]).map(toDraft));
  // Banner key → document id. A key missing here is created on its first save.
  const [bannerIds, setBannerIds] = useState({});
  // Banner key → snapshot of what the server last accepted, so the screen can
  // show which tiles have edits still sitting in the browser.
  const [savedSnapshots, setSavedSnapshots] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [uploadingKey, setUploadingKey] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    // Only this screen's two slots: the unfiltered banner list carries the
    // Section rows, whose images are inlined data URLs running to megabytes.
    fetchAdminBanners([HOME_SERVICES_SLOT, HOME_FEATURE_SLOT])
      .then((rows) => {
        const list = rows || [];
        const tileDrafts = editableServiceTiles(list).map(toDraft);
        const meetDraft = toDraft(editableMeetMatch(list));
        setBannerIds(Object.fromEntries(list.map((b) => [b.key, b.id])));
        setCards(tileDrafts);
        setMeetMatch(meetDraft);
        setSavedSnapshots(snapshotsOf([meetDraft, ...tileDrafts]));
      })
      .catch(() => showToast('Failed to load Home service images'))
      .finally(() => setLoading(false));
  }, []);

  /** The artwork the app shipped with, which Reset writes back. */
  const shippedByKey = useMemo(
    () => Object.fromEntries([SHIPPED_MEET_MATCH, ...SHIPPED_SERVICE_CARDS].map((c) => [c.key, c])),
    []
  );

  const patchCard = (key, patch) => {
    if (key === meetMatch.key) return setMeetMatch((prev) => ({ ...prev, ...patch }));
    setCards((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  };

  const isDirty = (draft) => !loading && savedSnapshots[draft.key] !== snapshot(draft);
  const isBusy = (key) => savingKey === key || savingKey === '__all__';
  const dirtyDrafts = [meetMatch, ...cards].filter(isDirty);

  /*
   * Write one tile back.
   *
   * `createBannerApi` upserts on `key`, so a draft whose row id we never
   * learned (first save, or a row added from another tab) still updates the
   * existing document rather than racing a duplicate into the slot.
   */
  const persist = async (draft, slot) => {
    const payload = {
      title: draft.name || '',
      subtitle: draft.desc || '',
      badge: draft.tag || '',
      image: draft.image || '',
      link: draft.path || '',
      slot,
    };
    const saved = bannerIds[draft.key]
      ? await updateBannerApi(bannerIds[draft.key], payload)
      : await createBannerApi({ key: draft.key, ...payload });
    if (!bannerIds[draft.key]) setBannerIds((prev) => ({ ...prev, [draft.key]: saved.id }));
    setSavedSnapshots((prev) => ({ ...prev, [draft.key]: snapshot(draft) }));
    return saved;
  };

  const slotOf = (key) => (key === meetMatch.key ? HOME_FEATURE_SLOT : HOME_SERVICES_SLOT);

  const handleSave = async (draft) => {
    setSavingKey(draft.key);
    try {
      await persist(draft, slotOf(draft.key));
      showToast(`${draft.name || 'Tile'} updated — live on Home now`);
    } catch {
      showToast('Save failed. Please try again.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleUpload = async (key, file) => {
    if (!file) return;
    setUploadingKey(key);
    try {
      const url = await uploadAdminImage(file, 'home-services');
      if (!url) throw new Error('Upload returned no URL');
      patchCard(key, { image: url });
      showToast('Image uploaded — click Save to publish it.');
    } catch {
      showToast('Upload failed. Check the file size and try again.');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleReset = async (key) => {
    const original = shippedByKey[key];
    if (!original) return;
    const draft = toDraft(original);
    patchCard(key, draft);
    setSavingKey(key);
    try {
      await persist(draft, slotOf(key));
      showToast(`${original.name} restored to the original image`);
    } catch {
      showToast('Reset failed. Please try again.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveAll = async () => {
    if (!dirtyDrafts.length) return;
    setSavingKey('__all__');
    try {
      for (const draft of dirtyDrafts) await persist(draft, slotOf(draft.key));
      showToast(`${dirtyDrafts.length} tile${dirtyDrafts.length > 1 ? 's' : ''} published`);
    } catch {
      showToast('Some tiles failed to save. Please retry.');
    } finally {
      setSavingKey(null);
    }
  };

  /*
   * The editor controls are render functions rather than child components: a
   * component defined inside the render is remounted on every keystroke, which
   * drops focus out of the text inputs mid-word.
   */
  const renderField = (draft, field, label, { maxLength, placeholder, transform } = {}) => (
    <label className="block min-w-0">
      <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </span>
      <input
        type="text"
        value={draft[field] || ''}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={isBusy(draft.key)}
        onChange={(e) =>
          patchCard(draft.key, { [field]: transform ? transform(e.target.value) : e.target.value })
        }
        className={INPUT_CLASS}
      />
    </label>
  );

  const renderImageRow = (draft) => (
    <div className="min-w-0">
      <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
        Image
      </span>
      <div className="flex flex-wrap gap-2">
        <label
          className={`px-3 py-2 border border-slate-300 rounded-lg text-[13px] font-bold text-slate-700 bg-white shrink-0 flex items-center gap-1.5 transition ${
            uploadingKey === draft.key || isBusy(draft.key)
              ? 'opacity-60 cursor-not-allowed'
              : 'cursor-pointer hover:bg-slate-50 hover:border-slate-400'
          }`}
        >
          {uploadingKey === draft.key ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <UploadCloud size={14} />
          )}
          <input
            type="file"
            accept="image/*"
            disabled={uploadingKey === draft.key || isBusy(draft.key)}
            onChange={(e) => {
              handleUpload(draft.key, e.target.files?.[0]);
              e.target.value = '';
            }}
            className="hidden"
          />
          {uploadingKey === draft.key ? 'Uploading' : 'Upload'}
        </label>
        <input
          type="text"
          value={(draft.image || '').startsWith('data:image/') ? '[Uploaded image]' : draft.image || ''}
          onChange={(e) => patchCard(draft.key, { image: e.target.value })}
          disabled={isBusy(draft.key)}
          placeholder="or paste an image URL"
          className={`${INPUT_CLASS} flex-1 min-w-[150px]`}
        />
      </div>
    </div>
  );

  const renderActions = (draft) => (
    <div className="flex gap-2 pt-1">
      <button
        onClick={() => handleSave(draft)}
        disabled={isBusy(draft.key) || !isDirty(draft)}
        className="flex-1 h-[38px] px-4 bg-[#66B4B1] hover:bg-[#5AA5A2] disabled:bg-slate-200 disabled:text-slate-400 text-white text-[13px] font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer"
      >
        {savingKey === draft.key ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {isDirty(draft) ? 'Save' : 'Saved'}
      </button>
      <button
        onClick={() => handleReset(draft.key)}
        disabled={isBusy(draft.key)}
        title="Restore the image this tile shipped with"
        className="h-[38px] px-3 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 text-slate-600 text-[13px] font-bold rounded-lg transition flex items-center gap-1.5 active:scale-[0.98] bg-white cursor-pointer disabled:cursor-not-allowed"
      >
        <RotateCcw size={14} /> Reset
      </button>
    </div>
  );

  const unsavedPill = (draft) =>
    isDirty(draft) && (
      <span className="absolute top-2 right-2 bg-amber-400 text-amber-950 text-[9px] font-black tracking-wide px-2 py-0.5 rounded-full shadow-sm">
        UNSAVED
      </span>
    );

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans">
      <div className="mx-auto w-full max-w-[1200px] px-3 sm:px-6 py-4 sm:py-6 pb-20">
        {toastMessage && (
          <div className="fixed z-50 top-4 left-4 right-4 sm:left-auto sm:right-6 sm:top-6 sm:max-w-sm">
            <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check size={14} />
              </div>
              <p className="text-[13px] font-bold text-slate-800 min-w-0">{toastMessage}</p>
            </div>
          </div>
        )}

        {/* Page header */}
        <header className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-[22px] font-semibold text-slate-900 tracking-tight">
              Home Service Images
            </h1>
            <p className="text-[13px] text-slate-500 mt-1 max-w-2xl">
              Replace the artwork and labels on the user app&apos;s Home screen — the Meet &amp;
              Match banner and every service tile below it.
            </p>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={savingKey !== null || !dirtyDrafts.length}
            className="w-full lg:w-auto shrink-0 h-[42px] px-5 bg-[#F87B68] hover:bg-[#E96D5B] disabled:bg-slate-200 disabled:text-slate-400 text-white text-[13px] font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:active:scale-100 cursor-pointer disabled:cursor-not-allowed"
          >
            {savingKey === '__all__' ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {dirtyDrafts.length ? `Save ${dirtyDrafts.length} change${dirtyDrafts.length > 1 ? 's' : ''}` : 'All changes saved'}
          </button>
        </header>

        <div className="mb-6 bg-sky-50 border border-sky-100 rounded-xl p-3 sm:p-4 flex items-start gap-3">
          <Info size={17} className="text-sky-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-sky-900 leading-relaxed min-w-0">
            <span className="font-bold">Recommended sizes. </span>
            Service tiles crop to <strong>16:11</strong>, so upload around{' '}
            <strong>800 × 550px</strong>. The Meet &amp; Match banner is wider — use about{' '}
            <strong>1200 × 600px</strong>. Keep the subject centred, because tiles crop from the
            edges on narrow phones.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex items-center justify-center gap-3 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[13px] font-semibold">Loading Home service images…</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Meet & Match: the wide card above the grid ── */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-[15px] font-bold text-slate-900">Meet &amp; Match banner</h2>
              <p className="text-[12px] text-slate-500 mt-0.5 mb-5">
                The wide card at the top of Home that opens the matches screen.
              </p>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                    Preview
                  </span>
                  <div className="rounded-[20px] overflow-hidden border border-slate-200 relative">
                    <div className="w-full aspect-[2/1] bg-slate-100 relative">
                      {meetMatch.image ? (
                        <img
                          src={meetMatch.image}
                          alt={meetMatch.name}
                          className="w-full h-full object-cover object-[50%_25%]"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400">
                          <ImageIcon size={26} />
                          <span className="text-[11px] font-semibold">No image</span>
                        </div>
                      )}
                      {unsavedPill(meetMatch)}
                    </div>
                    <div className="bg-[#F87B68] px-4 py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[17px] font-black text-white leading-tight truncate min-h-[20px]">
                          {meetMatch.name}
                        </h3>
                        <p className="text-[11.5px] text-white/90 font-bold leading-snug line-clamp-2 min-h-[14px]">
                          {meetMatch.desc}
                        </p>
                      </div>
                      <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[11px] font-black shrink-0">
                        Explore
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 min-w-0">
                  {renderField(meetMatch, 'name', 'Heading', { maxLength: 40 })}
                  {renderField(meetMatch, 'desc', 'Sub-heading', {
                    maxLength: 90,
                    placeholder: 'Find playdates, friends & mates near you',
                  })}
                  {renderImageRow(meetMatch)}
                  <div className="mt-auto">{renderActions(meetMatch)}</div>
                </div>
              </div>
            </section>

            {/* ── The eight service tiles ── */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
              <h2 className="text-[15px] font-bold text-slate-900">Service tiles</h2>
              <p className="text-[12px] text-slate-500 mt-0.5 mb-5">
                The two-column grid on Home. Each tile keeps its position and colour; the picture,
                title, badge and caption are yours to change.
              </p>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                  <article
                    key={card.key}
                    className={`rounded-2xl border overflow-hidden flex flex-col transition-colors ${
                      isDirty(card) ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    {/* Preview, built the same way as the tile the user sees */}
                    <div className="relative">
                      <div className="w-full aspect-[16/11] bg-slate-100 relative overflow-hidden">
                        {card.image ? (
                          <img
                            src={card.image}
                            alt={card.name}
                            loading="lazy"
                            className={`w-full h-full object-cover ${card.imgClass || ''}`}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400">
                            <ImageIcon size={22} />
                            <span className="text-[11px] font-semibold">No image</span>
                          </div>
                        )}
                        {card.tag && (
                          <span
                            className={`absolute top-2 left-2 ${card.bg} text-white text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase`}
                          >
                            {card.tag}
                          </span>
                        )}
                        {unsavedPill(card)}
                      </div>
                      <div className={`${card.bg} px-3.5 py-2.5`}>
                        <h3 className="text-[14px] font-black text-white leading-tight truncate min-h-[17px]">
                          {card.name}
                        </h3>
                        <p className="text-[10.5px] font-black text-white/80 leading-tight truncate min-h-[13px]">
                          {card.desc}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 flex flex-col gap-3 flex-1">
                      <div className="flex gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          {renderField(card, 'name', 'Title', { maxLength: 24 })}
                        </div>
                        <div className="w-[88px] shrink-0">
                          {renderField(card, 'tag', 'Badge', {
                            maxLength: 10,
                            transform: (v) => v.toUpperCase(),
                          })}
                        </div>
                      </div>
                      {renderField(card, 'desc', 'Caption', { maxLength: 40 })}
                      {renderImageRow(card)}
                      <div className="mt-auto">{renderActions(card)}</div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomeServiceImages;
