import React from 'react';
import { ArrowLeft, Calendar, MapPin, Clock, FileText, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';

export function BookingDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { booking } = location.state || {};

  if (!booking) {
    return <div className="p-8 text-center text-text-secondary">Booking details not found.</div>;
  }

  const isUpcoming = booking.status === 'Upcoming';

  return (
    <div className="flex flex-col h-full bg-bg-secondary absolute inset-0 z-[70] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-4 flex items-center shadow-sm border-b border-border-light sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary transition-colors text-text-primary">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-text-primary ml-2">Booking Details</h1>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
        {/* Status Banner */}
        <div className={`p-4 text-center border-b border-border-light ${isUpcoming ? 'bg-primary-light/20 text-primary-dark' : 'bg-success/10 text-success'}`}>
          <p className="font-bold uppercase tracking-widest text-sm">{booking.status}</p>
        </div>

        <div className="p-4 space-y-4">
          
          {/* Main Info Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border-light">
            <h2 className="text-xl font-bold text-text-primary mb-1">{booking.type}</h2>
            <p className="text-sm font-medium text-text-secondary flex items-center gap-2 mb-6">
              <User size={16} /> For {booking.pet}
            </p>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-light/20 rounded-full flex items-center justify-center text-primary-main">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Date</p>
                  <p className="font-bold text-text-primary text-sm">{booking.date}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-yellow/20 rounded-full flex items-center justify-center text-accent-yellow">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Time</p>
                  <p className="font-bold text-text-primary text-sm">{booking.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-bg-secondary rounded-full flex items-center justify-center text-text-secondary">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Location</p>
                  <p className="font-bold text-text-primary text-sm">{booking.clinic}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border-light">
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <FileText size={18} className="text-primary-main" /> Payment Details
            </h3>
            <div className="flex justify-between mb-2">
              <span className="text-text-secondary">Service Fee</span>
              <span className="font-medium text-text-primary">{booking.fee || '₹499.00'}</span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-text-secondary">Tax & Platform Fees</span>
              <span className="font-medium text-text-primary">{booking.tax || '₹29.00'}</span>
            </div>
            <div className="border-t border-border-light pt-4 flex justify-between">
              <span className="font-bold text-text-primary">Total Paid</span>
              <span className="font-black text-primary-main">{booking.total || '₹528.00'}</span>
            </div>
          </div>

          {/* Action Area */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border-light text-center">
            <h3 className="font-bold text-text-primary mb-2">Need help?</h3>
            <p className="text-sm text-text-secondary mb-4">If you have any issues with this booking, please contact support.</p>
            <Button variant="outline" className="w-full font-bold">Contact Support</Button>
          </div>

        </div>
      </div>

      {/* Conditional Bottom Bar (e.g. Cancel Booking if upcoming) */}
      {isUpcoming && (
        <div className="absolute bottom-0 w-full bg-white border-t border-border-light p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
           <Button variant="outline" className="w-full text-error border-error hover:bg-error/10 hover:text-error h-12 rounded-full font-bold">
            Cancel Booking
          </Button>
        </div>
      )}
    </div>
  );
}
