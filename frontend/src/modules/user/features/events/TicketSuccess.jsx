import React from 'react';
import { CheckCircle, MapPin, Calendar, QrCode, Home, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function TicketSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { event, ticketCount, total } = location.state || {};

  if (!event) {
    return <div className="p-8 text-center">No ticket data found.</div>;
  }

  const isFree = event.price.toLowerCase() === 'free';

  const handleDownload = () => {
    const receiptContent = `
========================================
           E-TICKET CONFIRMED
========================================

Booking ID: #TC-8942

EVENT DETAILS
----------------------------------------
Event: ${event.title}
Date: ${event.day} ${event.month} 2026
Time: ${event.time}
Location: ${event.location}
Gate: Gate 4, Main Entry

TICKET DETAILS
----------------------------------------
Tickets: ${ticketCount} x General Admission
Total Paid: ${isFree ? 'Free' : '₹' + total}
Payment Status: SUCCESS

========================================
Please show this e-ticket at the entrance.
Thank you for booking with TailCircle!
========================================
    `;
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "TailCircle_Ticket_TC8942.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-primary-main absolute inset-0 z-[80] animate-in slide-in-from-bottom duration-500">
      
      {/* Header */}
      <div className="flex items-center px-4 py-4 sticky top-0 z-10 text-white">
        <button onClick={() => navigate('/app/home')} className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors">
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-6 pt-2 overflow-y-auto pb-32">
        
        {/* Success Icon */}
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-in zoom-in duration-500 delay-150">
          <CheckCircle size={48} className="text-primary-main" />
        </div>
        
        <h1 className="text-3xl font-black text-white text-center mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          Booking Confirmed!
        </h1>
        <p className="text-white/80 text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
          Your e-ticket has been generated.
        </p>

        {/* Ticket Card */}
        <div className="w-full shadow-2xl relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          
          {/* Top Half */}
          <div className="bg-white rounded-t-3xl overflow-hidden">
            {/* Ticket Header Image */}
            <div className="h-32 w-full relative">
              <img src={event.img} alt={event.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40"></div>
              <div className="absolute top-4 left-4 right-4">
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                  Admit {ticketCount}
                </span>
              </div>
            </div>

            {/* Ticket Details */}
            <div className="p-6 pb-4">
              <h2 className="text-xl font-bold text-text-primary mb-4 leading-tight">{event.title}</h2>
              
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-light/30 rounded-full flex items-center justify-center text-primary-dark">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-sm">{event.day} {event.month} 2026</p>
                    <p className="text-xs text-text-secondary">{event.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent-yellow/20 rounded-full flex items-center justify-center text-accent-yellow">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-sm">{event.location}</p>
                    <p className="text-xs text-text-secondary">Gate 4, Main Entry</p>
                  </div>
                </div>
              </div>

              <div className="bg-bg-secondary rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Total Paid</p>
                  <p className="font-black text-text-primary text-lg">{isFree ? 'Free' : `₹${total}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary mb-1">Booking ID</p>
                  <p className="font-bold text-text-primary">#TC-8942</p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider with Jagged Edges */}
          <div className="relative flex items-center bg-white h-8 overflow-hidden">
            {/* Left Cutout */}
            <div className="absolute -left-4 w-8 h-8 bg-primary-main rounded-full"></div>
            {/* Dashed Line */}
            <div className="w-full border-b-2 border-dashed border-border-light mx-6"></div>
            {/* Right Cutout */}
            <div className="absolute -right-4 w-8 h-8 bg-primary-main rounded-full"></div>
          </div>

          {/* Bottom Half (QR Code) */}
          <div className="bg-[#FAF7F2] rounded-b-3xl p-6 flex flex-col items-center justify-center">
            <div className="bg-white p-3 rounded-2xl shadow-sm mb-3">
              <QrCode size={80} className="text-text-primary" />
            </div>
            <p className="text-xs text-text-secondary text-center">
              Show this QR code at the entrance
            </p>
          </div>
          
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="absolute bottom-0 w-full bg-white border-t border-border-light p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] flex gap-4">
        <Button onClick={() => navigate('/app/home')} variant="outline" className="flex-1 h-14 rounded-full font-bold">
          <Home size={18} className="mr-2" /> Home
        </Button>
        <Button onClick={handleDownload} className="flex-1 h-14 rounded-full font-bold shadow-lg shadow-primary-main/30 active:scale-95 transition-transform">
          Save Ticket
        </Button>
      </div>

    </div>
  );
}
