# Community Module UI Design

## Overview
A real social feed tailored for pet owners. Supports image posts, text posts, asking questions, and seeking advice. Should feel alive and engaging.

## 1. Community Feed (Main Screen)
*   **Header:** "Community" title, plus icons for Search and Create Post (+).
*   **Filter Tabs (Horizontal scroll):** "All", "Advice", "Funny", "Lost & Found", "Health". `px-4 py-2 rounded-full border bg-white text-text-secondary`. Active: `bg-text-primary text-white`.
*   **Feed Layout:** Vertical scrolling list of `PostCard` components. `bg-bg-secondary` background to make white post cards pop.

## 2. Post Card Component (`PostCard`)
*   **Layout:** `bg-white p-4 mb-3 shadow-sm border-y border-border-light sm:rounded-xl sm:border-x sm:mx-2`.
*   **Header:**
    *   Avatar (`w-10 h-10 rounded-full`).
    *   Name + "in [Category]" (`text-sm font-bold`).
    *   Time ago (`text-xs text-text-secondary`).
    *   3-dot menu (Save, Report).
*   **Content:**
    *   Text (`text-base text-text-primary mt-2 whitespace-pre-wrap`).
    *   Image/Grid (if media present): `w-full h-64 object-cover rounded-xl mt-3`. If multiple images, use a grid layout or carousel.
*   **Footer (Actions):** `flex items-center justify-between mt-4 pt-3 border-t border-border-light`.
    *   Like: Heart icon + count. (Active state: `text-error fill-error`).
    *   Comment: Chat bubble icon + count.
    *   Share: Share icon.

## 3. Create Post
*   **Layout:** Full screen modal or dedicated page.
*   **Header:** "Cancel" (left), "Create Post" (center), "Publish" button (right, `text-primary-main font-bold`).
*   **Body:**
    *   Category Selector Dropdown at top.
    *   Large, borderless `TextArea` taking up remaining height. "What's on your mind about Max?".
    *   Media Preview Area: Horizontal list of selected image thumbnails with 'X' to remove.
*   **Footer Toolbar (sticky above keyboard):** `flex gap-4 p-3 bg-white border-t border-border-light`.
    *   Icons for Camera, Gallery, Tag Location.

## 4. Post Detail with Comments
*   **Layout:** Selected post at the top (full content), followed by a comments section.
*   **Comments Section:** `bg-bg-primary pt-4`.
    *   Title: "Comments (12)".
    *   `CommentRow`: Avatar + Bubble containing name, text, and timestamp. `flex gap-3 mb-4 px-4`.
*   **Reply Input:** Fixed at bottom, similar to chat input but says "Add a comment...".

## 5. Search Community
*   **Layout:** Search bar focused immediately.
*   **Recent Searches:** List of clickable tags below search bar.
*   **Results:** Tabbed view "Posts", "People", "Groups".

## 6. Saved Posts & Report Flow
*   **Saved Posts:** Accessible via Profile or Community Header menu. Simple vertical list of `PostCard` (maybe condensed versions).
*   **Report Flow:** Standard bottom sheet -> Select reason (Spam, Harassment, Unrelated) -> Success Toast.

## API Data Needed
*   `GET /feed?page=1&category=advice`
*   `POST /posts` (multipart/form-data for images)
*   `GET /posts/:id/comments`

## States
*   **Loading:** Skeleton `PostCard` (Circular pulse for avatar, rectangular pulse for text lines and image box).
*   **Empty State:** (If filtering by a rare category) Illustration of a dog looking through a magnifying glass. "No posts here yet. Be the first to post!"
