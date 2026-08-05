import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar, MapPin, Loader2, Video, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../../../services/api';
import { payWithRazorpay } from '../../../../../services/payments';

const TYPE_LABEL = {
  daycare: 'Daycare',
  grooming: 'Grooming',
  doctor: 'Vet Appointment',
  event: 'Event Tickets',
  memorial: 'Memorial Support',
};

const STATUS_STYLES = {
  Upcoming: 'bg-primary-main/10 text-primary-dark',
  Completed: 'bg-success/10 text-success',
  'Payment due': 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-500',
};

/** Human status. `pending_overage` is an unpaid balance, NOT a cancellation. */
function displayStatus(status) {
  if (['pending_payment', 'confirmed', 'in_progress'].includes(status)) return 'Upcoming';
  if (status === 'pending_overage') return 'Payment due';
  if (status === 'completed') return 'Completed';
  return 'Cancelled';
}

function toDisplayBooking(b) {
  const venue = b.providerId?.name || b.doctorId?.clinic || b.eventId?.location || 'TailCircle';
  const title =
    b.type === 'doctor' && b.doctorId?.name
      ? `Vet: ${b.doctorId.name}`
      : b.type === 'event' && b.eventId?.title
        ? b.eventId.title
        : `${TYPE_LABEL[b.type] || 'Booking'}${b.providerId?.name ? ` — ${b.providerId.name}` : ''}`;

  const isVideo = b.type === 'doctor' && ['video', 'instant_video', 'instant'].includes(b.visitType);

  return {
    id: b._id,
    bookingNo: b.bookingNo,
    type: title,
    pet: b.petSnapshot?.name || b.meta?.petName || b.meta?.contact?.petName || '—',
    date: b.schedule?.startDate
      ? new Date(b.schedule.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: b.schedule?.time || (b.visitType === 'instant_video' ? 'Instant Call' : b.eventId?.timeText || ''),
    status: displayStatus(b.status),
    rawStatus: b.status,
    clinic: venue,
    fee: `₹${(((b.amounts?.base || 0) + (b.amounts?.addons || 0)) / 100).toFixed(2)}`,
    tax: `₹${((b.amounts?.tax || 0) / 100).toFixed(2)}`,
    total: `₹${((b.amounts?.total || 0) / 100).toFixed(2)}`,
    isVideoConsult: isVideo,
    startAt: b.schedule?.startAt ? new Date(b.schedule.startAt) : null,
    durationMinutes: b.consult?.durationMinutes || 15,
    raw: b,
  };
}

/**
 * Is the consultation room open? Mirrors the server's join window
 * (CONSULT_JOIN_LEAD_MINUTES before → duration + grace after). The server is
 * authoritative; this only decides whether to show the button.
 */
function isJoinable(b) {
  if (!b.isVideoConsult) return false;
  if (!['confirmed', 'in_progress', 'pending_overage'].includes(b.rawStatus)) return false;
  if (!b.startAt) return true;
  const now = Date.now();
  const opens = b.startAt.getTime() - 15 * 60_000;
  const closes = b.startAt.getTime() + (b.durationMinutes + 60) * 60_000;
  return now >= opens && now <= closes;
}

export function BookingHistory() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [error, setError] = useState('');

  const load = () =>
    api
      .get('/bookings')
      .then(({ data }) => setBookings(data.map(toDisplayBooking)))
      .catch(() => setBookings([]))
      .finally(() => setIsLoading(false));

  useEffect(() => { load(); }, []);

  /** Settle the outstanding extra-time invoice for a video consult. */
  const handlePayOverage = async (bookingId) => {
    setPaying(bookingId);
    setError('');
    try {
      const { data } = await api.post('/payments/create-order', {
        purpose: 'consult_overage',
        payload: { bookingId },
      });
      await payWithRazorpay(data, { description: 'Extra consultation time' });
      await load();
    } catch (e) {
      setError(e.message || 'Payment failed, please try again');
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary animate-in slide-in-from-right-4 duration-300">
      <div className="bg-white px-4 pt-6 pb-4 flex items-center shadow-sm border-b border-border-light z-10 sticky top-0">
        <button onClick={() => navigate('/app/profile')} className="p-2 -ml-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-text-primary ml-2 flex-1">Booking History</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {error && (
          <p className="text-center text-xs font-bold text-red-500 mb-3">{error}</p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16 text-primary-main">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar size={40} className="text-text-disabled mb-3" />
            <p className="font-bold text-text-primary">No bookings yet</p>
            <p className="text-sm text-text-secondary mt-1">Your service bookings will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((booking) => {
              const joinable = isJoinable(booking);
              const owesOverage = booking.rawStatus === 'pending_overage';

              return (
                <div
                  key={booking.id}
                  className="bg-white p-4 rounded-[20px] shadow-sm border border-border-light flex flex-col gap-3 transition-all"
                >
                  <div
                    onClick={() => navigate(`/app/profile/bookings/${booking.id}`, { state: { booking } })}
                    className="flex flex-col gap-3 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-text-primary">{booking.type}</h3>
                        <p className="text-sm font-medium text-text-secondary">For {booking.pet}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${STATUS_STYLES[booking.status]}`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-text-secondary gap-4">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} /> {booking.date} • {booking.time}
                      </div>
                      {booking.isVideoConsult && (
                        <span className="flex items-center gap-1 text-accent-teal font-bold">
                          <Video size={13} /> Video
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-text-secondary gap-1">
                      <MapPin size={14} /> {booking.clinic}
                    </div>
                  </div>

                  {/* Join the consultation room — the only way in from the app. */}
                  {joinable && (
                    <button
                      onClick={() => navigate(`/app/consult/${booking.id}`)}
                      className="w-full h-11 rounded-xl bg-accent-teal text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition"
                    >
                      <Video size={16} /> Join video consultation
                    </button>
                  )}

                  {/* Outstanding extra-time invoice. */}
                  {owesOverage && (
                    <button
                      onClick={() => handlePayOverage(booking.id)}
                      disabled={paying === booking.id}
                      className="w-full h-11 rounded-xl bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {paying === booking.id
                        ? <Loader2 size={16} className="animate-spin" />
                        : <IndianRupee size={15} />}
                      {paying === booking.id ? 'Opening payment…' : 'Pay for extra consultation time'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
