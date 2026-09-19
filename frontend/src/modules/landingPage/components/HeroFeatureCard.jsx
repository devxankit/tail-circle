
/**
 * Custom High-Fidelity SVG Icons tailored to the reference screenshot
 */
const CardIcon = ({ type }) => {
  switch (type) {
    case 'match':
      return (
        <div className="tc-match-icon-wrapper" aria-hidden="true">
          <img
            src="/tc-brand-mark.png"
            alt=""
            className="tc-match-avatar"
          />
        </div>
      );

    case 'grooming':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="tc-card-svg" aria-hidden="true">
          {/* Coral Scissors */}
          <circle cx="8" cy="8" r="4" stroke="#F45B4B" strokeWidth="2.5" />
          <circle cx="20" cy="8" r="4" stroke="#F45B4B" strokeWidth="2.5" />
          <path d="M10.8 10.8L20 22" stroke="#F45B4B" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M17.2 10.8L8 22" stroke="#F45B4B" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="14" cy="14.8" r="1.5" fill="#F45B4B" />
        </svg>
      );

    case 'meals':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="tc-card-svg" aria-hidden="true">
          {/* Teal Bowl with food & heart */}
          <path
            d="M5 14C5 19.5 9 22 14 22C19 22 23 19.5 23 14H5Z"
            fill="#008A80"
          />
          {/* Food mound */}
          <path
            d="M8 14C8 10 11 8 14 8C17 8 20 10 20 14H8Z"
            fill="#E0A458"
          />
          {/* Tiny heart on food */}
          <path
            d="M14 13.2L12.9 12.1C12.3 11.5 12.3 10.5 12.9 9.9C13.5 9.3 14.5 9.3 15.1 9.9L14 11L14 13.2Z"
            fill="#FFFFFF"
          />
          <path
            d="M14 17.5C14.8 17.5 15.5 16.8 15.5 16C15.5 15.2 14.8 14.5 14 14.5C13.2 14.5 12.5 15.2 12.5 16C12.5 16.8 13.2 17.5 14 17.5Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
        </svg>
      );

    case 'vets':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="tc-card-svg" aria-hidden="true">
          {/* Teal Stethoscope */}
          <path
            d="M8 6V12C8 15.3 10.7 18 14 18C17.3 18 20 15.3 20 12V6"
            stroke="#008A80"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M14 18V21C14 22.1 14.9 23 16 23H17"
            stroke="#008A80"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="19" cy="23" r="2.5" fill="#008A80" />
          <circle cx="8" cy="6" r="1.5" fill="#008A80" />
          <circle cx="20" cy="6" r="1.5" fill="#008A80" />
        </svg>
      );

    case 'shop':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="tc-card-svg" aria-hidden="true">
          {/* Teal Shopping Bag */}
          <path
            d="M6 10H22L20.5 23H7.5L6 10Z"
            fill="#008A80"
          />
          <path
            d="M10.5 10V7C10.5 5.1 12.1 3.5 14 3.5C15.9 3.5 17.5 5.1 17.5 7V10"
            stroke="#008A80"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'daycare':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="tc-card-svg" aria-hidden="true">
          {/* Teal Roof House */}
          <path
            d="M4 13L14 5L24 13"
            stroke="#008A80"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 12V22C7 22.6 7.4 23 8 23H20C20.6 23 21 22.6 21 22V12"
            fill="#008A80"
            opacity="0.9"
          />
          <path
            d="M11.5 23V16.5C11.5 15.7 12.2 15 13 15H15C15.8 15 16.5 15.7 16.5 16.5V23"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'boarding':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="tc-card-svg" aria-hidden="true">
          {/* Orange/Coral House with Heart */}
          <path
            d="M4 13L14 5L24 13"
            stroke="#FF705A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 12V22C7 22.6 7.4 23 8 23H20C20.6 23 21 22.6 21 22V12"
            fill="#FF705A"
            opacity="0.9"
          />
          {/* Teal Heart in Center */}
          <path
            d="M14 19.5L12.5 18.1C10.2 16 8.7 14.6 8.7 12.9C8.7 11.5 9.8 10.4 11.2 10.4C12 10.4 12.8 10.8 13.3 11.4C13.8 10.8 14.6 10.4 15.4 10.4C16.8 10.4 17.9 11.5 17.9 12.9C17.9 14.6 16.4 16 14.1 18.1L14 19.5Z"
            fill="#008A80"
          />
        </svg>
      );

    case 'events':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="tc-card-svg" aria-hidden="true">
          {/* Coral Calendar with Star */}
          <rect x="5" y="7" width="18" height="17" rx="3.5" fill="#F45B4B" />
          <path d="M5 11H23" stroke="#FFFFFF" strokeWidth="1.8" />
          <path d="M9 4.5V7.5" stroke="#F45B4B" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M19 4.5V7.5" stroke="#F45B4B" strokeWidth="2.5" strokeLinecap="round" />
          {/* Star in calendar */}
          <polygon
            points="14,13 15.2,15.8 18.2,16.1 15.9,18.1 16.6,21 14,19.4 11.4,21 12.1,18.1 9.8,16.1 12.8,15.8"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'adopt':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="tc-card-svg" aria-hidden="true">
          {/* Coral Paw Print */}
          <ellipse cx="14" cy="18" rx="4.5" ry="3.8" fill="#F45B4B" />
          <circle cx="8" cy="12.5" r="2.2" fill="#F45B4B" />
          <circle cx="12" cy="9.5" r="2.2" fill="#F45B4B" />
          <circle cx="16" cy="9.5" r="2.2" fill="#F45B4B" />
          <circle cx="20" cy="12.5" r="2.2" fill="#F45B4B" />
        </svg>
      );

    case 'community':
      return (
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="tc-card-svg" aria-hidden="true">
          {/* Teal 3 Avatars / Group */}
          <circle cx="14" cy="10" r="3.2" fill="#008A80" />
          <path
            d="M8.5 20C8.5 17 11 14.8 14 14.8C17 14.8 19.5 17 19.5 20"
            stroke="#008A80"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="7" cy="12" r="2.4" fill="#008A80" opacity="0.75" />
          <path
            d="M3.5 19.5C3.5 17.5 5.2 16 7.5 16"
            stroke="#008A80"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.75"
          />
          <circle cx="21" cy="12" r="2.4" fill="#008A80" opacity="0.75" />
          <path
            d="M24.5 19.5C24.5 17.5 22.8 16 20.5 16"
            stroke="#008A80"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
      );

    default:
      return null;
  }
};

/**
 * HeroFeatureCard — Single floating card component
 * Handles both squircle format and pill format with smooth hover/tap states
 */
export function HeroFeatureCard({
  id,
  type,
  label,
  isPill = false,
  style = {},
  animClass = '',
  onClick,
}) {
  return (
    <button
      type="button"
      className={`tc-hero-card ${isPill ? 'tc-hero-card-pill' : 'tc-hero-card-squircle'} ${animClass}`}
      style={style}
      onClick={() => onClick && onClick(id)}
      aria-label={`Tail Circle Feature: ${label}`}
    >
      <div className="tc-card-icon-container">
        <CardIcon type={type} />
      </div>
      <span className="tc-card-label">{label}</span>
    </button>
  );
}

export default HeroFeatureCard;
