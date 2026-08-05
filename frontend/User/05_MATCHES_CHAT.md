# Matches & Chat UI Design

## Overview
TailCircle matching is similar to dating apps but professional and friendly, focused on "playdates". Chat should feel fast and modern like WhatsApp or iMessage but tailored to pets.

## 1. Swipe Match Screen
*   **Layout:** Full screen minus top header and bottom nav.
*   **Component (`SwipeCard`):**
    *   Large image taking up 70% of screen height. `rounded-3xl overflow-hidden relative shadow-lg mx-4 mt-2`.
    *   Gradient overlay at the bottom of the image for text readability: `bg-gradient-to-t from-black/70 to-transparent`.
    *   Pet Details (absolute bottom inside card): Name, Age, Breed, Distance (e.g., "Max, 2 yrs • Golden Retriever • 2km away").
*   **Action Buttons (Floating below card):**
    *   `DislikeButton`: `w-14 h-14 rounded-full bg-white text-error shadow-md flex items-center justify-center`. (X icon)
    *   `SuperLikeButton`: `w-12 h-12 rounded-full bg-white text-accent-yellow shadow-md flex items-center justify-center`. (Star icon)
    *   `LikeButton`: `w-14 h-14 rounded-full bg-white text-success shadow-md flex items-center justify-center`. (Heart icon)
*   **Empty State:** "You've seen all the pets nearby! Check back later or expand your distance settings." with a radar scanning Lottie animation.

## 2. Pet Detail Page (Opened from tap on card)
*   **Layout:** Vertical scroll. Transparent header that turns solid white on scroll.
*   **Components:**
    *   Image Gallery: Swipeable full-width images.
    *   Info Section: `px-4 py-6 bg-white rounded-t-3xl -mt-6 relative z-10`.
    *   Tags/Badges: "Vaccinated", "Friendly with Kids", "High Energy". `bg-primary-light/30 text-primary-dark px-3 py-1 rounded-full text-xs`.
    *   Bio/About section.
*   **Floating Action:** Fixed CTA at bottom "Send Playdate Request".

## 3 & 4. Matched / Liked Profiles Grid
*   **Layout:** Grid view 2 columns `grid grid-cols-2 gap-4 px-4`.
*   **Tabs:** Top sticky tabs "New Matches" | "Liked You" (Blur effect for non-premium users on 'Liked You').
*   **Card:** Small square cards with pet photo, name, and green dot for online status.

## 5. Block / Report Bottom Sheet
*   **Trigger:** 3 dots menu top right of Pet Detail or Chat Room.
*   **Layout:** Bottom sheet slides up.
*   **Options:** `ListMenu` items ("Unmatch", "Report Profile", "Block [Pet Name]"). Red text for destructive actions.
*   **Report Flow:** Select reason -> Text input for details -> Submit.

## 6. Chat List Screen
*   **Layout:** Standard list view.
*   **Header:** Title "Messages", Search bar below it.
*   **Horizontal Row (New Matches):** Horizontal scroll of avatars with rings (like IG stories) for new matches you haven't messaged yet.
*   **List Item (`ChatRow`):**
    *   `flex items-center p-4 border-b border-border-light hover:bg-bg-secondary`.
    *   Avatar (`w-12 h-12 rounded-full`).
    *   Text Stack: Name (bold), Last message (truncate, gray).
    *   Right side: Timestamp, Unread Badge (`bg-primary-main text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]`).

## 7. Chat Room
*   **Header:** Back button, Pet Avatar, Pet Name, 3 dots.
*   **Chat Area:** `flex-1 bg-bg-secondary p-4 overflow-y-auto`.
    *   `MessageBubble (Self)`: `bg-primary-main text-white rounded-2xl rounded-tr-sm p-3 max-w-[75%] self-end`.
    *   `MessageBubble (Other)`: `bg-white text-text-primary rounded-2xl rounded-tl-sm p-3 max-w-[75%] shadow-sm self-start`.
    *   Date dividers ("Today", "Yesterday").
*   **Input Area (`ChatInputBar`):**
    *   `fixed bottom-0 w-full bg-white p-3 flex items-center gap-2 border-t border-border-light`.
    *   `IconButton` (+ icon for media).
    *   `InputField` (rounded-full bg-bg-secondary px-4 py-2 flex-1 outline-none).
    *   `IconButton` (Send arrow, `bg-primary-main text-white rounded-full p-2`).

## 8. Image/File/Location Send UI
*   **Trigger:** + Icon in chat input.
*   **Layout:** Bottom sheet expands showing icons: Camera, Gallery, Location, Document.
*   **Location Sharing:** Sends a static map snapshot inside a `MessageBubble` with a CTA "Open in Maps".
