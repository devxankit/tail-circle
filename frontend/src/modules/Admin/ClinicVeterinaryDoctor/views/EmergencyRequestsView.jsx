import React, { useState } from 'react';
import { AlertTriangle, Clock, Phone, MapPin, CheckCircle, XCircle, Activity } from 'lucide-react';
import { useVendor } from '../context/ClinicVendorContext';

export function EmergencyRequestsView({ onNavigate }) {
  const { emergencies, acceptEmergency, declineEmergency } = useVendor();
  const [processing, setProcessing] = useState(null);

  const handleAction = async (req, action) => {
    if (processing) return;
    setProcessing(req.id);
    try {
      if (action === 'accept') {
        await acceptEmergency(req._id);
        onNavigate('video_call');
      } else {
        await declineEmergency(req._id);
      }
    } catch (err) {
      console.error('Emergency action failed', err);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header (Minimalist) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            Emergency Command Center
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Respond immediately to critical cases. Average response time today: &lt; 2 mins.
          </p>
        </div>

        {/* Live alert badge */}
        {emergencies.length > 0 && (
          <div className="bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-sm font-bold text-slate-800">{emergencies.length} Active Alert{emergencies.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Emergency Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {emergencies.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Activity className="mx-auto text-slate-300 mb-3 opacity-50" size={36} />
            <h3 className="text-lg font-bold text-slate-800">No Active Emergencies</h3>
            <p className="text-slate-400 text-sm mt-1">All clear. You can focus on your scheduled appointments.</p>
          </div>
        ) : (
          emergencies.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition relative group"
            >
              {/* Top priority strip (Minimal) */}
              <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="font-black uppercase tracking-widest text-[10px]">
                    {req.severity} Priority
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
                  <Clock size={12} /> {req.timeElapsed}
                </div>
              </div>

              {/* Card body */}
              <div className="p-6">
                <div className="mb-5">
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {req.petName}{' '}
                    <span className="text-sm text-slate-400 font-medium">({req.species} – {req.breed})</span>
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 font-semibold">{req.ownerName}</p>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Issue Box */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                       Reported Issue
                    </p>
                    <p className="text-sm text-slate-800 font-semibold">{req.issue}</p>
                  </div>

                  {/* Location + Phone */}
                  <div className="flex flex-col gap-2 px-1">
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <MapPin size={15} className="text-slate-400 shrink-0" />
                      <span className="font-medium">{req.location}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Phone size={15} className="text-slate-400 shrink-0" />
                      <span className="font-medium">{req.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons (Slate Theme) */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction(req, 'accept')}
                    disabled={processing === req.id}
                    className={`flex-1 font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm ${
                        processing === req.id
                          ? 'bg-slate-800 text-white/50 cursor-not-allowed'
                          : 'bg-slate-900 hover:bg-black text-white cursor-pointer'
                      }`}
                  >
                    <Phone size={15} />
                    {processing === req.id ? 'Connecting...' : 'Accept & Start Call'}
                  </button>
                  <button
                    onClick={() => handleAction(req, 'decline')}
                    disabled={processing === req.id}
                    className={`px-4 py-3 rounded-xl transition flex items-center justify-center border ${
                      processing === req.id
                        ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 shadow-sm cursor-pointer'
                    }`}
                    title="Forward to another available doctor"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
