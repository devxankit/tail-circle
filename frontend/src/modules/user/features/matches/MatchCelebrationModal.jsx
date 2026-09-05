import React from 'react';
import { X, Sparkles, Heart, MessageCircle, CalendarDays, Scissors, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { MatchPointsMeter } from './MatchPoints';
import { BehaviourCompatibility } from './BehaviourCompatibility';
import { goToEvents, goToGrooming } from './meetupSuggestions';

/**
 * The "IT'S A MATCH!" moment.
 *
 * A match is the one instant in the app where two owners are both delighted
 * and have nothing to do next — the old modal offered a chat button and
 * nothing else, so the moment died in a text thread. This one keeps the
 * celebration intact and then hands them two concrete ways to actually meet:
 * a grooming session and a pet event, each opening the listing so the two
 * owners choose for themselves. That also puts the platform's grooming and
 * event vendors in front of exactly the users with a reason to book.
 */

/** Shared shell so the two suggestions and their skeletons stay in step. */
function SuggestionCard({ icon: Icon, iconClass, eyebrow, title, meta, cta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-200/80 text-left hover:border-[#4C8684]/40 hover:shadow-sm active:scale-[0.99] transition-all"
    >
      <span className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', iconClass)}>
        <Icon size={20} strokeWidth={2.5} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-wide text-[#4C8684] mb-0.5">
          {eyebrow}
        </span>
        <span className="block text-[13px] font-black text-slate-800 leading-tight truncate">{title}</span>
        {meta && <span className="block text-[11px] font-bold text-slate-400 truncate mt-0.5">{meta}</span>}
      </span>
      <span className="flex items-center gap-0.5 text-[11px] font-black text-[#4C8684] shrink-0">
        {cta}
        <ChevronRight size={14} strokeWidth={3} />
      </span>
    </button>
  );
}

export function MatchCelebrationModal({ match, myPetImage, onClose, onMessage }) {
  const navigate = useNavigate();
  const petName = match.profileName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-5 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white rounded-[32px] w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl relative border border-white/20 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 p-1"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-2 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-gradient-to-tr from-[#F87B68] to-rose-400 rounded-full flex items-center justify-center text-white mb-3 shadow-lg shadow-rose-200">
            <Sparkles size={28} />
          </div>

          <h2 className="text-2xl font-black text-[#4C8684] tracking-tight mb-1">IT'S A MATCH!</h2>
          <p className="text-xs font-bold text-slate-500 mb-5">
            You and <span className="text-slate-800">{petName}</span> liked each other!
          </p>

          {/* Both pets, not just theirs — a match is a pair. */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-4 border-white shadow-xl bg-slate-100 shrink-0">
              {myPetImage ? (
                <img src={myPetImage} alt="Your pet" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-2xl">🐾</span>
              )}
            </div>
            <span className="w-8 h-8 rounded-full bg-[#F87B68] text-white flex items-center justify-center shadow-md shrink-0">
              <Heart size={16} fill="currentColor" />
            </span>
            <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-4 border-white shadow-xl bg-slate-100 shrink-0">
              <img src={match.profileImage} alt={petName} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* The rating the two of them actually matched on. */}
          {match.matchPoints != null && (
            <div className="w-full max-w-[200px] mb-4">
              <MatchPointsMeter points={match.matchPoints} maxPoints={match.maxMatchPoints || 5} />
              <p className="text-[11px] font-bold text-slate-400 text-center mt-1.5">compatibility</p>
            </div>
          )}

          {/* How the two temperaments actually sit together. A match between a
              shy pet and a reactive one should not read the same as a match
              between two friendly ones, and this is where that is said. */}
          <BehaviourCompatibility behaviour={match.behaviourMatch} className="mb-5" />

          {/* ── the reason this modal exists ─────────────── */}
          <div className="w-full text-left">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 mb-2.5">
              Make it a real meet-up
            </p>

            <div className="space-y-2">
              <SuggestionCard
                icon={Scissors}
                iconClass="bg-[#FFF3E3] text-[#D9A05B]"
                eyebrow="Spa day together"
                title="Book a grooming session together"
                meta="Let the pets meet while getting groomed"
                cta="Browse"
                onClick={() => {
                  onClose();
                  goToGrooming(navigate);
                }}
              />

              <SuggestionCard
                icon={CalendarDays}
                iconClass="bg-[#EAF3F1] text-[#4C8684]"
                eyebrow="Meet at an event"
                title="Explore nearby events"
                meta={`Pet meet-ups and park days you can take ${petName} to`}
                cta="Browse"
                onClick={() => {
                  onClose();
                  goToEvents(navigate);
                }}
              />
            </div>
          </div>
        </div>

        {/* Chat stays the primary action — the suggestions are what to talk
            about, not a replacement for talking. */}
        <div className="px-6 pt-3 pb-5 bg-white border-t border-gray-100 shrink-0">
          <button
            onClick={onMessage}
            className="w-full bg-[#4C8684] text-white py-3 rounded-full font-bold shadow-lg hover:bg-[#3d6b6a] transition mb-1 flex items-center justify-center gap-2"
          >
            <MessageCircle size={16} strokeWidth={2.5} />
            Send Message
          </button>
          <button
            onClick={onClose}
            className="w-full text-slate-500 py-2 font-bold text-xs hover:text-slate-800"
          >
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  );
}

export default MatchCelebrationModal;
