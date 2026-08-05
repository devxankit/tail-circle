import React, { useState } from 'react';
import { ArrowLeft, User, Phone, Calendar, CheckCircle, FileText, Activity, Droplet } from 'lucide-react';

export function PatientDetailView({ patient, onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!patient) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => onNavigate('patients_list')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold text-sm transition"
        >
          <ArrowLeft size={16} /> Back to Patients
        </button>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition">
            Send Message
          </button>
          <button className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition">
            Schedule Appointment
          </button>
        </div>
      </div>

      {/* Header Profile */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-start gap-6">
        <div className="w-24 h-24 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-4xl shrink-0 border border-orange-200">
          {patient.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">{patient.species} • {patient.breed} • {patient.gender} • {patient.age}</p>
          
          <div className="flex flex-wrap items-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User size={16} className="text-gray-400" />
              <span className="font-bold">{patient.owner}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Phone size={16} className="text-gray-400" />
              <span>{patient.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Activity size={16} className="text-gray-400" />
              <span>{patient.weight}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200">
        {['overview', 'history', 'prescriptions', 'vaccinations'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-bold uppercase tracking-wider transition ${
              activeTab === tab ? 'border-b-2 border-[#F87B68] text-[#F87B68]' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm min-h-[300px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Health Status</h3>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  <p className={`font-bold ${patient.status.includes('Healthy') ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {patient.status}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Last checkup was on {patient.lastVisit}</p>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Allergies</h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">None reported</span>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Vaccination Overview</h3>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">{patient.vaccinations}</p>
                    <button onClick={() => setActiveTab('vaccinations')} className="text-xs text-emerald-600 font-bold hover:underline mt-1">View Schedule</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'overview' && (
          <div className="flex flex-col items-center justify-center h-[200px] text-gray-400">
            <FileText size={48} className="mb-4 text-gray-300" />
            <p className="text-sm font-medium">No records available for this tab yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
