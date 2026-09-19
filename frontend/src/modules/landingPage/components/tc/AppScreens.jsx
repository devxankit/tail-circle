import React from 'react';
import {
  Search,
  MapPin,
  Star,
  Heart,
  MessageCircle,
  House,
  Compass,
  Users,
  User,
} from 'lucide-react';
import { SERVICES, IMG } from './content';

const quick = SERVICES.slice(0, 4);

/* A real app has a tab bar — it anchors the mockup and stops the screen
   from looking half-empty. `active` marks the tab for the current screen. */
const TABS = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'community', label: 'Circle', icon: Users },
  { id: 'profile', label: 'Pet', icon: User },
];

function TabBar({ active }) {
  return (
    <>
      <span className="tc-ui-spacer" />
      <nav className="tc-ui-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.id === active;
          return (
            <span key={t.id} className={`tc-ui-tab${on ? ' tc-ui-tab--on' : ''}`}>
              <Icon size={12} strokeWidth={on ? 2.6 : 2} />
              {t.label}
            </span>
          );
        })}
      </nav>
    </>
  );
}

/* ── 01 · Pet profile ─────────────────────────────────────────────────── */
function ProfileScreen() {
  return (
    <>
      <div className="tc-ui-photo" style={{ aspectRatio: '1 / 1', borderRadius: '50%', width: '52%', margin: '4px auto 0' }}>
        <img src={IMG.collie} alt="" loading="lazy" decoding="async" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p className="tc-ui-title">Buddy</p>
        <p className="tc-ui-sub">Golden Retriever</p>
      </div>
      <div className="tc-ui-card">
        <span className="tc-ui-avatar" style={{ display: 'grid', placeItems: 'center', background: '#FFF3CF' }}>
          <Star size={11} color="#D97706" fill="#FFC72C" strokeWidth={0} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="tc-ui-title" style={{ display: 'block' }}>2 years</span>
          <span className="tc-ui-sub">Male · 28 kg</span>
        </span>
      </div>
      <div className="tc-ui-card">
        <span className="tc-ui-avatar" style={{ display: 'grid', placeItems: 'center', background: '#DFF6F2' }}>
          <Heart size={11} color="#0B8279" strokeWidth={2.4} />
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span className="tc-ui-title" style={{ display: 'block' }}>Health record</span>
          <span className="tc-ui-bar" style={{ display: 'block', marginTop: 4, width: '72%' }} />
        </span>
      </div>
      <TabBar active="profile" />
    </>
  );
}

/* ── 02 · Explore / discover ──────────────────────────────────────────── */
function ExploreScreen() {
  return (
    <>
      <p className="tc-ui-title">Explore</p>
      <div
        className="tc-ui-card"
        style={{ padding: '6px 8px', background: '#F7FBF9', gap: 5 }}
      >
        <Search size={11} color="#64798C" strokeWidth={2.4} />
        <span className="tc-ui-sub">Search near Lake Norman</span>
      </div>
      <div className="tc-ui-row">
        {quick.map((s) => {
          const Icon = s.icon;
          return (
            <span key={s.id} className="tc-ui-tile" style={{ background: s.tagBg }}>
              <Icon size={12} color={s.color} strokeWidth={2.4} />
              {s.label}
            </span>
          );
        })}
      </div>
      <p className="tc-ui-sub" style={{ fontWeight: 800, color: '#102A43' }}>
        Nearby Services
      </p>
      <div className="tc-ui-card">
        <span className="tc-ui-avatar">
          <img src={IMG.heroDog} alt="" loading="lazy" decoding="async" />
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="tc-ui-title" style={{ display: 'block' }}>
            Lake Norman Vet
          </span>
          <span className="tc-ui-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Star size={8} color="#FFC72C" fill="#FFC72C" strokeWidth={0} /> 4.9 · 1.2 km
          </span>
        </span>
      </div>
      <div className="tc-ui-card">
        <span className="tc-ui-avatar" style={{ display: 'grid', placeItems: 'center', background: '#FFE4E1' }}>
          <MapPin size={11} color="#C8493E" strokeWidth={2.4} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="tc-ui-title" style={{ display: 'block' }}>Paws &amp; Polish</span>
          <span className="tc-ui-sub">Grooming · 2.4 km</span>
        </span>
      </div>
      <TabBar active="explore" />
    </>
  );
}

/* ── 03 · Community feed ──────────────────────────────────────────────── */
function CommunityScreen() {
  return (
    <>
      <p className="tc-ui-title">Community</p>
      <div className="tc-ui-row" style={{ gap: 4 }}>
        <span className="tc-ui-pill">Posts</span>
        <span className="tc-ui-pill" style={{ background: '#F2F5F7', color: '#64798C' }}>
          Events
        </span>
        <span className="tc-ui-pill" style={{ background: '#F2F5F7', color: '#64798C' }}>
          Nearby
        </span>
      </div>
      <div className="tc-ui-card" style={{ border: 'none', padding: '2px 0' }}>
        <span className="tc-ui-avatar">
          <img src={IMG.collie} alt="" loading="lazy" decoding="async" />
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="tc-ui-title" style={{ display: 'block' }}>Sarah &amp; Max</span>
          <span className="tc-ui-sub">21 min ago</span>
        </span>
      </div>
      <p className="tc-ui-sub">Beautiful day at Lake Norman!</p>
      <div className="tc-ui-photo">
        <img src={IMG.community} alt="" loading="lazy" decoding="async" />
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <Heart size={10} color="#FF766B" fill="#FF766B" strokeWidth={0} />
          <span className="tc-ui-sub">128</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <MessageCircle size={10} color="#64798C" strokeWidth={2.4} />
          <span className="tc-ui-sub">24</span>
        </span>
      </div>
      <TabBar active="community" />
    </>
  );
}

const SCREENS = {
  profile: ProfileScreen,
  explore: ExploreScreen,
  community: CommunityScreen,
};

export function AppScreen({ name }) {
  const Screen = SCREENS[name] || ProfileScreen;
  return <Screen />;
}

export default AppScreen;
