import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MonitorPlay, Camera, Home, CheckCircle2, Circle, CalendarClock } from 'lucide-react';
import { useAdoptStore } from '../../../../../store/useAdoptStore';
import { getApplicationForListing } from '../../../../../services/adoptApi';
import { formatHomeCheckSlot } from './scheduleFormat';

const Tick = ({ done }) =>
  done ? (
    <CheckCircle2 size={24} className="text-[#66B4B1]" />
  ) : (
    <Circle size={24} className="text-gray-300" />
  );

export function HomeCheck() {
  const navigate = useNavigate();
  const { id } = useParams();
  const selectedPet = useAdoptStore(state => state.selectedPet);

  /*
   * Progress comes from the application itself. The three steps below used to
   * be drawn with the first two permanently ticked and the third permanently
   * blank, so every applicant saw the same invented progress no matter what
   * the shelter had actually done.
   */
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getApplicationForListing(id)
      .then((app) => { if (active) setApplication(app); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [id]);

  const scheduled = Boolean(application?.homeCheck?.scheduledAt);
  const slot = formatHomeCheckSlot(application?.homeCheck?.scheduledAt, isLoading);
  // Anything past `home_check_scheduled` means the check itself is behind them.
  const visitDone = ['approved', 'meet_scheduled', 'agreement_signed', 'completed'].includes(
    application?.status
  );
  const submitted = Boolean(application);

  /*
   * The home check and the approval belong to whoever is rehoming the pet — an
   * applicant used to call both of these on themselves and walk straight to the
   * approved screen. All this screen does now is tell them what happens next.
   */
  const handleContinue = () => navigate('/app/adopt/my-adoptions');

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-10">
      {/* Header */}
      <div className="flex items-center px-5 pt-12 pb-4 bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-900">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-black text-gray-900 ml-2">Home Check</h1>
      </div>

      <div className="px-5 pt-6 flex flex-col flex-1">
        <p className="text-[14px] text-gray-600 font-medium mb-8 leading-relaxed">
          A home check helps make sure the pet is going to a safe and loving home. The shelter will get in
          touch to arrange one — you will be notified as soon as they do.
        </p>

        {/* Steps */}
        <div className="space-y-4 flex-1">
          {/* Step 1 */}
          <div className="bg-white border border-gray-100 p-4 rounded-[20px] flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-[#FAF7F2] rounded-full flex items-center justify-center shrink-0">
              <MonitorPlay size={24} className="text-[#66B4B1]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-gray-900">Online Interview</h3>
              <p className="text-[12px] text-gray-500 font-medium mt-1">We will ask you a few questions.</p>
            </div>
            <Tick done={submitted} />
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-gray-100 p-4 rounded-[20px] flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-[#FAF7F2] rounded-full flex items-center justify-center shrink-0">
              <Camera size={24} className="text-[#66B4B1]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-gray-900">Home Photos</h3>
              <p className="text-[12px] text-gray-500 font-medium mt-1">Share photos of your home.</p>
            </div>
            <Tick done={scheduled || visitDone} />
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-gray-100 p-4 rounded-[20px] flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-[#FAF7F2] rounded-full flex items-center justify-center shrink-0">
              <Home size={24} className={visitDone ? 'text-[#66B4B1]' : 'text-gray-400'} />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-gray-900">Home Visit</h3>
              <p className="text-[12px] text-gray-500 font-medium mt-1">Our volunteer will visit your home.</p>
            </div>
            <Tick done={visitDone} />
          </div>
        </div>

        {scheduled && (
          <div className="bg-white border border-gray-100 rounded-[20px] p-4 mt-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FAF7F2] rounded-full flex items-center justify-center shrink-0">
                <CalendarClock size={20} className="text-[#66B4B1]" />
              </div>
              <div>
                <p className="text-[12px] text-gray-500 font-medium">Your home check is booked for</p>
                <p className="text-[14px] font-bold text-gray-900">{slot.date} at {slot.time}</p>
              </div>
            </div>
            {application?.homeCheck?.notes && (
              <p className="text-[12px] text-gray-600 font-medium mt-3 leading-relaxed">
                {application.homeCheck.notes}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 mb-6">
          <p className="text-[12px] text-gray-500 font-medium text-center">
            This helps us ensure the best match for {selectedPet?.name || 'the pet'}.
          </p>
        </div>

        <button 
          onClick={handleContinue}
          className="w-full bg-[#66B4B1] text-white py-4 rounded-[16px] text-[16px] font-bold shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-transform"
        >
          Got it — track my application
        </button>
      </div>
    </div>
  );
}
