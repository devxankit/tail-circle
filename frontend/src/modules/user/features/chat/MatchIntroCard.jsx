import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Scissors, CalendarDays, ChevronRight } from 'lucide-react';
import { goToEvents, goToGrooming } from '../matches/meetupSuggestions';

/**
 * The card the platform drops into a match conversation as its first message.
 *
 * A new match opens onto an empty room, and someone has to speak first into a
 * silence — which is where most matches quietly end. This takes that first
 * step on both owners' behalf and puts two concrete things to do underneath
 * it, so the opening move is "shall we book this?" rather than "hi".
 *
 * It renders full width rather than as a chat bubble: nobody sent it, so
 * sitting it on either side of the thread would misattribute it.
 *
 * Both actions open a listing rather than a particular salon or event —
 * choosing where to go is the thing the two owners are meant to do together.
 */

function ActionRow({ icon: Icon, iconClass, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-border-light text-left hover:border-primary-main/40 hover:shadow-sm active:scale-[0.99] transition-all"
    >
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon size={18} strokeWidth={2.5} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-bold text-text-primary leading-tight">{title}</span>
        <span className="block text-[11.5px] text-text-secondary leading-snug mt-0.5 truncate">
          {subtitle}
        </span>
      </span>
      <ChevronRight size={16} className="text-primary-main shrink-0" strokeWidth={3} />
    </button>
  );
}

export function MatchIntroCard() {
  const navigate = useNavigate();

  return (
    <div className="self-stretch max-w-full my-1">
      <div className="rounded-3xl border border-primary-main/20 bg-primary-light/40 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F87B68] to-rose-400 flex items-center justify-center text-white shrink-0">
            <Sparkles size={16} />
          </span>
          <h3 className="text-[15px] font-black text-text-primary">Hey, it&apos;s a Match!</h3>
        </div>

        <p className="text-[13px] text-text-secondary leading-snug mb-3.5">
          Looks like your pets are interested in meeting each other. Why not take the next step and
          meet in person?
        </p>

        <div className="space-y-2">
          <ActionRow
            icon={Scissors}
            iconClass="bg-[#FFF3E3] text-[#D9A05B]"
            title="Book a Grooming Session Together"
            subtitle="Let the pets meet while getting groomed."
            onClick={() => goToGrooming(navigate)}
          />
          <ActionRow
            icon={CalendarDays}
            iconClass="bg-[#EAF3F1] text-primary-main"
            title="Explore Nearby Events"
            subtitle="Find pet-friendly events happening near you and book one together."
            onClick={() => goToEvents(navigate)}
          />
        </div>
      </div>
    </div>
  );
}

export default MatchIntroCard;
