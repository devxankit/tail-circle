import React, { useEffect, useMemo, useState } from 'react';
import {
  Clock, Plus, Trash2, Save, Loader2, AlertCircle, CheckCircle2,
  CalendarOff, Eye, Video, MapPin, Home, Siren,
} from 'lucide-react';
import {
  fetchVetAvailability, saveVetAvailability, fetchVetSlotPreview,
  addVetBlackout, removeVetBlackout,
} from '../../../../services/vendor';
import { useVetSelection, VetSelector } from '../components/VetSelector';

/**
 * Working schedule editor — the source of truth for what pet parents can book.
 *
 * This screen used to be a hardcoded week grid of invented appointments with
 * nothing behind it. Every control now writes to the availability engine, and
 * the preview panel calls the same generator the booking screen uses, so the
 * dashboard and the user app cannot disagree.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MODES = [
  { key: 'inClinic', label: 'In-Clinic', icon: MapPin },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'homeVisit', label: 'Home Visit', icon: Home },
  { key: 'emergency', label: 'Emergency', icon: Siren },
];

const blankBlock = () => ({ start: '10:00', end: '13:00', modes: ['inClinic'], capacity: 1 });

export function ClinicScheduleView() {
  // A clinic with several vets must say which one it is editing.
  const { vets, isOwner, doctorId, setDoctorId, ready, refreshVets } = useVetSelection();
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [previewDate, setPreviewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [previewMode, setPreviewMode] = useState('clinic');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const [blackoutDate, setBlackoutDate] = useState('');
  const [blackoutReason, setBlackoutReason] = useState('');

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    setLoading(true);
    fetchVetAvailability(doctorId)
      .then((a) => !cancelled && setAvailability(a))
      .catch((e) => !cancelled && setError(e.message || 'Could not load your schedule'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [ready, doctorId]);

  const dirty = () => setSaved(false);

  const patchDay = (dayIdx, patch) => {
    setAvailability((prev) => ({
      ...prev,
      weekly: prev.weekly.map((d) => (d.day === dayIdx ? { ...d, ...patch } : d)),
    }));
    dirty();
  };

  const patchBlock = (dayIdx, blockIdx, patch) => {
    setAvailability((prev) => ({
      ...prev,
      weekly: prev.weekly.map((d) =>
        d.day === dayIdx
          ? { ...d, blocks: d.blocks.map((b, i) => (i === blockIdx ? { ...b, ...patch } : b)) }
          : d
      ),
    }));
    dirty();
  };

  const addBlock = (dayIdx) => {
    const day = availability.weekly.find((d) => d.day === dayIdx);
    patchDay(dayIdx, { enabled: true, blocks: [...(day?.blocks || []), blankBlock()] });
  };

  const removeBlock = (dayIdx, blockIdx) => {
    const day = availability.weekly.find((d) => d.day === dayIdx);
    patchDay(dayIdx, { blocks: day.blocks.filter((_, i) => i !== blockIdx) });
  };

  const toggleBlockMode = (dayIdx, blockIdx, mode) => {
    const block = availability.weekly.find((d) => d.day === dayIdx).blocks[blockIdx];
    const modes = block.modes?.includes(mode)
      ? block.modes.filter((m) => m !== mode)
      : [...(block.modes || []), mode];
    patchBlock(dayIdx, blockIdx, { modes });
  };

  const handleEnableCurrentVideoSession = () => {
    const todayIndex = new Date().getDay();
    setAvailability((prev) => {
      const updatedWeekly = prev.weekly.map((d) => {
        if (d.day === todayIndex) {
          const hasFullBlock = (d.blocks || []).some((b) => b.start === '00:00' && b.end === '23:59');
          const newBlocks = hasFullBlock
            ? d.blocks.map((b) => ({ ...b, modes: Array.from(new Set([...(b.modes || []), 'video', 'inClinic'])) }))
            : [...(d.blocks || []), { start: '00:00', end: '23:59', modes: ['inClinic', 'video'], capacity: 1 }];
          return { ...d, enabled: true, blocks: newBlocks };
        }
        return d;
      });
      return { ...prev, leadTimeMinutes: 0, weekly: updatedWeekly };
    });
    dirty();
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const fresh = await saveVetAvailability({
        weekly: availability.weekly,
        slotMinutes: availability.slotMinutes,
        bufferMinutes: availability.bufferMinutes,
        leadTimeMinutes: availability.leadTimeMinutes,
        horizonDays: availability.horizonDays,
        emergency: availability.emergency,
      }, doctorId);
      setAvailability(fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (preview) runPreview();
    } catch (e) {
      // The server rejects inverted/malformed blocks — surface its message.
      setError(e.message || 'Could not save your schedule');
    } finally {
      setSaving(false);
    }
  };

  const runPreview = async () => {
    setPreviewing(true);
    try {
      setPreview(await fetchVetSlotPreview({ date: previewDate, visitType: previewMode, doctorId }));
    } catch (e) {
      setPreview({ slots: [], reason: e.message });
    } finally {
      setPreviewing(false);
    }
  };

  const handleAddBlackout = async () => {
    if (!blackoutDate) return;
    try {
      setAvailability(await addVetBlackout({ date: blackoutDate, reason: blackoutReason }, doctorId));
      setBlackoutDate('');
      setBlackoutReason('');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRemoveBlackout = async (date) => {
    try {
      setAvailability(await removeVetBlackout(date, doctorId));
    } catch (e) {
      setError(e.message);
    }
  };

  const workingDays = useMemo(
    () => (availability?.weekly || []).filter((d) => d.enabled).length,
    [availability]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!availability) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-8">
        <AlertCircle size={32} className="text-amber-500" />
        <p className="font-bold text-gray-800">Could not load your schedule</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <VetSelector vets={vets} isOwner={isOwner} doctorId={doctorId} onChange={setDoctorId} onVetAdded={refreshVets} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Working Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pet parents can only book times you set here.{' '}
            <span className="font-medium text-gray-700">
              {workingDays} working {workingDays === 1 ? 'day' : 'days'} a week
            </span>
            {' • '}{availability.timezone}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleEnableCurrentVideoSession}
            className="px-4 h-11 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 font-bold text-xs flex items-center gap-1.5 hover:bg-teal-100 transition cursor-pointer"
            title="Enable 24hr video slots for today so users can book right now"
          >
            <Video size={16} /> Enable Today's Video Slots
          </button>
          {saved && (
            <span className="text-emerald-600 text-sm font-bold flex items-center gap-1.5">
              <CheckCircle2 size={16} /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 h-11 rounded-xl bg-[#F87B68] text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving…' : 'Save schedule'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Consult settings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-gray-400" /> Consultation settings
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NumberField
            label="Default slot length" suffix="min" value={availability.slotMinutes} min={5} max={180}
            hint="Overridden per consult type"
            onChange={(v) => { setAvailability((p) => ({ ...p, slotMinutes: v })); dirty(); }}
          />
          <NumberField
            label="Gap between consults" suffix="min" value={availability.bufferMinutes} min={0} max={60}
            hint="Notes, room turnaround"
            onChange={(v) => { setAvailability((p) => ({ ...p, bufferMinutes: v })); dirty(); }}
          />
          <NumberField
            label="Minimum notice" suffix="min" value={availability.leadTimeMinutes} min={0} max={10080}
            hint="How soon before a slot"
            onChange={(v) => { setAvailability((p) => ({ ...p, leadTimeMinutes: v })); dirty(); }}
          />
          <NumberField
            label="Booking window" suffix="days" value={availability.horizonDays} min={1} max={180}
            hint="How far ahead"
            onChange={(v) => { setAvailability((p) => ({ ...p, horizonDays: v })); dirty(); }}
          />
        </div>
      </div>

      {/* Weekly grid */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {availability.weekly.map((day) => (
          <div key={day.day} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => patchDay(day.day, { enabled: !day.enabled })}
                  className={`w-11 h-6 rounded-full transition relative shrink-0 ${day.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  aria-label={`Toggle ${DAYS[day.day]}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${day.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
                <span className={`font-bold ${day.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                  {DAYS[day.day]}
                </span>
              </div>
              {day.enabled && (
                <button
                  onClick={() => addBlock(day.day)}
                  className="text-xs font-bold text-[#F87B68] flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Add session
                </button>
              )}
            </div>

            {day.enabled && (
              day.blocks.length ? (
                <div className="space-y-3 md:pl-14">
                  {day.blocks.map((block, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <input
                          type="time" value={block.start}
                          onChange={(e) => patchBlock(day.day, i, { start: e.target.value })}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium"
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                          type="time" value={block.end}
                          onChange={(e) => patchBlock(day.day, i, { end: e.target.value })}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium"
                        />
                        <div className="flex items-center gap-1.5 ml-2">
                          <span className="text-xs text-gray-500">seats</span>
                          <input
                            type="number" min={1} max={20} value={block.capacity ?? 1}
                            onChange={(e) => patchBlock(day.day, i, { capacity: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                          />
                        </div>
                        <button
                          onClick={() => removeBlock(day.day, i)}
                          className="ml-auto p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                          aria-label="Remove session"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Which consult types this session serves — this is how a
                          vet offers video only in the evening, say. */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mr-1">
                          Available for
                        </span>
                        {MODES.map(({ key, label, icon: Icon }) => {
                          const on = block.modes?.includes(key);
                          return (
                            <button
                              key={key}
                              onClick={() => toggleBlockMode(day.day, i, key)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 transition ${
                                on ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'
                              }`}
                            >
                              <Icon size={11} /> {label}
                            </button>
                          );
                        })}
                        {!block.modes?.length && (
                          <span className="text-[11px] text-amber-600 font-medium">
                            No type selected — this session will not be bookable
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="md:pl-14 text-sm text-gray-400">
                  No sessions yet — add one so patients can book.
                </p>
              )
            )}
          </div>
        ))}
      </div>

      {/* Emergency / after-hours cover — scheduled separately from the weekly
          grid so a vet can take urgent cases outside normal hours. */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Siren size={18} className="text-gray-400" /> Emergency &amp; after-hours
          </h2>
          <button
            onClick={() => {
              setAvailability((p) => ({
                ...p,
                emergency: { ...p.emergency, enabled: !p.emergency?.enabled },
              }));
              dirty();
            }}
            className={`w-11 h-6 rounded-full transition relative shrink-0 ${availability.emergency?.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
            aria-label="Toggle emergency availability"
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${availability.emergency?.enabled ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Urgent cases outside your normal sessions. Requires the Emergency consult type to be enabled on your profile.
        </p>

        {availability.emergency?.enabled && (
          <>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
              <input
                type="checkbox"
                checked={availability.emergency?.alwaysOn ?? false}
                onChange={(e) => {
                  setAvailability((p) => ({
                    ...p,
                    emergency: { ...p.emergency, alwaysOn: e.target.checked },
                  }));
                  dirty();
                }}
                className="rounded"
              />
              Available 24×7 for emergencies
            </label>

            {!availability.emergency?.alwaysOn && (
              <div className="space-y-2">
                {(availability.emergency?.blocks || []).map((block, i) => (
                  <div key={i} className="flex items-center gap-2 flex-wrap bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <input
                      type="time" value={block.start}
                      onChange={(e) => {
                        const blocks = [...availability.emergency.blocks];
                        blocks[i] = { ...blocks[i], start: e.target.value };
                        setAvailability((p) => ({ ...p, emergency: { ...p.emergency, blocks } }));
                        dirty();
                      }}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <input
                      type="time" value={block.end}
                      onChange={(e) => {
                        const blocks = [...availability.emergency.blocks];
                        blocks[i] = { ...blocks[i], end: e.target.value };
                        setAvailability((p) => ({ ...p, emergency: { ...p.emergency, blocks } }));
                        dirty();
                      }}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => {
                        const blocks = availability.emergency.blocks.filter((_, x) => x !== i);
                        setAvailability((p) => ({ ...p, emergency: { ...p.emergency, blocks } }));
                        dirty();
                      }}
                      className="ml-auto p-1.5 text-gray-400 hover:text-red-500"
                      aria-label="Remove emergency window"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const blocks = [...(availability.emergency?.blocks || []), { start: '20:00', end: '23:00', capacity: 1 }];
                    setAvailability((p) => ({ ...p, emergency: { ...p.emergency, blocks } }));
                    dirty();
                  }}
                  className="text-xs font-bold text-[#F87B68] flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Add emergency window
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Days off */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
          <CalendarOff size={18} className="text-gray-400" /> Days off
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Leave, holidays or conferences. These dates are removed from booking entirely.
        </p>
        <div className="flex gap-2 flex-wrap mb-4">
          <input
            type="date" value={blackoutDate} onChange={(e) => setBlackoutDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text" placeholder="Reason (optional)" value={blackoutReason}
            onChange={(e) => setBlackoutReason(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
          />
          <button
            onClick={handleAddBlackout} disabled={!blackoutDate}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {availability.blackouts?.length ? (
          <div className="flex flex-wrap gap-2">
            {availability.blackouts.map((b) => (
              <span key={b.date} className="bg-gray-100 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
                <strong className="text-gray-800">{b.date}</strong>
                {b.reason && <span className="text-gray-500 text-xs">{b.reason}</span>}
                <button
                  onClick={() => handleRemoveBlackout(b.date)}
                  className="text-gray-400 hover:text-red-500"
                  aria-label={`Remove ${b.date}`}
                >
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No days off scheduled.</p>
        )}
      </div>

      {/* Preview — same generator the booking screen uses */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Eye size={18} className="text-gray-400" /> What patients see
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Generated by the same engine as the booking screen. Save first to preview unsaved edits.
        </p>
        <div className="flex gap-2 flex-wrap mb-4">
          <input
            type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={previewMode} onChange={(e) => setPreviewMode(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium"
          >
            <option value="clinic">In-Clinic</option>
            <option value="video">Video</option>
            <option value="home">Home Visit</option>
            <option value="emergency">Emergency</option>
          </select>
          <button
            onClick={runPreview}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold flex items-center gap-2"
          >
            {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Preview
          </button>
        </div>

        {preview && (
          preview.slots.length ? (
            <div className="flex flex-wrap gap-2">
              {preview.slots.map((s) => (
                <span
                  key={s.time}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                    s.available
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                  }`}
                >
                  {s.time}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No bookable slots on this date
              {preview.reason ? ` — ${String(preview.reason).replace(/_/g, ' ')}` : ''}.
            </p>
          )
        )}
      </div>
    </div>
  );
}

function NumberField({ label, suffix, value, min, max, onChange, hint }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number" min={min} max={max} value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm font-medium"
        />
        <span className="text-sm text-gray-400">{suffix}</span>
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default ClinicScheduleView;
