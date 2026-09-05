import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Power, AlertTriangle } from 'lucide-react';
import { fetchVendorAvailability, setVendorAvailability } from '../../../services/vendor';
import { cn } from '../../user/utils/cn';

/**
 * The vendor's own open/closed switch, shown in every panel header.
 *
 * Offline hides the business from every customer-facing listing and turns away
 * new bookings and enquiries. It touches nothing that already exists —
 * confirmed bookings, conversations, payouts and history are all untouched —
 * so coming back is one tap and everything is exactly as it was.
 *
 * The control is a fixed box in every state. Both labels sit in a fixed-width
 * slot and every status icon in another, so nothing reflows when the state
 * changes: an explanation stacked underneath used to grow the header and shove
 * the switch itself down the moment it appeared, which made the control jump
 * under the cursor at exactly the moment the vendor was reading it.
 *
 * The explanation now lives in a transient note anchored below the control and
 * taken out of the layout flow, so it can never move anything. It shows on a
 * change or an error and then withdraws; the persistent signal that a business
 * is shut is the switch itself, red on every screen of the panel.
 */

const NOTE_MS = 4000;

export function VendorAvailabilityToggle({ className = '' }) {
  const [online, setOnline] = useState(null); // null until we know
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null); // { text, tone } | null
  const noteTimer = useRef(null);

  const flashNote = (text, tone) => {
    setNote({ text, tone });
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), NOTE_MS);
  };

  useEffect(() => {
    let cancelled = false;
    fetchVendorAvailability()
      .then((d) => {
        if (!cancelled) setOnline(d.online !== false);
      })
      .catch(() => {
        // Never claim "offline" because a request failed — that would read as a
        // state the vendor chose.
        if (!cancelled) setOnline(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(noteTimer.current);
    };
  }, []);

  const toggle = async () => {
    if (busy || online === null) return;
    const next = !online;
    setBusy(true);
    setNote(null);
    // Optimistic, then reconciled: the switch must feel immediate, but the
    // server's answer is what the listings actually obey.
    setOnline(next);
    try {
      const result = await setVendorAvailability(next);
      const isOnline = result.online !== false;
      setOnline(isOnline);
      flashNote(
        isOnline
          ? 'Back online — customers can find and book you again.'
          : 'Hidden from customers — no new bookings or enquiries.',
        isOnline ? 'ok' : 'warn'
      );
    } catch (err) {
      setOnline(!next);
      flashNote(err?.message || 'Could not change your status', 'error');
    } finally {
      setBusy(false);
    }
  };

  // Same footprint as the real control, so the header never resizes on load.
  if (online === null) {
    return <div className={cn('h-9 w-[8.5rem] rounded-full bg-slate-100 animate-pulse', className)} />;
  }

  return (
    <div className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={online}
        aria-label={online ? 'You are online. Go offline.' : 'You are offline. Go back online.'}
        title={
          online
            ? 'Visible to customers and accepting bookings. Click to go offline.'
            : 'Hidden from customers — no new bookings or enquiries. Click to go back online.'
        }
        className={cn(
          'h-9 w-[8.5rem] flex items-center gap-2 pl-3 pr-1.5 rounded-full border transition-colors cursor-pointer select-none',
          busy && 'cursor-wait',
          online
            ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/70'
            : 'bg-red-50 border-red-200 hover:bg-red-100/70'
        )}
      >
        {/* Fixed slot: a dot, a spinner and a warning glyph are all different
            widths, and letting them size themselves nudged the label. */}
        <span className="w-3.5 flex items-center justify-center shrink-0">
          {busy ? (
            <Loader2 size={13} className={cn('animate-spin', online ? 'text-emerald-600' : 'text-red-500')} />
          ) : online ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          ) : (
            <AlertTriangle size={13} strokeWidth={2.75} className="text-red-500" />
          )}
        </span>

        {/* Fixed slot: "Offline" is wider than "Online". */}
        <span
          className={cn(
            'w-[3.25rem] text-left text-[12.5px] font-black tracking-tight',
            online ? 'text-emerald-700' : 'text-red-700'
          )}
        >
          {online ? 'Online' : 'Offline'}
        </span>

        <span
          className={cn(
            'relative w-10 h-6 rounded-full transition-colors shrink-0 ml-auto',
            online ? 'bg-emerald-500' : 'bg-red-400'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 flex items-center justify-center',
              online ? 'left-[1.125rem]' : 'left-0.5'
            )}
          >
            <Power size={11} strokeWidth={3} className={online ? 'text-emerald-600' : 'text-red-500'} />
          </span>
        </span>
      </button>

      {/* Absolutely positioned and non-interactive: it floats over the page for
          a few seconds and is incapable of moving the control above it. */}
      {note && (
        <span
          role="status"
          className={cn(
            'absolute top-full right-0 mt-2 z-50 pointer-events-none whitespace-nowrap',
            'px-3 py-1.5 rounded-lg border text-[11px] font-bold shadow-sm',
            'animate-in fade-in slide-in-from-top-1 duration-200',
            note.tone === 'ok' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
            note.tone === 'warn' && 'bg-red-50 border-red-200 text-red-800',
            note.tone === 'error' && 'bg-amber-50 border-amber-300 text-amber-900'
          )}
        >
          {note.text}
        </span>
      )}
    </div>
  );
}

export default VendorAvailabilityToggle;
