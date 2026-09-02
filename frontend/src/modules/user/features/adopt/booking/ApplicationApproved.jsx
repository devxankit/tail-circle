import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ClipboardCheck, Clock, XCircle } from 'lucide-react';
import { getApplicationForListing } from '../../../../../services/adoptApi';

/*
 * Approval is the shelter's decision, so this screen reports it rather than
 * announcing it. It used to render "Application Approved!" unconditionally
 * and offer the next step, which told applicants they had been approved while
 * their application was still sitting in the shelter's queue -- or after it
 * had been declined.
 */
export function ApplicationApproved() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getApplicationForListing(id)
      .then((app) => { if (active) setApplication(app); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [id]);

  const status = application?.status;
  const isApproved = ['approved', 'meet_scheduled', 'agreement_signed', 'completed'].includes(status);
  const isRejected = ['rejected', 'cancelled'].includes(status);

  const view = isLoading
    ? {
        Icon: Clock,
        title: 'Checking your application...',
        body: 'One moment while we fetch the latest decision from the shelter.',
      }
    : isApproved
      ? {
          Icon: ClipboardCheck,
          title: 'Application Approved!',
          body: 'Congratulations! Your application has been approved. You can now proceed to finalize the adoption.',
        }
      : isRejected
        ? {
            Icon: XCircle,
            title: 'Application Closed',
            body:
              application?.decision?.reason ||
              'This application was not taken forward. You can browse other pets looking for a home.',
          }
        : {
            Icon: Clock,
            title: 'Awaiting Approval',
            body:
              'Your application is with the shelter. We will notify you as soon as they make a decision.',
          };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] pb-10">
      {/* Header */}
      <div className="flex items-center px-5 pt-12 pb-4 bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-900">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[18px] font-black text-gray-900 ml-2">Adoption Approval</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-32 h-32 bg-[#FAF7F2] rounded-full flex items-center justify-center mb-8 relative">
          <view.Icon size={64} className={isRejected ? 'text-[#F87B68]' : 'text-[#66B4B1]'} />
          {isApproved && (
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#66B4B1] rounded-full flex items-center justify-center border-4 border-[#FAF7F2]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          )}
        </div>

        <h2 className="text-[24px] font-black text-gray-900 mb-2 text-center">{view.title}</h2>
        <p className="text-[14px] text-gray-600 font-medium text-center mb-8 leading-relaxed">
          {view.body}
        </p>
      </div>

      <div className="px-5">
        {isApproved ? (
          <button
            onClick={() => navigate(`/app/adopt/meet/${id}`)}
            className="w-full bg-[#66B4B1] text-white py-4 rounded-[16px] text-[16px] font-bold shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-transform"
          >
            Proceed to Adoption
          </button>
        ) : (
          <button
            onClick={() => navigate(isRejected ? '/app/adopt' : '/app/adopt/my-adoptions')}
            disabled={isLoading}
            className="w-full bg-[#66B4B1] text-white py-4 rounded-[16px] text-[16px] font-bold shadow-lg shadow-[#66B4B1]/20 active:scale-95 transition-transform disabled:opacity-60"
          >
            {isRejected ? 'Browse other pets' : 'Track my application'}
          </button>
        )}
      </div>
    </div>
  );
}
