import React from 'react';
import { CheckCircle, MapPin, Calendar as CalendarIcon, Clock, Home, ArrowLeft, Download } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function DoctorSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { doctor, appointmentDate, appointmentTime, total } = location.state || {};

  if (!doctor) {
    return <div className="p-8 text-center">Booking data not found.</div>;
  }

  const handleDownload = () => {
    const receiptContent = `
========================================
       APPOINTMENT CONFIRMED
========================================

Booking ID: #APT-9821

DOCTOR DETAILS
----------------------------------------
Name: ${doctor.name}
Specialty: ${doctor.spec}
Clinic: ${doctor.clinic || 'PetCare Central Clinic'}

APPOINTMENT SCHEDULE
----------------------------------------
Date: ${appointmentDate}
Time: ${appointmentTime}

PAYMENT DETAILS
----------------------------------------
Total Paid: ₹${total}
Payment Status: SUCCESS

========================================
Thank you for booking with TailCircle!
========================================
    `;
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "TailCircle_Receipt_APT9821.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-accent-teal absolute inset-0 z-[80] animate-in slide-in-from-bottom duration-500">
      
      {/* Header */}
      <div className="flex items-center px-4 py-4 sticky top-0 z-10 text-white">
        <button onClick={() => navigate('/app/home')} className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <span className="font-bold ml-2">Appointment Confirmed</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto pb-32">
        
        {/* Success Icon */}
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-in zoom-in duration-500 delay-150">
          <CheckCircle size={40} className="text-accent-teal" />
        </div>
        
        <h1 className="text-2xl font-black text-white text-center mb-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          Booking Successful!
        </h1>
        <p className="text-white/80 text-sm text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
          Your appointment has been confirmed.
        </p>

        {/* Appointment Card */}
        <div className="w-full bg-white rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          
          <div className="p-6 pb-6 border-b border-border-light border-dashed">
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Doctor Details</h2>
            <div className="flex gap-4 items-center">
              <img src={doctor.img} alt={doctor.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm shrink-0" />
              <div className="flex flex-col">
                <h3 className="font-bold text-text-primary text-lg">{doctor.name}</h3>
                <p className="text-sm font-medium text-text-secondary">{doctor.spec}</p>
              </div>
            </div>
          </div>

          <div className="p-6 pb-8">
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Appointment Schedule</h2>
            
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-light/30 rounded-full flex items-center justify-center text-primary-dark">
                  <CalendarIcon size={18} />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Date</p>
                  <p className="font-bold text-text-primary text-sm">{appointmentDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-yellow/20 rounded-full flex items-center justify-center text-accent-yellow">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Time</p>
                  <p className="font-bold text-text-primary text-sm">{appointmentTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-bg-secondary rounded-full flex items-center justify-center text-text-secondary">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Location</p>
                  <p className="font-bold text-text-primary text-sm">{doctor.clinic || 'PetCare Central Clinic'}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#FAF7F2] rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-text-secondary mb-1">Total Paid</p>
                <p className="font-black text-text-primary text-lg">₹{total}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-secondary mb-1">Booking ID</p>
                <p className="font-bold text-text-primary">#APT-9821</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="absolute bottom-0 w-full bg-white border-t border-border-light p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] flex gap-4">
        <Button onClick={() => navigate('/app/home')} variant="outline" className="flex-1 h-14 rounded-full font-bold">
          <Home size={18} className="mr-2" /> Home
        </Button>
        <Button onClick={handleDownload} className="flex-1 h-14 rounded-full font-bold shadow-lg shadow-accent-teal/30 bg-accent-teal hover:bg-accent-teal/90 text-white active:scale-95 transition-transform">
          <Download size={18} className="mr-2" /> Download
        </Button>
      </div>

    </div>
  );
}
