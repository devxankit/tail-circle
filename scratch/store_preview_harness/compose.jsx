// Play Store screenshot compositions (1080 x 1920). Real app screens in a
// phone frame, with headline + feature callouts. Temporary harness.
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  PawPrint, Sparkles, ShieldCheck, Power, CalendarDays, AlertTriangle, Layers, Landmark, Heart,
  Video, Clock, ShoppingBag, Bell,
} from 'lucide-react';

const W = 1080;
const H = 1920;
const SHOT = (n) => `/__store_preview__/shots/${n}.png`;
const LOGO = '/logo/Tail-removebg-preview.png';

const INK = '#2B2522';
const MUTED = '#8C8682';
const TEAL = '#087F78';
const CORAL = '#F45B4B';

const THEMES = {
  peach: { bg: 'linear-gradient(180deg,#FFF9F5 0%,#FFEFE7 52%,#FFDCCD 100%)', blobs: [[CORAL, 0.20, -160, 380, 620], [TEAL, 0.13, 760, 1050, 640], ['#FFB199', 0.35, 120, 1500, 700]], paw: CORAL },
  rose: { bg: 'linear-gradient(180deg,#FFF8F7 0%,#FDEBEE 52%,#F9D2DA 100%)', blobs: [['#F45B8B', 0.16, -180, 300, 640], [CORAL, 0.16, 760, 950, 640], ['#FFC2CF', 0.4, 100, 1500, 700]], paw: '#E85C7A' },
  mint: { bg: 'linear-gradient(180deg,#F6FCFB 0%,#E4F4F1 52%,#C9E8E3 100%)', blobs: [[TEAL, 0.16, -180, 340, 640], [CORAL, 0.11, 760, 1000, 600], ['#9FD8CF', 0.45, 120, 1500, 700]], paw: TEAL },
  sun: { bg: 'linear-gradient(180deg,#FFFBF3 0%,#FFF1DC 52%,#FFE0B5 100%)', blobs: [['#FFB547', 0.22, -160, 360, 640], [CORAL, 0.13, 760, 1000, 620], ['#FFD48A', 0.45, 120, 1500, 700]], paw: '#E8961E' },
  teal: { dark: true, bg: 'linear-gradient(168deg,#0C3532 0%,#0A5650 46%,#0B7770 100%)', blobs: [['#2FB8AA', 0.30, 640, -200, 680], ['#5FD3C6', 0.24, -240, 1240, 760], [CORAL, 0.16, 720, 1560, 560]], paw: '#FFFFFF' },
};

/* ── Decorations ───────────────────────────────────────────── */

function Blobs({ theme }) {
  return theme.blobs.map(([c, a, x, y, s], i) => (
    <div key={i} style={{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%', background: c, opacity: a, filter: 'blur(110px)' }} />
  ));
}

const PAWS = [[64, 236, 84, -22], [946, 170, 66, 24], [930, 452, 50, -12], [104, 470, 46, 16], [58, 1780, 96, -16], [968, 1730, 78, 20]];
function Paws({ color, dark }) {
  return PAWS.map(([x, y, s, r], i) => (
    <PawPrint key={i} size={s} color={color} strokeWidth={2.2} style={{ position: 'absolute', left: x, top: y, transform: `rotate(${r}deg)`, opacity: dark ? 0.08 : 0.13 }} />
  ));
}

/* ── Header ────────────────────────────────────────────────── */

function Header({ dark, tag, line1, line2, sub }) {
  return (
    <div style={{ position: 'absolute', top: 92, left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 14, padding: '8px 26px 8px 10px', borderRadius: 999,
        background: dark ? 'rgba(255,255,255,0.10)' : '#FFFFFF',
        border: `1.5px solid ${dark ? 'rgba(255,255,255,0.22)' : 'rgba(8,127,120,0.14)'}`,
        boxShadow: dark ? 'none' : '0 10px 30px -12px rgba(120,60,40,0.25)',
      }}>
        <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          <img src={LOGO} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
        </span>
        <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 21, letterSpacing: '0.14em', color: dark ? '#FFFFFF' : TEAL }}>{tag}</span>
      </div>
      <h1 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: 98, lineHeight: 0.99, letterSpacing: '-0.04em', margin: '32px 0 0' }}>
        <span style={{ display: 'block', color: dark ? '#FFFFFF' : TEAL }}>{line1}</span>
        <span style={{ display: 'block', color: dark ? '#FF9F8F' : CORAL }}>{line2}</span>
      </h1>
      <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 500, fontSize: 32, lineHeight: 1.42, color: dark ? 'rgba(255,255,255,0.82)' : '#5E5652', maxWidth: 860, margin: '24px auto 0', textWrap: 'balance' }}>{sub}</p>
    </div>
  );
}

/* ── Phone ─────────────────────────────────────────────────── */

function StatusBar({ h, s, bar }) {
  const fg = '#1C1A19';
  return (
    <div style={{ height: h, background: bar, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${22 * s}px 0 ${26 * s}px`, position: 'relative' }}>
      <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14 * s, color: fg, letterSpacing: '0.01em' }}>9:41</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 * s }}>
        {/* wifi */}
        <svg width={16 * s} height={12 * s} viewBox="0 0 16 12"><path d="M8 11.5 0.6 4.1a10.5 10.5 0 0 1 14.8 0z" fill={fg} /></svg>
        {/* signal */}
        <svg width={14 * s} height={12 * s} viewBox="0 0 14 12"><path d="M13.5 0.5v11h-13z" fill={fg} /></svg>
        {/* battery */}
        <svg width={9 * s} height={14 * s} viewBox="0 0 9 14"><rect x="2.5" y="0" width="4" height="1.6" rx="0.6" fill={fg} /><rect x="0.6" y="1.4" width="7.8" height="12" rx="1.6" fill="none" stroke={fg} strokeWidth="1.1" /><rect x="1.8" y="4.2" width="5.4" height="8" rx="0.8" fill={fg} /></svg>
      </span>
      <span style={{ position: 'absolute', left: '50%', top: '50%', width: 12 * s, height: 12 * s, marginLeft: -6 * s, marginTop: -6 * s, borderRadius: '50%', background: '#0B0B0C', boxShadow: `inset 0 0 0 ${2 * s}px #1d1f24` }} />
    </div>
  );
}

function Phone({ src, bar = '#FAF7F2', width = 620, left, top, rotate = 0, dark, z = 1 }) {
  const bezel = 13;
  const screenW = width - bezel * 2;
  const s = screenW / 393;
  const barH = Math.round(36 * s);
  const imgH = Math.round(816 * s);
  const radius = 58;
  return (
    <div style={{
      position: 'absolute', left, top, width, height: barH + imgH + bezel * 2, zIndex: z,
      borderRadius: radius + bezel, background: 'linear-gradient(145deg,#2B2D31,#0B0B0C 40%,#151619)', padding: bezel,
      boxShadow: dark
        ? '0 60px 120px -30px rgba(0,0,0,0.65), inset 0 0 0 2px rgba(255,255,255,0.10)'
        : '0 60px 110px -30px rgba(110,50,30,0.42), 0 18px 40px -18px rgba(0,0,0,0.25), inset 0 0 0 2px rgba(255,255,255,0.08)',
      transform: `rotate(${rotate}deg)`, transformOrigin: '50% 60%',
    }}>
      {/* side keys */}
      <span style={{ position: 'absolute', right: -5, top: 260, width: 5, height: 110, borderRadius: 4, background: '#1a1b1e' }} />
      <span style={{ position: 'absolute', right: -5, top: 400, width: 5, height: 70, borderRadius: 4, background: '#1a1b1e' }} />
      <div style={{ width: screenW, height: barH + imgH, borderRadius: radius, overflow: 'hidden', background: bar, position: 'relative' }}>
        <StatusBar h={barH} s={s} bar={bar} />
        <img src={src} alt="" style={{ display: 'block', width: screenW, height: imgH }} />
        <span style={{ position: 'absolute', bottom: 7 * s, left: '50%', width: 110 * s, height: 4 * s, marginLeft: -55 * s, borderRadius: 4, background: 'rgba(0,0,0,0.28)' }} />
      </div>
    </div>
  );
}

/* ── Floating cards ────────────────────────────────────────── */

const cardShadow = (dark) => (dark
  ? '0 40px 80px -24px rgba(0,0,0,0.55), 0 6px 18px rgba(0,0,0,0.18)'
  : '0 36px 70px -22px rgba(110,50,30,0.32), 0 6px 16px rgba(110,50,30,0.08)');

function Card({ x, y, w, dark, rotate = 0, children, style }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, zIndex: 5, background: '#FFFFFF', borderRadius: 30, boxSizing: 'border-box',
      padding: '20px 24px', boxShadow: cardShadow(dark), transform: `rotate(${rotate}deg)`,
      display: 'flex', alignItems: 'center', gap: 18, ...style,
    }}>
      {children}
    </div>
  );
}

function Feature({ x, y, w, dark, rotate, icon: Icon, img, tint, color, title, sub }) {
  return (
    <Card x={x} y={y} w={w} dark={dark} rotate={rotate}>
      {img
        ? <img src={img} alt="" style={{ width: 70, height: 70, borderRadius: 20, objectFit: 'cover', flexShrink: 0 }} />
        : (
          <span style={{ width: 70, height: 70, borderRadius: 20, background: tint, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Icon size={34} color={color} strokeWidth={2.4} />
          </span>
        )}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'Outfit', fontWeight: 800, fontSize: 30, lineHeight: 1.08, color: INK, letterSpacing: '-0.01em' }}>{title}</span>
        <span style={{ display: 'block', fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: 20, lineHeight: 1.3, color: MUTED, marginTop: 5 }}>{sub}</span>
      </span>
    </Card>
  );
}

function Clip({ src, x, y, w, dark, rotate = 0 }) {
  return (
    <img src={src} alt="" style={{
      position: 'absolute', left: x, top: y, width: w, zIndex: 5, transform: `rotate(${rotate}deg)`,
      filter: dark ? 'drop-shadow(0 34px 44px rgba(0,0,0,0.45))' : 'drop-shadow(0 30px 40px rgba(110,50,30,0.30))',
    }} />
  );
}

/* ── Slide shell ───────────────────────────────────────────── */

function Slide({ theme: key, tag, line1, line2, sub, children }) {
  const theme = THEMES[key];
  return (
    <div id="slide" style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: theme.bg }}>
      <Blobs theme={theme} />
      <Paws color={theme.paw} dark={theme.dark} />
      <Header dark={theme.dark} tag={tag} line1={line1} line2={line2} sub={sub} />
      {children(theme.dark)}
    </div>
  );
}

const PARENTS = 'BUILT FOR PET PARENTS';
const PARTNERS = 'FOR PET BUSINESSES';
const PHONE = { left: 230, top: 552, width: 620 };

const SLIDES = {
  u1: () => (
    <Slide theme="peach" tag={PARENTS} line1="One place." line2="Every tail." sub="Grooming, vets, daycare, fresh meals and a pet shop, all in one app.">
      {(dark) => (<>
        <Phone src={SHOT('u_home')} bar="#FAF7F2" {...PHONE} />
        <Feature dark={dark} x={716} y={1000} w={340} img="/assets/quick_links/vet.jpeg" title="Vet consults" sub="Video & in-clinic" rotate={2} />
        <Feature dark={dark} x={24} y={1320} w={350} img="/assets/quick_links/grooming.jpeg" title="Grooming" sub="Salon & home visits" rotate={-2} />
      </>)}
    </Slide>
  ),
  u2: () => (
    <Slide theme="rose" tag={PARENTS} line1="Find their" line2="perfect playmate." sub="Swipe pets nearby, match on temperament and plan the playdate.">
      {(dark) => (<>
        <Phone src={SHOT('u_matches')} bar="#F4F1EB" {...PHONE} />
        <Card dark={dark} x={606} y={760} w={434} rotate={2}>
          <span style={{ position: 'relative', width: 132, height: 80, flexShrink: 0 }}>
            <img src="/generated_matches/husky_1_1782415091249.png" alt="" style={{ position: 'absolute', left: 0, top: 0, width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 6px 14px rgba(0,0,0,0.15)' }} />
            <img src="/generated_matches/golden_1_1782415137857.png" alt="" style={{ position: 'absolute', left: 52, top: 0, width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 6px 14px rgba(0,0,0,0.15)' }} />
            <span style={{ position: 'absolute', left: 50, bottom: -8, width: 34, height: 34, borderRadius: '50%', background: CORAL, display: 'grid', placeItems: 'center', border: '3px solid #fff' }}>
              <Heart size={16} color="#fff" fill="#fff" />
            </span>
          </span>
          <span>
            <span style={{ display: 'block', fontFamily: 'Outfit', fontWeight: 800, fontSize: 31, color: INK, lineHeight: 1.05 }}>It's a match!</span>
            <span style={{ display: 'block', fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: 20, color: MUTED, marginTop: 5 }}>Luna & Bruno</span>
          </span>
        </Card>
        <Feature dark={dark} x={24} y={1440} w={470} icon={Sparkles} tint="#E3F2EF" color={TEAL} title="Temperament match" sub="Play style & energy" rotate={-2} />
      </>)}
    </Slide>
  ),
  u3: () => (
    <Slide theme="mint" tag={PARENTS} line1="Trusted vets," line2="one tap away." sub="Instant video consults, clinic visits and home check-ups.">
      {(dark) => (<>
        <Phone src={SHOT('u_vets')} bar="#FAF7F2" {...PHONE} left={110} />
        <Feature dark={dark} x={700} y={780} w={356} icon={ShieldCheck} tint="#E3F2EF" color={TEAL} title="Verified vets" sub="Specialists near you" rotate={2} />
        <Clip src={SHOT('clip_instant')} x={596} y={1300} w={460} rotate={2} />
      </>)}
    </Slide>
  ),
  u4: () => (
    <Slide theme="sun" tag={PARENTS} line1="Pet life." line2="Sorted." sub="Book grooming and daycare, subscribe to fresh meals, shop essentials.">
      {(dark) => (<>
        <Phone src={SHOT('u_meals')} bar="#FFFFFF" width={560} left={44} top={640} rotate={-7} z={1} />
        <Phone src={SHOT('u_home_s1')} bar="#FAF7F2" width={600} left={420} top={584} rotate={4} z={2} />
        <Feature dark={dark} x={40} y={1600} w={400} icon={ShoppingBag} tint="#FFEDE9" color={CORAL} title="Pet shop" sub="Food, toys & care" rotate={-2} />
      </>)}
    </Slide>
  ),
  v1: () => (
    <Slide theme="teal" tag={PARTNERS} line1="Your pet business," line2="in your pocket." sub="Today's bookings, revenue and requests the moment you open the app.">
      {(dark) => (<>
        <Phone src={SHOT('v_dash')} bar="#FFFFFF" dark {...PHONE} />
        <Card dark={dark} x={150} y={728} w={780} rotate={0} style={{ alignItems: 'flex-start', padding: '22px 26px', borderRadius: 34 }}>
          <span style={{ width: 62, height: 62, borderRadius: 18, background: '#fff', border: '1.5px solid #EEE7E1', display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <img src={LOGO} alt="" style={{ width: 58, height: 58, objectFit: 'contain' }} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 18, color: MUTED }}>
              <Bell size={17} color={TEAL} strokeWidth={2.6} /> Tail Circle Partner · now
            </span>
            <span style={{ display: 'block', fontFamily: 'Outfit', fontWeight: 800, fontSize: 30, color: INK, marginTop: 4 }}>New booking request</span>
            <span style={{ display: 'block', fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: 20, color: '#6F6864', marginTop: 4 }}>Simba · Royal Spa Package · Tomorrow, 11:00 AM</span>
          </span>
        </Card>
        <Feature dark={dark} x={24} y={1590} w={450} icon={Power} tint="#E5F5EC" color="#2E9E5B" title="Go online in a tap" sub="Take bookings on your terms" rotate={-2} />
      </>)}
    </Slide>
  ),
  v2: () => (
    <Slide theme="teal" tag={PARTNERS} line1="Never miss" line2="a booking." sub="Accept requests in one tap and run your whole day from one sheet.">
      {(dark) => (<>
        <Phone src={SHOT('v_bookings')} bar="#FFFFFF" dark {...PHONE} left={110} />
        <Clip src={SHOT('clip_request')} x={588} y={1010} w={468} dark rotate={2} />
        <Feature dark={dark} x={616} y={1640} w={440} icon={CalendarDays} tint="#E3F2EF" color={TEAL} title="Your day, sorted" sub="Every appointment, in order" rotate={-2} />
      </>)}
    </Slide>
  ),
  v3: () => (
    <Slide theme="teal" tag={PARTNERS} line1="Built for vets" line2="& clinics." sub="Video consults, emergency requests and patient records in one place.">
      {(dark) => (<>
        <Phone src={SHOT('v_clinic')} bar="#FFFFFF" dark {...PHONE} />
        <Feature dark={dark} x={24} y={1540} w={430} icon={AlertTriangle} tint="#FDECEA" color="#E5484D" title="Emergency alerts" sub="Urgent cases come first" rotate={-2} />
        <Card dark={dark} x={640} y={1190} w={400} rotate={2} style={{ flexDirection: 'column', alignItems: 'stretch', padding: 16, gap: 0 }}>
          <span style={{ position: 'relative', display: 'block', height: 230, borderRadius: 22, overflow: 'hidden' }}>
            <img src="/assets/quick_links/vet_checkup.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%' }} />
            <span style={{ position: 'absolute', left: 14, top: 14, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: 'rgba(0,0,0,0.55)', color: '#fff', fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 17 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#FF5A4E' }} /> Live consult
            </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 8px 6px' }}>
            <span>
              <span style={{ display: 'block', fontFamily: 'Outfit', fontWeight: 800, fontSize: 28, color: INK }}>Max · Beagle</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fontSize: 19, color: MUTED, marginTop: 3 }}><Clock size={17} /> 11:30 AM</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 20px', borderRadius: 16, background: '#F87B68', color: '#fff', fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 19 }}>
              <Video size={20} /> Join
            </span>
          </span>
        </Card>
      </>)}
    </Slide>
  ),
  v4: () => (
    <Slide theme="teal" tag={PARTNERS} line1="Track earnings." line2="Get paid." sub="Follow every settlement and request payouts straight to your bank.">
      {(dark) => (<>
        <Phone src={SHOT('v_payouts')} bar="#FFFFFF" dark {...PHONE} />
        <Feature dark={dark} x={572} y={800} w={484} icon={Layers} tint="#FFEDE9" color={CORAL} title="All your businesses" sub="Grooming, daycare, clinic & more" rotate={2} />
        <Feature dark={dark} x={24} y={1420} w={420} icon={Landmark} tint="#E3F2EF" color={TEAL} title="Bank payouts" sub="Request in one tap" rotate={-2} />
      </>)}
    </Slide>
  ),
};

const id = new URLSearchParams(location.search).get('slide');
const S = SLIDES[id] || (() => <p>Unknown slide</p>);
document.body.style.margin = '0';
createRoot(document.getElementById('root')).render(<S />);
