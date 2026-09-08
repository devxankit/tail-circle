import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader2, Check, AlertCircle } from 'lucide-react';
import { CitySelectorModal } from '../../modules/user/features/matches/CitySelectorModal';
import { detectLocation, toPlace } from '../../services/location';
import { cn } from '../../modules/user/utils/cn';

/**
 * Where this pet lives — asked once, the same way, everywhere it is asked.
 *
 * Both places that create a pet need this, and they need to agree: a location
 * chosen at onboarding and one chosen on the add-pet screen have to end up as
 * the same shape in the same field, or the deck measures distance from one and
 * not the other. So the control is shared rather than written twice.
 *
 * `autoDetect` runs the browser prompt on mount. Onboarding wants that (a new
 * user should not have to think about it); the add-pet screen does not, because
 * it already knows where the owner lives and asking again would be noise.
 */
export function LocationField({
  value,
  onChange,
  label = 'Location',
  hint = 'Used to show pets near you, and to show yours to them.',
  autoDetect = false,
  required = false,
  className,
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState('');
  // A denied permission prompt must not re-fire on every re-render.
  const hasAutoDetected = useRef(false);

  const place = toPlace(value);

  const detect = async () => {
    setIsDetecting(true);
    setError('');
    try {
      onChange(await detectLocation());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    if (!autoDetect || hasAutoDetected.current || place) return;
    hasAutoDetected.current = true;
    detect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDetect]);

  return (
    <div className={className}>
      <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
        {label}
        {required && <span className="text-[#F87B68] ml-0.5">*</span>}
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className={cn(
            'flex-1 flex items-center gap-2 px-3.5 py-3 rounded-2xl border text-left transition active:scale-[0.99]',
            place
              ? 'bg-[#EAF3F1] border-[#4C8684]/30'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          )}
        >
          <MapPin
            size={17}
            strokeWidth={2.5}
            className={cn('shrink-0', place ? 'text-[#4C8684]' : 'text-slate-400')}
          />
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                'block text-sm font-bold truncate',
                place ? 'text-slate-900' : 'text-slate-400'
              )}
            >
              {place ? place.name : 'Choose your location'}
            </span>
            {place?.state && (
              <span className="block text-[11px] font-bold text-slate-400 truncate">{place.state}</span>
            )}
          </span>
          {place && <Check size={16} strokeWidth={3} className="text-[#4C8684] shrink-0" />}
        </button>

        <button
          type="button"
          onClick={detect}
          disabled={isDetecting}
          title="Use my current location"
          className="w-12 shrink-0 rounded-2xl bg-[#4C8684] text-white flex items-center justify-center shadow-sm transition active:scale-95 disabled:opacity-60"
        >
          {isDetecting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Navigation size={18} strokeWidth={2.5} />
          )}
        </button>
      </div>

      {error ? (
        <p className="flex items-start gap-1.5 text-[11.5px] font-bold text-amber-700 mt-1.5 leading-snug">
          <AlertCircle size={13} className="shrink-0 mt-px" />
          <span>{error}</span>
        </p>
      ) : (
        <p className="text-[11px] font-medium text-slate-400 mt-1.5 leading-snug">{hint}</p>
      )}

      <CitySelectorModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        selectedCity={place}
        onSelectCity={(city) => {
          setError('');
          onChange(toPlace(city));
        }}
      />
    </div>
  );
}

export default LocationField;
