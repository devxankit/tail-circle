import {
  Stethoscope,
  Scissors,
  ShoppingBag,
  Utensils,
  CalendarDays,
  Heart,
  Home,
} from 'lucide-react';

/* Local, already-optimised photography that ships with the app */
export const IMG = {
  heroDog: '/assets/images/hero-dog.jpg',
  collie: '/assets/images/about-border-collie.jpg',
  community: '/assets/images/community.jpg',
};

/* Remote photography (same sources the rest of the landing page already uses) */
const U = (id, w = 600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/* ──────────────────────────────────────────────────────────────────────────
   The seven pillars of the circle.
   `x` / `y` are percentage coordinates on the hero orbit (a square box),
   computed from an even distribution around a circle of radius 42%.
   ────────────────────────────────────────────────────────────────────────── */
export const SERVICES = [
  {
    id: 'vet',
    label: 'Vet Care',
    title: 'Vet Care',
    desc: 'Trusted care near you',
    icon: Stethoscope,
    color: '#1B64DA',
    tagBg: '#E3EEFD',
    x: 27.7,
    y: 14.4,
    image: U('1628009368231-7bb7cfcb0def'),
  },
  {
    id: 'grooming',
    label: 'Grooming',
    title: 'Grooming',
    desc: 'Keep them looking their best',
    icon: Scissors,
    color: '#EA580C',
    tagBg: '#FFEADB',
    x: 73.5,
    y: 15.2,
    image: U('1516734212186-a967f81ad0d7'),
  },
  {
    id: 'shop',
    label: 'Shop',
    title: 'Shop',
    desc: 'Quality products they love',
    icon: ShoppingBag,
    color: '#0D9488',
    tagBg: '#DBF3EE',
    x: 92,
    y: 48.5,
    image: U('1583337130417-3346a1be7dee'),
  },
  {
    id: 'meals',
    label: 'Meals',
    title: 'Meals',
    desc: 'Healthy choices for happy pets',
    icon: Utensils,
    color: '#E11D48',
    tagBg: '#FCE5EC',
    x: 78.1,
    y: 81.2,
    image: U('1589924691995-400dc9ecc119'),
  },
  {
    id: 'events',
    label: 'Events',
    title: 'Events',
    desc: 'Local events & activities',
    icon: CalendarDays,
    color: '#D97706',
    tagBg: '#FFF3CF',
    x: 50,
    y: 92,
    image: U('1534361960057-19889db9621e'),
  },
  {
    id: 'match',
    label: 'Match',
    title: 'Match',
    desc: 'Find friends nearby',
    icon: Heart,
    color: '#4F46E5',
    tagBg: '#E4E7FE',
    x: 21.9,
    y: 81.2,
    image: U('1548199973-03cce0bbc87b'),
  },
  {
    id: 'adopt',
    label: 'Adopt',
    title: 'Adopt',
    desc: 'Give a pet a better tomorrow',
    icon: Home,
    color: '#9333EA',
    tagBg: '#F3E8FF',
    x: 8,
    y: 48.5,
    image: U('1535930891776-0c2dfb7fda1a'),
  },
];

/* Compact orbit used inside the "One circle." panel — radius 38% */
export const UNIFIED_ORBIT = [
  { id: 'vet', x: 30.7, y: 18.4 },
  { id: 'grooming', x: 71.3, y: 18.4 },
  { id: 'shop', x: 87.9, y: 49.3 },
  { id: 'meals', x: 74.4, y: 81.4 },
  { id: 'events', x: 50, y: 88 },
  { id: 'match', x: 25.6, y: 81.4 },
  { id: 'adopt', x: 12.1, y: 49.3 },
];

/* Left-hand "Old Way" scatter — deliberately uneven, percentage placed */
export const FRAGMENTS = [
  { id: 'vet', label: 'Vet', icon: Stethoscope, color: '#1B64DA', x: 22, y: 16 },
  { id: 'groomer', label: 'Groomer', icon: Scissors, color: '#EA580C', x: 60, y: 10 },
  { id: 'food', label: 'Pet Food', icon: Utensils, color: '#E11D48', x: 80, y: 33 },
  { id: 'friends', label: 'Pet Friends', icon: Heart, color: '#4F46E5', x: 74, y: 60 },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: '#0D9488', x: 20, y: 52 },
  { id: 'events', label: 'Events', icon: CalendarDays, color: '#D97706', x: 30, y: 84 },
  { id: 'adoption', label: 'Adoption', icon: Home, color: '#9333EA', x: 74, y: 86 },
];

export const STEPS = [
  {
    num: '01',
    title: 'Create your pet',
    desc: 'Add your pet profile once in a few seconds.',
    note: 'Their story\nstarts here',
    accent: '#DFF6F2',
    screen: 'profile',
  },
  {
    num: '02',
    title: 'Discover what they need',
    desc: 'Find care, products, events and friends nearby.',
    note: 'Discover\nLocal\nGoodness',
    accent: '#FFF3CF',
    screen: 'explore',
  },
  {
    num: '03',
    title: 'Live life together',
    desc: 'Book, shop, connect and be part of the community.',
    note: 'More\nWagging\nMoments',
    accent: '#FFE4E1',
    screen: 'community',
  },
];

export const APP_FEATURES = [
  'Easy Booking',
  'Local Community',
  'Exclusive Deals',
  'All in One App',
];

/* Tiny inline avatars for the social-proof stack (no extra network cost
   beyond the four thumbnails, which are lazily fetched at 80px). */
export const PROOF_AVATARS = [
  U('1517849845537-4d257902454a', 80),
  U('1552053831-71594a27632d', 80),
  U('1537151608828-ea2b11777ee8', 80),
  U('1583511655857-d19b40a7a54e', 80),
];
