import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePetEvents } from '../context/PetEventsContext';
import { 
  Ticket, CheckCircle, XCircle,
  Calendar, User, QrCode, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';
import { PendingBookingRequests } from '../../components/PendingBookingRequests';
import {
  SearchBar, ListCard, StatusBadge, EmptyState, StickyActionBar, PrimaryButton, SectionLabel,
  Select, fieldClass, useSubScreen, useVendorToast,
} from '../../vendor/mobile';

const BOOKING_TONE = { Confirmed: 'success', Pending: 'warning', Cancelled: 'error', Completed: 'info', 'No-Show': 'neutral' };

export function BookingsView() {
  const { bookings, events, checkInBooking, scanTicket } = usePetEvents();

  /*
   * Gate check-in.
   *
   * The ticket QR carries a URL pointing here with `?ticket=<code>`, so a plain
   * phone camera lands on this screen with the pass already filled in and one
   * tap admits it. The same box takes a typed booking number for the times a
   * camera will not focus or a screen is cracked -- a gate that only works
   * when the scan works is not a gate.
   */
  const [scanParams, setScanParams] = useSearchParams();
  const [scanCode, setScanCode] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const scanInputRef = useRef(null);

  const runScan = async (code) => {
    const value = String(code || '').trim();
    if (!value || scanBusy) return;
    setScanBusy(true);
    setScanError('');
    setScanResult(null);
    try {
      setScanResult(await scanTicket(value));
      setScanCode('');
    } catch (err) {
      setScanError(err?.message || 'Could not read that ticket');
    } finally {
      setScanBusy(false);
    }
  };

  // A code arriving in the URL is consumed once and cleared, so a refresh or a
  // back-navigation does not silently re-admit the same pass.
  const urlTicket = scanParams.get('ticket');
  useEffect(() => {
    if (!urlTicket) return;
    runScan(urlTicket);
    scanParams.delete('ticket');
    setScanParams(scanParams, { replace: true });
  }, [urlTicket]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEvent, setFilterEvent] = useState('All');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const { addToast } = useVendorToast();

  // The right-hand drawer becomes its own screen; Back returns to the list.
  useSubScreen(selectedBooking ? { title: `Booking ${selectedBooking.id}`, onBack: () => setSelectedBooking(null) } : null);

  const filteredBookings = bookings.filter(b => {
    const matchSearch = b.customer.toLowerCase().includes(searchQuery.toLowerCase()) || b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchEvent = filterEvent === 'All' || b.event === filterEvent;
    return matchSearch && matchEvent;
  });

  const handleAction = async (id, action) => {
    if (action === 'checkin') {
      try {
        await checkInBooking(id);
      } catch (err) {
        addToast({ message: err?.message || 'Could not check in this booking', type: 'error' });
      }
    }
  };

  /* ── Booking detail ── */
  if (selectedBooking) {
    return (
      <div className="space-y-4">
        <PendingBookingRequests compact />

        <div className="flex justify-end px-1">
          <StatusBadge label={selectedBooking.status} tone={BOOKING_TONE[selectedBooking.status] || 'neutral'} />
        </div>

        {/* Was a lucide glyph pretending to be this attendee's pass. The
            organiser never needs to display a ticket -- they need to
            admit one, which is what the scanner on the list screen does. */}
        <div className="bg-white rounded-[24px] p-6 flex flex-col items-center justify-center border border-border-light shadow-sm text-center">
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mb-4',
              selectedBooking.checkedIn ? 'bg-success/10 text-success' : 'bg-bg-primary border border-border-light text-text-secondary'
            )}
          >
            {selectedBooking.checkedIn ? <CheckCircle size={32} /> : <QrCode size={32} />}
          </div>
          {selectedBooking.checkedIn ? (
            <div className="flex items-center gap-2 text-success bg-success/10 px-4 py-2 rounded-xl border border-success/20">
              <CheckCircle size={18} />
              <span className="text-sm font-bold">Successfully Checked In</span>
            </div>
          ) : selectedBooking.status === 'Cancelled' ? (
            <div className="text-sm font-bold text-error bg-error/10 px-4 py-2 rounded-xl border border-error/20">Ticket Cancelled</div>
          ) : (
            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Awaiting Scan</p>
          )}
        </div>

        {/* Event Details */}
        <div>
          <SectionLabel>Event Info</SectionLabel>
          <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4 flex gap-3">
            <div className="w-10 h-10 bg-primary-light/30 rounded-xl flex items-center justify-center text-primary-main shrink-0"><Calendar size={18}/></div>
            <div>
              <p className="text-sm font-black text-text-primary">{selectedBooking.event}</p>
              <p className="text-xs font-bold text-text-secondary mt-0.5">{selectedBooking.date}</p>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div>
          <SectionLabel>Attendee Info</SectionLabel>
          <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-accent-teal/10 rounded-xl flex items-center justify-center text-[#4C8684] shrink-0"><User size={18}/></div>
              <div>
                <p className="text-sm font-black text-text-primary">{selectedBooking.customer}</p>
                <p className="text-xs font-bold text-text-secondary mt-0.5">Pet: {selectedBooking.pet}</p>
              </div>
            </div>

            {/* What the organiser has to actually do on the day. */}
            {(selectedBooking.withTrainer || selectedBooking.reactivePet) && (
              <div
                className={cn(
                  'mt-4 flex items-start gap-2.5 p-3.5 rounded-2xl border',
                  selectedBooking.withTrainer
                    ? 'bg-accent-teal/10 border-accent-teal/25'
                    : 'bg-warning/10 border-warning/25'
                )}
              >
                {selectedBooking.withTrainer ? (
                  <ShieldCheck size={16} className="text-[#4C8684] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                )}
                <p className="text-xs font-semibold leading-relaxed text-text-primary">
                  {selectedBooking.withTrainer
                    ? 'This booking has paid for handler support. Please have a trainer on site for this pet.'
                    : 'This pet is marked reactive and no handler was booked.'}
                  {selectedBooking.reactivePet && (
                    <span className="block mt-1 font-bold">
                      Owner-declared: {selectedBooking.reactivePet.join(', ')}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Receipt */}
        <div>
          <SectionLabel>Payment Receipt</SectionLabel>
          <div className="bg-white p-4 rounded-[20px] border border-border-light shadow-sm space-y-3">
            <div className="flex justify-between text-sm font-semibold text-text-primary gap-3">
              <span>Base Ticket (x{selectedBooking.tickets})</span>
              <span>
                ₹{(selectedBooking.ticketAmount ?? selectedBooking.amount).toLocaleString()}
              </span>
            </div>
            {selectedBooking.withTrainer && (
              <div className="flex justify-between text-sm font-semibold text-text-primary gap-3">
                <span>Trainer / handler support</span>
                <span>
                  {selectedBooking.trainerFee > 0
                    ? `₹${selectedBooking.trainerFee.toLocaleString()}`
                    : 'Included'}
                </span>
              </div>
            )}
            {selectedBooking.addOns.map((addon, i) => (
              <div key={i} className="flex justify-between text-sm font-semibold text-text-primary gap-3">
                <span>Add-on: {addon}</span>
                <span>Included</span>
              </div>
            ))}
            <div className="h-px bg-border-light my-2"></div>
            <div className="flex justify-between text-base font-black text-text-primary">
              <span>Total Paid</span>
              <span>₹{selectedBooking.amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {!selectedBooking.checkedIn && selectedBooking.status === 'Confirmed' && (
          <StickyActionBar>
            <PrimaryButton onClick={() => handleAction(selectedBooking.id, 'checkin')} icon={CheckCircle}>
              Mark as Attended (Check In)
            </PrimaryButton>
          </StickyActionBar>
        )}
      </div>
    );
  }

  /* ── Booking list ── */
  return (
    <div className="space-y-4">
      <PendingBookingRequests compact />

      <div className="px-1">
        <h2 className="text-lg font-bold text-text-primary leading-tight">Booking Management</h2>
        <p className="text-xs text-text-secondary mt-1">Track ticket sales and attendee check-ins.</p>
      </div>

      {/* ── Gate check-in ── */}
      <div className="bg-white rounded-[20px] border border-border-light shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <QrCode size={18} className="text-primary-main" />
          <h3 className="text-sm font-black text-text-primary">Check in a ticket</h3>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runScan(scanCode);
          }}
          className="flex gap-2"
        >
          <input
            ref={scanInputRef}
            type="text"
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            placeholder="Scan the pass QR, or type a booking number"
            autoComplete="off"
            className={cn(fieldClass, 'flex-1 min-w-0')}
          />
          <button
            type="submit"
            disabled={scanBusy || !scanCode.trim()}
            className="h-12 px-5 bg-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition shadow-sm cursor-pointer shrink-0"
          >
            {scanBusy ? 'Checking…' : 'Admit'}
          </button>
        </form>

        {scanError && (
          <div className="mt-3 flex items-start gap-2.5 p-3.5 rounded-xl bg-error/5 border border-error/20">
            <XCircle size={16} className="text-error shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-error">{scanError}</p>
          </div>
        )}

        {scanResult && (
          <div
            className={cn(
              'mt-3 flex items-start gap-2.5 p-3.5 rounded-xl border',
              scanResult.alreadyCheckedIn
                ? 'bg-warning/10 border-warning/25'
                : 'bg-success/10 border-success/25'
            )}
          >
            {scanResult.alreadyCheckedIn ? (
              <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
            ) : (
              <CheckCircle size={16} className="text-success shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-black text-text-primary">
                {/* Staff need to know a repeat scan is a repeat, not a fresh
                    admission -- that is the difference between one guest and
                    a pass being reused. */}
                {scanResult.alreadyCheckedIn ? 'Already checked in' : 'Admitted'}
                {' — '}
                {scanResult.customer}
                {scanResult.pet ? ` (${scanResult.pet})` : ''}
              </p>
              <p className="text-xs font-semibold text-text-secondary mt-0.5">
                {scanResult.event} · {scanResult.tickets} ticket
                {scanResult.tickets === 1 ? '' : 's'} · {scanResult.bookingNo}
              </p>
              {scanResult.withTrainer && (
                <p className="text-xs font-black text-[#4C8684] mt-1 flex items-center gap-1">
                  <ShieldCheck size={13} strokeWidth={3} /> Handler paid for — a trainer is expected
                </p>
              )}
              {scanResult.reactivePet && !scanResult.withTrainer && (
                <p className="text-xs font-black text-warning mt-1 flex items-center gap-1">
                  <AlertTriangle size={13} strokeWidth={3} /> Marked{' '}
                  {scanResult.reactivePet.join(', ').toLowerCase()} — no handler booked
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search ID or Customer..." />
      <Select value={filterEvent} onChange={setFilterEvent}>
        <option value="All">All Events</option>
        {events.map(e => <option key={e.id} value={e.title}>{e.title}</option>)}
      </Select>

      {filteredBookings.length > 0 ? (
        <div className="space-y-3">
          {filteredBookings.map(b => (
            <ListCard
              key={b.id}
              title={b.customer}
              subtitle={`${b.id} · ${b.pet}`}
              badge={<StatusBadge label={b.status} tone={BOOKING_TONE[b.status] || 'neutral'} />}
              amount={`₹${b.amount.toLocaleString()}`}
              amountHint={<span className={cn('font-black uppercase', b.payment === 'Paid' ? 'text-success' : b.payment === 'Refunded' ? 'text-text-secondary' : 'text-warning')}>{b.payment}</span>}
              onClick={() => setSelectedBooking(b)}
              meta={[
                { label: 'Event', value: <>{b.event}<span className="block text-[10px] font-bold text-text-secondary uppercase mt-0.5">{b.date}</span></> },
                { label: 'Tickets', value: b.tickets },
              ]}
            >
              {(b.withTrainer || b.reactivePet) && (
                <div className="flex flex-wrap gap-1">
                  {b.withTrainer && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-teal/10 border border-accent-teal/25 text-[10px] font-black uppercase tracking-wide text-[#4C8684]">
                      <ShieldCheck size={11} strokeWidth={3} /> Trainer paid
                    </span>
                  )}
                  {b.reactivePet && !b.withTrainer && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 border border-warning/25 text-[10px] font-black uppercase tracking-wide text-warning">
                      <AlertTriangle size={11} strokeWidth={3} /> Reactive, no trainer
                    </span>
                  )}
                </div>
              )}
            </ListCard>
          ))}
        </div>
      ) : (
        <EmptyState icon={Ticket} text="No bookings found." />
      )}
    </div>
  );
}
