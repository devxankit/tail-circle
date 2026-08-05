import React, { useState } from 'react';
import { ArrowLeft, Star, Clock, MapPin, Award, Users, MessageSquare, Phone, Video } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function DoctorDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const doctor = location.state?.doctor || {
    id: 'dr-sarah',
    name: 'Dr. Sarah Jenkins',
    spec: 'General Vet',
    exp: '10 yrs',
    rating: 4.9,
    img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    online: true,
    patients: '1.5k+',
    reviews: '420',
    about: 'Dr. Sarah Jenkins is a highly experienced General Veterinarian with over 10 years of expertise in treating domestic pets. She specializes in preventive care, vaccinations, and nutritional advice for dogs and cats.',
    clinic: 'PetCare Central Clinic',
    address: '123 Avenue, New York',
    consultFee: '₹499'
  };

  return (
    <div className="flex flex-col h-full bg-white absolute inset-0 z-[60] animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b border-border-light sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-bg-secondary transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-text-primary ml-2">Doctor Details</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Profile Info */}
        <div className="p-6 flex gap-5 border-b border-border-light">
          <div className="relative shrink-0">
            <img src={doctor.img} alt={doctor.name} className="w-28 h-28 rounded-2xl object-cover shadow-sm" />
            {doctor.online && <div className="absolute -bottom-2 -right-2 bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white">ONLINE</div>}
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-xl font-bold text-text-primary leading-tight mb-1">{doctor.name}</h2>
            <p className="text-sm font-medium text-text-secondary mb-2">{doctor.spec}</p>
            <div className="flex items-center gap-1 text-sm font-bold text-text-primary bg-accent-yellow/10 px-2 py-1 rounded w-max">
              <Star size={14} className="fill-accent-yellow text-accent-yellow" /> {doctor.rating} <span className="text-text-secondary font-medium">({doctor.reviews} reviews)</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex p-4 gap-4 border-b border-border-light">
          <div className="flex-1 flex flex-col items-center justify-center bg-bg-secondary py-3 rounded-2xl">
            <Users size={20} className="text-primary-main mb-1" />
            <span className="font-bold text-lg text-text-primary">{doctor.patients}</span>
            <span className="text-xs text-text-secondary">Patients</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center bg-bg-secondary py-3 rounded-2xl">
            <Award size={20} className="text-accent-teal mb-1" />
            <span className="font-bold text-lg text-text-primary">{doctor.exp}</span>
            <span className="text-xs text-text-secondary">Experience</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center bg-bg-secondary py-3 rounded-2xl">
            <MessageSquare size={20} className="text-accent-yellow mb-1" />
            <span className="font-bold text-lg text-text-primary">{doctor.reviews}</span>
            <span className="text-xs text-text-secondary">Reviews</span>
          </div>
        </div>

        {/* About Section */}
        <div className="p-6 border-b border-border-light">
          <h3 className="text-base font-bold text-text-primary mb-3">About Doctor</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            {doctor.about || `${doctor.name} is a top specialist in ${doctor.spec} with extensive experience in treating pets with utmost care. Highly recommended by pet parents.`}
          </p>
        </div>

        {/* Working Hours & Location */}
        <div className="p-6">
          <h3 className="text-base font-bold text-text-primary mb-4">Clinic Details</h3>
          
          <div className="flex gap-4 mb-4">
            <div className="w-12 h-12 bg-primary-light/30 rounded-xl flex items-center justify-center text-primary-dark shrink-0">
              <MapPin size={24} />
            </div>
            <div>
              <p className="font-bold text-text-primary text-sm mb-0.5">{doctor.clinic || 'PetCare Central'}</p>
              <p className="text-xs text-text-secondary">{doctor.address || '123 Avenue, New York, NY'}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-12 h-12 bg-accent-yellow/20 rounded-xl flex items-center justify-center text-accent-yellow shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <p className="font-bold text-text-primary text-sm mb-0.5">Working Hours</p>
              <p className="text-xs text-text-secondary">Mon - Sat, 09:00 AM - 08:00 PM</p>
            </div>
          </div>
        </div>

      </div>

      {/* Fixed Bottom Bar */}
      <div className="absolute bottom-0 w-full bg-white border-t border-border-light p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] flex gap-3">
        <div className="flex flex-col justify-center px-2">
          <span className="text-xs text-text-secondary font-medium">Consultation</span>
          <span className="text-lg font-black text-text-primary">{doctor.consultFee || '₹499'}</span>
        </div>
        <Button 
          onClick={() => navigate(`/app/services/doctors/${doctor.id || id}/checkout`, { state: { doctor } })} 
          className="flex-1 h-14 rounded-full text-lg font-bold shadow-lg shadow-primary-main/30"
        >
          Book Appointment
        </Button>
      </div>

    </div>
  );
}
