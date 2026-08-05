import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, MapPin, QrCode, Ticket, Sparkles, CheckCircle2, Clock, X } from 'lucide-react';
import { api } from '../../../../services/api';

export function MyEventTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/events/my-tickets');
      setTickets(data || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-12 animate-in fade-in duration-300 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white sticky top-0 z-20 border-b border-gray-100/50 shadow-sm">
        <button onClick={() => navigate('/app/events')} className="p-1.5 -ml-1 text-gray-900 hover:bg-gray-50 rounded-full transition-colors cursor-pointer">
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-[17px] font-black text-gray-900 tracking-tight flex items-center gap-1.5">
          My Event Passes 🎟️
        </h1>
        <div className="w-8" />
      </div>

      <div className="px-5 pt-6 flex-1 max-w-xl mx-auto w-full">
        
        {loading ? (
          <div className="text-center py-12 text-gray-400 font-bold">Loading your event passes...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[26px] border border-gray-100/80 p-6 shadow-sm">
            <div className="w-16 h-16 bg-[#66B4B1]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#66B4B1]">
              <Ticket size={32} />
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1">No Event Passes Found</h3>
            <p className="text-xs text-gray-500 font-bold mb-5">You haven't booked any pet event passes yet.</p>
            <button
              onClick={() => navigate('/app/events')}
              className="px-5 py-3 bg-[#66B4B1] hover:bg-[#599D9A] text-white rounded-[16px] font-black text-xs shadow-md transition-all cursor-pointer"
            >
              Explore Upcoming Pet Events
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map(ticket => {
              const ev = ticket.eventId || {};
              const bookingNo = ticket.bookingNo || 'TC-EVT-PASS';
              const eventTitle = ev.title || 'Pet Meetup Event';
              const eventImg = ev.img || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=500&q=80';

              return (
                <div key={ticket._id} className="bg-white rounded-[24px] p-4 border border-gray-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                  <div className="flex gap-3.5 mb-3.5">
                    <img 
                      src={eventImg} 
                      alt={eventTitle}
                      className="w-20 h-20 rounded-[18px] object-cover shrink-0 bg-gray-50 border border-gray-100" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <h3 className="text-[15px] font-black text-gray-900 truncate">{eventTitle}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200/50 shrink-0">
                          {ticket.status || 'Confirmed'}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11.5px] text-gray-600 font-bold">
                        <p className="flex items-center gap-1"><Calendar size={12} className="text-[#66B4B1]" /> {ev.dateDay || ''} {ev.monthText || ''} • {ev.timeText || '10:00 AM'}</p>
                        <p className="flex items-center gap-1 truncate"><MapPin size={12} className="text-[#66B4B1]" /> {ev.location || 'Indore'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Booking Pass ID</p>
                      <p className="text-[12px] font-black text-gray-800 font-mono">{bookingNo}</p>
                    </div>

                    <button
                      onClick={() => setActiveTicket({ ...ticket, eventTitle, eventImg, bookingNo })}
                      className="px-4 py-2 bg-[#66B4B1] hover:bg-[#599D9A] text-white rounded-[14px] font-black text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <QrCode size={15} /> Show Pass QR
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Ticket Pass Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] p-6 max-w-xs w-full text-center relative shadow-2xl border border-gray-100">
            <button
              onClick={() => setActiveTicket(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="text-lg font-black text-gray-900 mb-1">{activeTicket.eventTitle}</h3>
            <p className="text-xs font-bold text-gray-500 mb-4">Official Entry Pass</p>

            {/* QR Mock graphic */}
            <div className="p-4 bg-gray-50 rounded-[20px] border border-gray-200/80 inline-block mb-4 shadow-inner">
              <div className="w-40 h-40 bg-white p-2 rounded-[14px] flex items-center justify-center border border-gray-200">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(activeTicket.bookingNo)}`} 
                  alt="Ticket QR Code"
                  className="w-full h-full object-contain" 
                />
              </div>
            </div>

            <p className="text-[11px] font-mono font-bold text-gray-600 bg-gray-100 py-1.5 px-3 rounded-full inline-block mb-2">
              Pass #{activeTicket.bookingNo}
            </p>
            <p className="text-[11px] font-bold text-gray-400">Present this QR code at the event check-in gate.</p>
          </div>
        </div>
      )}

    </div>
  );
}
