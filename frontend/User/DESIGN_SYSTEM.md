# TailCircle Base Mobile UI/UX Design System

## 1. Color Palette
TailCircle's palette is soft, clean, and premium, designed to give a friendly yet professional pet-care feel. We avoid overly bright and generic gradients, opting for subtle, nature-inspired tones.

*   **Backgrounds:**
    *   `Bg-Primary`: `#FDFDFD` (Off-white/Cream - Main app background)
    *   `Bg-Secondary`: `#F5F6F8` (For secondary sections, grouped lists)
    *   `Bg-Card`: `#FFFFFF` (Solid white for elevated cards)
*   **Primary Colors (Brand):**
    *   `Primary-Main`: `#FF8A65` (Warm, friendly Coral/Peach)
    *   `Primary-Light`: `#FFCCBC` (For subtle backgrounds, highlights)
    *   `Primary-Dark`: `#E64A19` (For pressed states, emphasis)
*   **Secondary/Accent Colors:**
    *   `Accent-Teal`: `#4DB6AC` (For health, doctors, positive actions)
    *   `Accent-Yellow`: `#FFD54F` (For events, premium matches)
*   **Text & Neutrals:**
    *   `Text-Primary`: `#2D3142` (Deep navy-grey for high readability, not pure black)
    *   `Text-Secondary`: `#9094A6` (For subtitles, timestamps)
    *   `Text-Disabled`: `#C5C8D4`
    *   `Border-Light`: `#EAECEF`
*   **Semantic Colors:**
    *   `Success`: `#4CAF50`
    *   `Error`: `#F44336` (Soft red)
    *   `Warning`: `#FF9800`

## 2. Typography Scale
We use a modern, clean, and friendly sans-serif font like **Inter** or **Nunito** (Nunito adds a softer, pet-friendly curve, while Inter is highly professional).

*   **Display / Header 1:** 28px, Bold (700), Line Height 34px (Page Titles)
*   **Header 2:** 24px, SemiBold (600), Line Height 30px (Section Titles)
*   **Header 3:** 20px, Medium (500), Line Height 26px (Card Titles)
*   **Body Large:** 16px, Regular (400) / Medium (500), Line Height 24px (Main Content)
*   **Body Medium:** 14px, Regular (400), Line Height 20px (Subtitles, Lists)
*   **Body Small:** 12px, Medium (500), Line Height 16px (Metadata, Tags, Bottom Nav)
*   **Caption:** 10px, Regular (400), Line Height 14px (Badges, Overlines)

## 3. Button Styles
Buttons should be rounded and accessible, with a large enough touch target (min 48px height) for mobile.

*   **Primary Button:**
    *   Background: `Primary-Main`
    *   Text: `#FFFFFF`, 16px SemiBold
    *   Border Radius: `16px` (or fully rounded `99px` for a softer look)
    *   State: Pressed (`Primary-Dark`), Disabled (`Bg-Secondary`, `Text-Disabled`)
*   **Secondary Button:**
    *   Background: `Primary-Light` (10-15% opacity of Primary-Main)
    *   Text: `Primary-Dark`
    *   Border Radius: `16px`
*   **Outline Button:**
    *   Border: 1.5px solid `Border-Light`
    *   Text: `Text-Primary`
    *   Background: Transparent
*   **Text/Ghost Button:**
    *   Text: `Text-Secondary` or `Primary-Main`
    *   No background, no border.

## 4. Input Fields
Inputs must look premium and uncluttered, preventing the "default web" look.

*   **Default State:**
    *   Background: `#FFFFFF` or `#F5F6F8`
    *   Border: 1px solid `Border-Light`
    *   Border Radius: `12px`
    *   Padding: 16px horizontal, 14px vertical
    *   Text Size: 16px (to prevent iOS auto-zoom)
*   **Focused State:**
    *   Border: 1.5px solid `Primary-Main`
    *   Shadow: `0 0 0 4px rgba(255, 138, 101, 0.1)`
*   **Error State:**
    *   Border: 1.5px solid `Error`
    *   Helper Text: 12px, `Error` color below the input.

## 5. Cards
Cards are the primary structural element for feeds, profiles, and shop items.

*   **Base Card:**
    *   Background: `Bg-Card` (#FFFFFF)
    *   Border Radius: `20px` (Generous rounding for a friendly feel)
    *   Padding: `16px` or `20px` internally.
    *   Shadow: Subtle drop shadow: `0px 4px 12px rgba(45, 49, 66, 0.04)`
    *   Border (optional): 1px solid `Border-Light` for flat design lovers.
*   **Interactive Card (Pressed):**
    *   Scale down slightly (`scale: 0.98`)
    *   Shadow reduces to `0px 2px 4px rgba(45, 49, 66, 0.04)`

## 6. Bottom Navigation
A highly utilized element, needs to be clear and ergonomic.

*   **Height:** 80px (Includes safe area for iOS).
*   **Background:** `#FFFFFF` with a subtle top shadow or border (`1px solid Border-Light`).
*   **Items (Max 5):**
    *   Icons: 24x24px, Outline style (Unselected), Filled style (Selected).
    *   Selected Color: `Primary-Main`.
    *   Unselected Color: `Text-Disabled`.
    *   Label: 10px, Medium (Only show on selected, or keep all visible if space permits).

## 7. Header Styles
*   **Global Top Bar:**
    *   Height: 56px (plus status bar).
    *   Background: `#FDFDFD` (matches app background to feel seamless).
    *   Title: 18px SemiBold, Centered.
    *   Left Action: Back arrow or Profile Avatar.
    *   Right Action: Notification bell or Settings gear.
*   **Transparent Header:** Used for pet profile covers. Fades to solid color on scroll.

## 8. Empty States
Empty states should be delightful, not dead ends.
*   **Visual:** Custom, soft illustration (e.g., a sleeping cat or a dog looking for a bone).
*   **Text:** Title (e.g., "No matches yet"), Subtitle ("Keep swiping to find playdates!").
*   **Action:** Primary button to guide the user (e.g., "Find Pets").

## 9. Loading States
*   **Global Loading:** Avoid full-screen blocking spinners. Use inline skeleton loaders matching the shape of the content (cards, avatars, text lines).
*   **Skeleton Color:** Shimmer effect from `#F0F2F5` to `#FAFAFA`.
*   **Pull to Refresh:** Custom animation (e.g., a wagging tail or a bouncing paw print).

## 10. Error States
*   **Inline Errors:** Soft red text below fields.
*   **Page Errors:** Illustration (e.g., a confused dog), "Oops! Something went wrong", and a "Retry" button.
*   **Toast Notifications:** Slide down from the top or bottom. Round pills, black background with white text, or soft red for errors.

## 11. Icon Style
*   **Family:** Use a consistent icon set like **Phosphor Icons**, **Feather Icons**, or **Lucide**.
*   **Style:** Line-based (1.5px or 2px stroke width), rounded terminals.
*   **Avoid:** Mixing filled and outlined icons randomly (unless for active/inactive states).

## 12. Spacing System
Use an 8pt grid system for consistent margins and paddings.
*   `xs`: 4px
*   `sm`: 8px
*   `md`: 16px (Standard screen edge padding)
*   `lg`: 24px (Spacing between major sections)
*   `xl`: 32px
*   `xxl`: 48px

## 13. Mobile Layout Rules
*   **Safe Areas:** Always account for iOS notches (top) and home indicators (bottom).
*   **Edge Padding:** Main content should have a minimum of `16px` or `20px` horizontal padding.
*   **Touch Targets:** Minimum `48x48px` for buttons, icons, and links to ensure accessibility.
*   **Scrolling:** Vertical scroll for feeds, horizontal scroll for categories, tags, or featured items (hide scrollbars).

## 14. Reusable Component List (Frontend Candidates)
1.  `Button` (Variants: Primary, Secondary, Outline, Text)
2.  `IconButton` (For back, close, heart, share)
3.  `InputField` (With support for icons and error text)
4.  `Card` (Base container)
5.  `Avatar` (Rounded image with size props: sm, md, lg)
6.  `Badge` (For unread counts, status tags)
7.  `BottomNav`
8.  `TopHeader` (With back button and title)
9.  `SkeletonLoader` (For loading states)
10. `BottomSheet` (For filters, options, instead of full-screen modals)

---

## 💻 Suggested Folder Structure (React / React Native)

We will structure the `User` folder to scale well with the pet ecosystem app features.
This structure is created under the frontend `User` directory as requested.

```text
User/
├── assets/             # Images, custom SVGs, Lottie animations
├── components/         # Reusable UI components
│   ├── atoms/          # Button, Input, Avatar, Typography
│   ├── molecules/      # FormField, SearchBar, UserListItem
│   ├── organisms/      # BottomNav, TopHeader, PetCard
│   └── templates/      # ScreenLayout, BottomSheetLayout
├── constants/          # Colors, Spacing, Typography scales, Config
│   ├── theme.js        # Exports the design tokens
│   └── layout.js       # Dimensions, screen widths
├── features/           # Domain-specific modules (The Ecosystem)
│   ├── profile/        # Pet & User profiles
│   ├── matches/        # Tinder-style or list matching
│   ├── community/      # Forums, posts, groups
│   ├── meals/          # Diet tracking, food planner
│   ├── shop/           # Marketplace, products
│   ├── health/         # Doctors, vaccinations, vet records
│   └── memorial/       # Memorial services
├── hooks/              # Custom hooks (e.g., useTheme, useKeyboard)
├── navigation/         # Routing setup (Bottom Tabs, Stacks)
├── screens/            # Page-level components connecting features
└── utils/              # Formatting helpers, platform checks
```

## 📐 Rules to Keep UI Consistent
1.  **Never Hardcode Colors/Spacing:** Always import from `theme.js` or use CSS/Tailwind variables. (e.g., `padding: theme.spacing.md` instead of `padding: 16px`).
2.  **Component First:** If you need a button, use the `<Button />` component. Do not style a raw `<button>` or `<TouchableOpacity>` in a screen.
3.  **One Source of Truth:** Keep typography styles in one file. Do not manually set `fontSize` and `fontWeight` randomly. Use predefined variants like `<Typography variant="h2">`.
4.  **Avoid Absolute Positioning (Mostly):** Rely on Flexbox for layouts to handle different screen sizes gracefully.
5.  **Test on Real Devices:** An emulator doesn't show how big a touch target actually feels. Always verify tap areas on a physical phone.
6.  **Accessibility:** Ensure sufficient color contrast (especially on text over Primary-Main background) and use proper accessibility labels for icon-only buttons.
