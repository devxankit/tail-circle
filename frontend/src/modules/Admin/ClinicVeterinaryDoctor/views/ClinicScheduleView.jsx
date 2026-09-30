import React, { useEffect, useMemo, useState } from 'react';
import {
  Clock, Plus, Trash2, Save, Loader2, AlertCircle, CheckCircle2,
  CalendarOff, Eye, Video, MapPin, Home, Siren, ChevronDown,
} from 'lucide-react';
import {
  fetchVetAvailability, saveVetAvailability, fetchVetSlotPreview,
  addVetBlackout, removeVetBlackout,
} from '../../../../services/vendor';
import { useVetSelection, VetSelector } from '../components/VetSelector';
import { FormSection, StickyActionBar, PrimaryButton, SkeletonList, InlineError, fieldClass, labelClass } from '../../vendor/mobile';

/**
 * Working schedule editor — the source of truth for what pet parents can book.
 *
 * This screen used to be a hardcoded week grid of invented appointments with
 * nothing behind it. Every control now writes to the availability engine, and
 * the preview panel calls the same generator the booking screen uses, so the
 * dashboard and the user app cannot disagree.
 *
 * On a phone each weekday is a card that expands to its sessions; Save sits
 * in the bottom bar.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MODES = [
  { key: 'inClinic', label: 'In-Clinic', icon: MapPin },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'homeVisit', label: 'Home Visit', icon: Home },
  { key: 'emergency', label: 'Emergency', icon: Siren },
];

const blankBlock = () => ({ start: '10:00', end: '13:00', modes: ['inClinic'], capacity: 1 });

const timeField = 'w-full h-11 rounded-xl border border-border-light bg-white px-3 text-[16px] font-medium text-text-primary focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20';

function Switch({ on, onClick, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!on}
      aria-label={label}
      onClick={onClick}
      className="h-11 flex items-center shrink-0"
    >
      <span className={`w-11 h-6 rounded-full transition relative ${on ? 'bg-success' : 'bg-text-disabled'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

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

  // Which weekday cards are open (today's starts open).
  const [openDays, setOpenDays] = useState(() => ({ [new Date().getDay()]: true }));
  const toggleOpen = (dayIdx) => setOpenDays((prev) => ({ ...prev, [dayIdx]: !prev[dayIdx] }));

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
    return <SkeletonList rows={5} />;
  }

  if (!availability) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-8">
        <AlertCircle size={32} className="text-warning" />
        <p className="font-bold text-text-primary">Could not load your schedule</p>
        <p className="text-sm text-text-secondary">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <VetSelector vets={vets} isOwner={isOwner} doctorId={doctorId} onChange={setDoctorId} onVetAdded={refreshVets} />

      <div className="px-1">
        <h1 className="text-lg font-bold text-text-primary">Working Schedule</h1>
        <p className="text-xs text-text-secondary mt-1">
          Pet parents can only book times you set here.{' '}
          <span className="font-bold text-text-primary">
            {workingDays} working {workingDays === 1 ? 'day' : 'days'} a week
          </span>
          {' • '}{availability.timezone}
        </p>
      </div>

      <button
        onClick={handleEnableCurrentVideoSession}
        className="w-full min-h-[48px] px-4 rounded-2xl bg-accent-teal/10 border border-accent-teal/30 text-[#4C8684] font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
        title="Enable 24hr video slots for today so users can book right now"
      >
        <Video size={17} /> Enable Today's Video Slots
      </button>

      {error && (
        <InlineError>
          <span className="flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}</span>
        </InlineError>
      )}

      {/* Consult settings */}
      <FormSection title="Consultation settings" icon={Clock}>
        <div className="grid grid-cols-2 gap-4">
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
      </FormSection>

      {/* Weekly schedule: one expandable card per day */}
      <div className="space-y-2">
        {availability.weekly.map((day) => {
          const open = !!openDays[day.day];
          const summary = !day.enabled
            ? 'Closed'
            : day.blocks.length
              ? day.blocks.map((b) => `${b.start}–${b.end}`).join(', ')
              : 'No sessions yet';
          return (
            <div key={day.day} className="bg-white rounded-[20px] border border-border-light shadow-sm">
              <div className="flex items-center gap-3 pl-4 pr-2">
                <Switch
                  on={day.enabled}
                  onClick={() => patchDay(day.day, { enabled: !day.enabled })}
                  label={`Toggle ${DAYS[day.day]}`}
                />
                <button
                  type="button"
                  onClick={() => toggleOpen(day.day)}
                  aria-expanded={open}
                  className="flex-1 min-w-0 min-h-[60px] py-2 flex items-center gap-2 text-left"
                >
                  <span className="flex-1 min-w-0">
                    <span className={`block font-bold ${day.enabled ? 'text-text-primary' : 'text-text-disabled'}`}>
                      {DAYS[day.day]}
                    </span>
                    <span className="block text-xs text-text-secondary truncate">{summary}</span>
                  </span>
                  <ChevronDown size={20} className={`text-text-secondary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {open && (
                <div className="px-4 pb-4 space-y-3">
                  {!day.enabled ? (
                    <p className="text-sm text-text-secondary">Turn the day on to add sessions.</p>
                  ) : day.blocks.length ? (
                    day.blocks.map((block, i) => (
                      <div key={i} className="bg-bg-primary rounded-2xl p-3 border border-border-light space-y-3">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <input
                            type="time" value={block.start}
                            onChange={(e) => patchBlock(day.day, i, { start: e.target.value })}
                            className={timeField}
                            aria-label="Start time"
                          />
                          <span className="text-text-secondary text-sm">to</span>
                          <input
                            type="time" value={block.end}
                            onChange={(e) => patchBlock(day.day, i, { end: e.target.value })}
                            className={timeField}
                            aria-label="End time"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-secondary">seats</span>
                          <input
                            type="number" inputMode="numeric" min={1} max={20} value={block.capacity ?? 1}
                            onChange={(e) => patchBlock(day.day, i, { capacity: Math.max(1, Number(e.target.value) || 1) })}
                            className={`${timeField} w-20`}
                          />
                          <button
                            onClick={() => removeBlock(day.day, i)}
                            className="ml-auto w-11 h-11 flex items-center justify-center text-error bg-error/10 rounded-xl"
                            aria-label="Remove session"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Which consult types this session serves — this is how a
                            vet offers video only in the evening, say. */}
                        <div>
                          <span className="block text-[11px] font-bold text-text-secondary uppercase tracking-wide mb-2">
                            Available for
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {MODES.map(({ key, label, icon: Icon }) => {
                              const on = block.modes?.includes(key);
                              return (
                                <button
                                  key={key}
                                  onClick={() => toggleBlockMode(day.day, i, key)}
                                  className={`min-h-[36px] px-3 rounded-full text-xs font-bold border flex items-center gap-1 transition ${
                                    on ? 'bg-text-primary text-white border-text-primary' : 'bg-white text-text-secondary border-border-light'
                                  }`}
                                >
                                  <Icon size={12} /> {label}
                                </button>
                              );
                            })}
                          </div>
                          {!block.modes?.length && (
                            <p className="text-[11px] text-warning font-medium mt-2">
                              No type selected — this session will not be bookable
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-secondary">
                      No sessions yet — add one so patients can book.
                    </p>
                  )}
                  {day.enabled && (
                    <button
                      onClick={() => addBlock(day.day)}
                      className="w-full min-h-[44px] rounded-xl border border-dashed border-primary-main/40 text-sm font-bold text-primary-main flex items-center justify-center gap-1"
                    >
                      <Plus size={16} /> Add session
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Emergency / after-hours cover — scheduled separately from the weekly
          grid so a vet can take urgent cases outside normal hours. */}
      <FormSection
        title="Emergency & after-hours"
        icon={Siren}
        description="Urgent cases outside your normal sessions. Requires the Emergency consult type to be enabled on your profile."
        action={(
          <Switch
            on={availability.emergency?.enabled}
            onClick={() => {
              setAvailability((p) => ({
                ...p,
                emergency: { ...p.emergency, enabled: !p.emergency?.enabled },
              }));
              dirty();
            }}
            label="Toggle emergency availability"
          />
        )}
        bodyClassName={availability.emergency?.enabled ? undefined : 'hidden'}
      >
        {availability.emergency?.enabled && (
          <>
            <label className="flex items-center gap-3 min-h-[44px] text-sm font-medium text-text-primary">
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
                className="w-5 h-5 rounded accent-[#66B4B1]"
              />
              Available 24×7 for emergencies
            </label>

            {!availability.emergency?.alwaysOn && (
              <div className="space-y-2">
                {(availability.emergency?.blocks || []).map((block, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 bg-bg-primary rounded-2xl p-2 border border-border-light">
                    <input
                      type="time" value={block.start}
                      onChange={(e) => {
                        const blocks = [...availability.emergency.blocks];
                        blocks[i] = { ...blocks[i], start: e.target.value };
                        setAvailability((p) => ({ ...p, emergency: { ...p.emergency, blocks } }));
                        dirty();
                      }}
                      className={timeField}
                      aria-label="Start time"
                    />
                    <span className="text-text-secondary text-sm">to</span>
                    <input
                      type="time" value={block.end}
                      onChange={(e) => {
                        const blocks = [...availability.emergency.blocks];
                        blocks[i] = { ...blocks[i], end: e.target.value };
                        setAvailability((p) => ({ ...p, emergency: { ...p.emergency, blocks } }));
                        dirty();
                      }}
                      className={timeField}
                      aria-label="End time"
                    />
                    <button
                      onClick={() => {
                        const blocks = availability.emergency.blocks.filter((_, x) => x !== i);
                        setAvailability((p) => ({ ...p, emergency: { ...p.emergency, blocks } }));
                        dirty();
                      }}
                      className="w-11 h-11 flex items-center justify-center text-error"
                      aria-label="Remove emergency window"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const blocks = [...(availability.emergency?.blocks || []), { start: '20:00', end: '23:00', capacity: 1 }];
                    setAvailability((p) => ({ ...p, emergency: { ...p.emergency, blocks } }));
                    dirty();
                  }}
                  className="w-full min-h-[44px] rounded-xl border border-dashed border-primary-main/40 text-sm font-bold text-primary-main flex items-center justify-center gap-1"
                >
                  <Plus size={16} /> Add emergency window
                </button>
              </div>
            )}
          </>
        )}
      </FormSection>

      {/* Days off */}
      <FormSection
        title="Days off"
        icon={CalendarOff}
        description="Leave, holidays or conferences. These dates are removed from booking entirely."
      >
        <div className="space-y-2">
          <input
            type="date" value={blackoutDate} onChange={(e) => setBlackoutDate(e.target.value)}
            className={fieldClass}
            aria-label="Day off"
          />
          <div className="flex gap-2">
            <input
              type="text" placeholder="Reason (optional)" value={blackoutReason}
              onChange={(e) => setBlackoutReason(e.target.value)}
              className={`${fieldClass} flex-1 min-w-0`}
            />
            <button
              onClick={handleAddBlackout} disabled={!blackoutDate}
              className="h-12 px-5 rounded-xl bg-text-primary text-white text-sm font-bold disabled:opacity-40 shrink-0"
            >
              Add
            </button>
          </div>
        </div>
        {availability.blackouts?.length ? (
          <div className="flex flex-wrap gap-2">
            {availability.blackouts.map((b) => (
              <span key={b.date} className="bg-bg-secondary rounded-xl pl-3 pr-1 min-h-[40px] text-sm flex items-center gap-2">
                <strong className="text-text-primary">{b.date}</strong>
                {b.reason && <span className="text-text-secondary text-xs">{b.reason}</span>}
                <button
                  onClick={() => handleRemoveBlackout(b.date)}
                  className="w-9 h-9 flex items-center justify-center text-text-secondary"
                  aria-label={`Remove ${b.date}`}
                >
                  <Trash2 size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No days off scheduled.</p>
        )}
      </FormSection>

      {/* Preview — same generator the booking screen uses */}
      <FormSection
        title="What patients see"
        icon={Eye}
        description="Generated by the same engine as the booking screen. Save first to preview unsaved edits."
      >
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)}
            className={fieldClass}
            aria-label="Preview date"
          />
          <select
            value={previewMode} onChange={(e) => setPreviewMode(e.target.value)}
            className={fieldClass}
            aria-label="Consult type"
          >
            <option value="clinic">In-Clinic</option>
            <option value="video">Video</option>
            <option value="home">Home Visit</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
        <button
          onClick={runPreview}
          className="w-full h-12 rounded-xl bg-text-primary text-white text-sm font-bold flex items-center justify-center gap-2"
        >
          {previewing ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} Preview
        </button>

        {preview && (
          preview.slots.length ? (
            <div className="flex flex-wrap gap-2">
              {preview.slots.map((s) => (
                <span
                  key={s.time}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${
                    s.available
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-bg-secondary text-text-disabled border-border-light line-through'
                  }`}
                >
                  {s.time}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-primary bg-warning/10 border border-warning/25 rounded-xl px-3 py-2">
              No bookable slots on this date
              {preview.reason ? ` — ${String(preview.reason).replace(/_/g, ' ')}` : ''}.
            </p>
          )
        )}
      </FormSection>

      <StickyActionBar
        note={saved ? (
          <span className="text-success text-sm font-bold inline-flex items-center gap-1.5">
            <CheckCircle2 size={16} /> Saved
          </span>
        ) : null}
      >
        <PrimaryButton onClick={handleSave} disabled={saving} icon={saving ? undefined : Save} loading={saving}>
          {saving ? 'Saving…' : 'Save schedule'}
        </PrimaryButton>
      </StickyActionBar>
    </div>
  );
}

function NumberField({ label, suffix, value, min, max, onChange, hint }) {
  return (
    <div className="min-w-0">
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number" inputMode="numeric" min={min} max={max} value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-20 h-11 rounded-xl border border-border-light bg-white px-3 text-[16px] font-medium text-text-primary focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20"
        />
        <span className="text-sm text-text-secondary">{suffix}</span>
      </div>
      {hint && <p className="text-[11px] text-text-secondary mt-1">{hint}</p>}
    </div>
  );
}

export default ClinicScheduleView;
