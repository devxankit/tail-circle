# Home Screen UI Design

## Overview
The Home Screen is the central hub. It needs to feel personalized to the *currently selected pet*. The layout is vertical, scrollable, with a floating bottom navigation bar.

## 1. Top Header (Sticky)
*   **Layout:** `flex justify-between items-center px-4 py-3 bg-bg-primary/90 backdrop-blur-md sticky top-0 z-50`.
*   **Left (Pet Switcher):**
    *   `Avatar` (Selected pet image, `w-10 h-10`).
    *   `Typography` (Greeting: "Hello, Max! 👋" - `text-lg font-bold`).
    *   Chevron down icon (Triggers Multi-pet switch bottom sheet).
*   **Right (Actions):**
    *   `IconButton` (Notification Bell with absolute positioned `Badge` for unread count, `bg-error text-white w-4 h-4 text-[10px] rounded-full`).

## 2. Search Bar
*   **Layout:** `px-4 mt-2 mb-6`.
*   **Component:** `SearchBar` (Input with left magnifying glass icon, soft grey bg `bg-bg-secondary rounded-2xl border-none pl-10 pr-4 h-12 text-sm`).
*   **UX:** Tapping opens a full-screen search view or expands a bottom sheet with recent searches.

## 3. Services Grid / Quick Actions
*   **Layout:** `grid grid-cols-4 gap-4 px-4 mb-8`.
*   **Items:** Matches, Meals, Shop, Doctor, Events, Community (Show top 4-8).
*   **Component (`ServiceIcon`):**
    *   `flex flex-col items-center gap-2`.
    *   Icon container: `w-14 h-14 rounded-2xl bg-primary-light/30 flex items-center justify-center text-primary-dark`.
    *   Label: `text-xs font-medium text-text-primary text-center`.

## 4. Promotions / Banner Carousel
*   **Layout:** `px-4 mb-8`.
*   **Component:** `BannerCarousel` (Horizontal scroll `flex overflow-x-auto snap-x hide-scrollbar gap-4`).
*   **Card:** `min-w-[280px] h-[140px] rounded-3xl bg-gradient-to-r from-primary-main to-accent-yellow p-5 relative overflow-hidden text-white snap-center`.
    *   Title: "50% off Premium Meals"
    *   Button: `bg-white/20 px-4 py-2 rounded-xl text-sm w-fit mt-3`.

## 5. Match Suggestions (Horizontal Scroll)
*   **Layout:** `mb-8`. Section Title (`px-4 flex justify-between` -> "New Playdates", "See all").
*   **Component:** `HorizontalList` `pl-4 flex overflow-x-auto gap-4 pb-2`.
*   **Card (`MiniPetCard`):**
    *   `w-[140px] rounded-2xl bg-white shadow-sm border border-border-light p-3`.
    *   Image: `w-full h-24 rounded-xl object-cover`.
    *   Name & Distance: `text-sm font-bold mt-2`, `text-xs text-text-secondary`.

## 6. Upcoming Events / Bookings
*   **Layout:** `px-4 mb-8`. Title: "Upcoming for Max".
*   **Component (`EventCard`):**
    *   `flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-border-light`.
    *   Date Box: `bg-bg-secondary w-12 h-12 rounded-xl flex flex-col items-center justify-center text-primary-main font-bold`.
    *   Details: Title, Time, Location.

## 7. Bottom Navigation (Fixed)
*   **Layout:** `fixed bottom-0 w-full h-[80px] bg-white border-t border-border-light flex justify-around items-center pb-safe z-50`.
*   **Items:** Home, Matches, Community, Shop, Profile.
*   **Active State:** Icon filled + `text-primary-main`. Inactive: `text-text-disabled`.

## Data from API
*   `GET /user/pets` (For switcher)
*   `GET /home/feed?petId=123` (Returns banners, top matches, upcoming events based on the pet's species/location).

## States
*   **Loading:** Skeletons for Header, Grid, and Cards (`animate-pulse bg-bg-secondary rounded-2xl`).
*   **Empty Upcoming:** Illustration of a calendar -> "No plans yet. Book a playdate or vet visit!"
*   **Error:** "Could not load feed. [Retry Button]" directly on the screen.
