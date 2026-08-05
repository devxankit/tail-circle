import React, { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Clock, Info, CheckCircle2, Users, Share2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function EventDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isBooked, setIsBooked] = useState(false);
  
  // Get event data passed from the list, or show a fallback if accessed directly
  const event = location.state?.event || {
    title: 'Event Details',
    img: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80',
    month: 'Oct', day: '24', time: '10:00 AM', location: 'Central Park', price: 'Free',
    description: 'Join us for a fun-filled day with your furry friends! We will have agility courses, free treats, and networking opportunities for pet parents.'
  };

  const handleBooking = () => {
    // Generate a fallback ID if the event object doesn't have one
    const eventId = event.id || 'summer-fest';
    navigate(`/app/services/events/${eventId}/checkout`, { state: { event } });
  };

  return (
    <div className="flex flex-col h-full bg-white absolute inset-0 z-[60] animate-in slide-in-from-right duration-300">
      
      {/* Header Image & Back Button */}
      <div className="relative w-full h-64 shrink-0">
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-4 left-4 z-10 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm text-text-primary hover:bg-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <button 
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm text-text-primary hover:bg-white transition-colors"
        >
          <Share2 size={18} />
        </button>
        <img src={event.img} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4">
          <span className="bg-primary-main text-white text-xs font-bold px-2 py-1 rounded mb-2 inline-block shadow-sm">
            {event.price}
          </span>
          <h1 className="text-2xl font-black text-white leading-tight">{event.title}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Date & Time Row */}
        <div className="flex p-4 gap-4 border-b border-border-light">
          <div className="flex flex-1 items-center gap-3">
            <div className="w-12 h-12 bg-primary-light/30 text-primary-dark rounded-xl flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">{event.day} {event.month} 2026</p>
              <p className="text-xs text-text-secondary">{event.time}</p>
            </div>
          </div>
          <div className="w-px bg-border-light"></div>
          <div className="flex flex-1 items-center gap-3">
            <div className="w-12 h-12 bg-accent-yellow/20 text-accent-yellow rounded-xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">150+ Going</p>
              <p className="text-xs text-text-secondary">Join the pack</p>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="p-4 border-b border-border-light">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Location</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-bg-secondary rounded-full flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">{event.location}</p>
              <p className="text-xs text-text-secondary">View on map</p>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="p-4">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">About Event</h3>
          <p className="text-sm text-text-primary leading-relaxed">
            {event.description || `Get ready for an exciting time at the ${event.title}! This event is specially curated for pet parents to come together, share stories, and let their furry friends enjoy a fantastic day out. There will be fun games, expert veterinary advice sessions, and a bunch of free goodies from our sponsors.`}
          </p>
          
          <div className="mt-4 bg-bg-secondary p-3 rounded-xl flex items-start gap-3">
            <Info size={18} className="text-text-secondary shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              Please ensure your pets are vaccinated. Dogs must be kept on a leash unless inside the designated free-play zone.
            </p>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="absolute bottom-0 w-full bg-white border-t border-border-light p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
        <Button onClick={handleBooking} className="w-full h-14 rounded-full text-lg font-bold shadow-lg shadow-primary-main/30">
          Book Ticket Now
        </Button>
      </div>

    </div>
  );
}
