import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePetEvents } from '../context/PetEventsContext';
import { 
  Ticket, Search, Filter, CheckCircle, XCircle, 
  ChevronRight, Calendar, User, IndianRupee, QrCode, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { cn } from '../../../user/utils/cn';

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
        alert(err?.message || 'Could not check in this booking');
      }
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Confirmed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'Completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'No-Show': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 flex relative h-full">
      
      {/* Main Content */}
      <div className={cn("flex-1 transition-all duration-300", selectedBooking ? "mr-[400px]" : "")}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Booking Management</h2>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">Track ticket sales and attendee check-ins.</p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <select 
              value={filterEvent} 
              onChange={e => setFilterEvent(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="All">All Events</option>
              {events.map(e => <option key={e.id} value={e.title}>{e.title}</option>)}
            </select>
            <div className="relative flex-1 sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search ID or Customer..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>
        </div>

        {/* ── Gate check-in ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <QrCode size={18} className="text-[#F87B68]" />
            <h3 className="text-sm font-black text-slate-900">Check in a ticket</h3>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runScan(scanCode);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              ref={scanInputRef}
              type="text"
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              placeholder="Scan the pass QR, or type a booking number"
              autoComplete="off"
              className="flex-1 px-5 py-3 text-sm border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={scanBusy || !scanCode.trim()}
              className="px-6 py-3 bg-slate-900 hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              {scanBusy ? 'Checking…' : 'Admit'}
            </button>
          </form>

          {scanError && (
            <div className="mt-3 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200">
              <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-700">{scanError}</p>
            </div>
          )}

          {scanResult && (
            <div
              className={cn(
                'mt-3 flex items-start gap-2.5 p-3.5 rounded-xl border',
                scanResult.alreadyCheckedIn
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              )}
            >
              {scanResult.alreadyCheckedIn ? (
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-black',
                    scanResult.alreadyCheckedIn ? 'text-amber-800' : 'text-emerald-800'
                  )}
                >
                  {/* Staff need to know a repeat scan is a repeat, not a fresh
                      admission -- that is the difference between one guest and
                      a pass being reused. */}
                  {scanResult.alreadyCheckedIn ? 'Already checked in' : 'Admitted'}
                  {' — '}
                  {scanResult.customer}
                  {scanResult.pet ? ` (${scanResult.pet})` : ''}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  {scanResult.event} · {scanResult.tickets} ticket
                  {scanResult.tickets === 1 ? '' : 's'} · {scanResult.bookingNo}
                </p>
                {scanResult.withTrainer && (
                  <p className="text-xs font-black text-teal-700 mt-1 flex items-center gap-1">
                    <ShieldCheck size={13} strokeWidth={3} /> Handler paid for — a trainer is expected
                  </p>
                )}
                {scanResult.reactivePet && !scanResult.withTrainer && (
                  <p className="text-xs font-black text-amber-700 mt-1 flex items-center gap-1">
                    <AlertTriangle size={13} strokeWidth={3} /> Marked{' '}
                    {scanResult.reactivePet.join(', ').toLowerCase()} — no handler booked
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Booking ID</th>
                  <th className="p-4">Customer & Pet</th>
                  <th className="p-4">Event</th>
                  <th className="p-4 text-center">Tickets</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredBookings.length > 0 ? filteredBookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition cursor-pointer" onClick={() => setSelectedBooking(b)}>
                    <td className="p-4 text-sm font-bold text-slate-900">{b.id}</td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-slate-800">{b.customer}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{b.pet}</p>
                      {(b.withTrainer || b.reactivePet) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {b.withTrainer && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[9.5px] font-black uppercase tracking-wide text-teal-700">
                              <ShieldCheck size={10} strokeWidth={3} /> Trainer paid
                            </span>
                          )}
                          {b.reactivePet && !b.withTrainer && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[9.5px] font-black uppercase tracking-wide text-amber-700">
                              <AlertTriangle size={10} strokeWidth={3} /> Reactive, no trainer
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-slate-700">{b.event}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{b.date}</p>
                    </td>
                    <td className="p-4 text-center text-sm font-black text-slate-900">{b.tickets}</td>
                    <td className="p-4 text-right">
                      <p className="text-sm font-black text-slate-900">₹{b.amount.toLocaleString()}</p>
                      <p className={cn("text-[10px] font-black uppercase mt-0.5", b.payment === 'Paid' ? 'text-emerald-500' : b.payment === 'Refunded' ? 'text-slate-400' : 'text-orange-500')}>{b.payment}</p>
                    </td>
                    <td className="p-4">
                      <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border", getStatusColor(b.status))}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center mx-auto text-slate-600 transition">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-500 text-sm font-bold">
                      No bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Drawer (Fixed Right Side) */}
      <div className={cn(
        "fixed top-20 right-0 bottom-0 w-[400px] bg-white border-l border-slate-100 shadow-2xl z-40 transform transition-transform duration-300 overflow-y-auto flex flex-col",
        selectedBooking ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedBooking && (
          <>
            <div className="p-6 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur z-10 shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900">Booking {selectedBooking.id}</h3>
                <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border mt-1 inline-block", getStatusColor(selectedBooking.status))}>
                  {selectedBooking.status}
                </span>
              </div>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 custom-scrollbar">
              
              {/* Was a lucide glyph pretending to be this attendee's pass. The
                  organiser never needs to display a ticket -- they need to
                  admit one, which is what the scanner at the top of this screen
                  does. */}
              <div className="bg-slate-50 rounded-3xl p-6 flex flex-col items-center justify-center border border-slate-100 text-center">
                <div
                  className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center mb-4',
                    selectedBooking.checkedIn ? 'bg-emerald-100 text-emerald-600' : 'bg-white border border-slate-200 text-slate-400'
                  )}
                >
                  {selectedBooking.checkedIn ? <CheckCircle size={32} /> : <QrCode size={32} />}
                </div>
                {selectedBooking.checkedIn ? (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
                    <CheckCircle size={18} />
                    <span className="text-sm font-bold">Successfully Checked In</span>
                  </div>
                ) : selectedBooking.status === 'Cancelled' ? (
                  <div className="text-sm font-bold text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">Ticket Cancelled</div>
                ) : (
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Awaiting Scan</p>
                )}
              </div>

              {/* Event Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Event Info</h4>
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 shrink-0"><Calendar size={18}/></div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{selectedBooking.event}</p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">{selectedBooking.date}</p>
                  </div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Attendee Info</h4>
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0"><User size={18}/></div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{selectedBooking.customer}</p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">Pet: {selectedBooking.pet}</p>
                  </div>
                </div>

                {/* What the organiser has to actually do on the day. */}
                {(selectedBooking.withTrainer || selectedBooking.reactivePet) && (
                  <div
                    className={cn(
                      'mt-4 flex items-start gap-2.5 p-3.5 rounded-2xl border',
                      selectedBooking.withTrainer
                        ? 'bg-teal-50 border-teal-200'
                        : 'bg-amber-50 border-amber-200'
                    )}
                  >
                    {selectedBooking.withTrainer ? (
                      <ShieldCheck size={16} className="text-teal-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <p
                      className={cn(
                        'text-xs font-semibold leading-relaxed',
                        selectedBooking.withTrainer ? 'text-teal-800' : 'text-amber-800'
                      )}
                    >
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

              {/* Receipt */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Payment Receipt</h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm font-semibold text-slate-600">
                    <span>Base Ticket (x{selectedBooking.tickets})</span>
                    <span>
                      ₹{(selectedBooking.ticketAmount ?? selectedBooking.amount).toLocaleString()}
                    </span>
                  </div>
                  {selectedBooking.withTrainer && (
                    <div className="flex justify-between text-sm font-semibold text-slate-600">
                      <span>Trainer / handler support</span>
                      <span>
                        {selectedBooking.trainerFee > 0
                          ? `₹${selectedBooking.trainerFee.toLocaleString()}`
                          : 'Included'}
                      </span>
                    </div>
                  )}
                  {selectedBooking.addOns.map((addon, i) => (
                    <div key={i} className="flex justify-between text-sm font-semibold text-slate-600">
                      <span>Add-on: {addon}</span>
                      <span>Included</span>
                    </div>
                  ))}
                  <div className="h-px bg-slate-200 my-2"></div>
                  <div className="flex justify-between text-base font-black text-slate-900">
                    <span>Total Paid</span>
                    <span>₹{selectedBooking.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 space-y-3">
              {!selectedBooking.checkedIn && selectedBooking.status === 'Confirmed' && (
                <button
                  onClick={() => handleAction(selectedBooking.id, 'checkin')}
                  className="w-full py-3 bg-[#F87B68] hover:bg-[#F87B68] text-white text-sm font-bold rounded-xl transition shadow-lg cursor-pointer"
                >
                  Mark as Attended (Check In)
                </button>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
