# Profile, Wallet & Notifications UI Design

## Overview
These are the account management modules. They need to be highly functional, clean, and organized using standard mobile patterns (List items, Toggles, Badges).

---

## 1. PROFILE MODULE

### Profile Dashboard (Menu)
*   **Header Section:**
    *   User Avatar & Name at top. "Edit Profile" text button.
    *   Horizontal scroll list of User's Pets below user info (allowing quick jumps to edit specific pets).
*   **List Menu Options (`SettingsRow` Component):**
    *   `flex items-center p-4 bg-white border-b border-border-light`.
    *   Left Icon (Grey), Title (Black text), Right Chevron (Grey).
    *   Groups:
        *   **Activity:** Booking History, Orders, Saved Posts.
        *   **Account:** Address Book, Wallet, Payment Methods.
        *   **App:** Settings (Language, Dark Mode), Notifications, Help/Support.
        *   **Logout:** Red text, no chevron.

### Edit User / Edit Pet
*   **Layout:** Standard form view.
*   **Avatar Upload:** Camera icon over current avatar.
*   **Save Button:** Sticky at bottom or in Top Right header.

### Booking History & Orders
*   **Layout:** Top tabs (e.g., "Appointments", "Events", "Shop").
*   **Cards:** Clean summary cards.
    *   Shop Order Card: Item image, Title, Status badge (Delivered), "Buy Again" outline button.
    *   Vet Appt Card: Doctor name, Date/Time, Status (Upcoming/Completed).

### Settings
*   **Components:** `ToggleSwitch` for settings like "Face ID Login", "Show location to matches".

---

## 2. WALLET MODULE

### Wallet Dashboard
*   **Top Card (Balance):**
    *   `bg-gradient-to-r from-[#2D3142] to-[#4DB6AC] text-white p-6 rounded-3xl m-4 shadow-lg relative`.
    *   "Available Balance", Large Amount (e.g., "$124.50").
    *   Background pattern or TailCircle watermark for premium feel.
*   **Quick Actions Row:** "Add Money", "Send", "Scan QR". (Round icon buttons below card).
*   **Transaction History:**
    *   Title "Recent Activity" + "See All".
    *   `TransactionRow`: Icon (cart for shop, stethoscope for vet), Title ("Purchase at TailShop"), Date, Amount (Green for credit `+$50`, Black for debit `-$24`).

### Add Money Flow
*   **Screen 1:** Large numpad input for amount. Preset buttons (+$50, +$100, +$500).
*   **Screen 2:** Select Payment Method bottom sheet (Credit Card, Apple Pay).
*   **Success:** "Money Added Successfully" Lottie checkmark.

---

## 3. NOTIFICATIONS MODULE

### Notification Center
*   **Layout:** Accessed via Bell icon on Home screen.
*   **Header:** "Notifications", "Mark all as read" button.
*   **Filter Tabs:** "All", "Matches", "Reminders", "System".
*   **`NotificationRow` Component:**
    *   `flex p-4 border-b border-border-light bg-white`. (Unread: `bg-primary-light/10`).
    *   Icon/Avatar left (`w-12 h-12 rounded-full`).
    *   Content: Bold user/app name, regular text for action ("Max's vet appointment is tomorrow!").
    *   Time: "2m ago" right-aligned or below text.
    *   Action Button (optional): e.g., "Confirm" for playdates.

### Notification Settings
*   **Layout:** List of `ToggleSwitch` rows.
*   **Categories:**
    *   "Push Notifications" (Master toggle).
    *   "Playdate Matches".
    *   "Community Tags & Replies".
    *   "Order Updates".
    *   "Meal Delivery".

## Empty States & Validation
*   **Wallet Empty:** "No transactions yet."
*   **Notifications Empty:** Illustration of a sleeping pet. "All caught up! No new notifications."
*   **Forms:** Required field validation triggers red borders and inline error text before saving.
