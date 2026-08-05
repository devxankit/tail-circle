# Doctor, Events & Memorial UI Design

## Overview
These modules deal with health, social life, and sensitive end-of-life care. The UI must adapt its tone: clinical and trustworthy for Doctors, exciting for Events, and deeply respectful/subdued for Memorials.

---

## 1. DOCTOR MODULE

### Doctor Listing & Search
*   **Theme:** Professional, trustworthy. Uses `Accent-Teal` heavily.
*   **Layout:** Search bar at top. Horizontal scroll for specialties (General, Dentist, Surgeon, Nutrition). Vertical list of doctors.
*   **`DoctorCard`:**
    *   Image left (`w-20 h-20 rounded-xl`).
    *   Right side: Name, Specialty, Experience (e.g., "10 yrs exp"), Star rating, Distance.
    *   "Available Today" badge in soft green.

### Doctor Profile & Booking
*   **Header:** Doctor Image, Name, Clinic Name.
*   **Tabs:** "About", "Reviews", "Availability".
*   **Booking Flow (Availability Tab):**
    *   Horizontal scroll for Dates (Mon 12, Tue 13).
    *   Grid of time slots (`bg-bg-secondary text-text-primary rounded-lg p-2 text-center`). Selected slot turns `bg-accent-teal text-white`.
    *   "Book Appointment" floating CTA.

### Video Consultation UI
*   **Layout:** Full screen video of doctor. Small floating PIP (Picture-in-Picture) of the user's camera bottom-right.
*   **Controls (Overlay bottom):** Mic toggle, Video toggle, Red end call button (`bg-error`).

### Medical History & Prescription View
*   **List View:** Timeline of visits.
*   **Prescription Card:** Clean white card, PDF icon, "Download" button. `bg-bg-secondary p-4 rounded-xl flex items-center justify-between`.

---

## 2. EVENTS MODULE

### Event Listing
*   **Theme:** Energetic, fun. Uses `Accent-Yellow` or `Primary-Main`.
*   **Layout:** Featured large banner at top. "Events near you" list.
*   **`EventCard` (Large):**
    *   Full-width image, rounded corners.
    *   Date/Month floating badge over image.
    *   Title, Location, Price below image.

### Event Detail & Booking
*   **Layout:** Large hero image.
*   **Content:** Title, "By [Organizer]", Date & Time row with calendar icon, Location row with map pin.
*   **Ticket Selection:** Stepper for quantity. "Add VIP Goodie Bag" switch.
*   **CTA:** "Buy Ticket - $25.00".

---

## 3. MEMORIAL MODULE

### Overview Rules
*   **Tone:** Highly respectful, emotional, trustworthy.
*   **Color Palette Adjustment:** Shift away from bright primary colors. Use muted tones, soft greys (`#F0F2F5`), very deep blues/navys (`#1E293B`), and white. No loud gradients.

### Memorial Service Page
*   **Hero Section:** Soft, serene stock photo (e.g., a quiet field, soft sunlight, paw prints). "Honoring their memory, always."
*   **Services Grid:** Clean, simple bordered cards.
    *   "Cremation Services"
    *   "Memorial Keepsakes"
    *   "Grief Counseling"

### Service Request Form
*   **Form Style:** Clean, minimalist inputs. Minimal distractions.
*   **Fields:** Pet Name, Date of Passing, Location, Preferred Service.
*   **CTA:** Muted primary button (e.g., deep navy `bg-text-primary text-white`).

### Tracking Status & Support
*   **Status Timeline:** Soft visual cues showing the respectful handling of the pet (e.g., "In our care", "Service in progress", "Ready to return home").
*   **Support Chat:** A dedicated, prioritized chat connection to a grief counselor or service manager. UI is standard chat but with a muted color scheme.

## Empty / Loading States
*   **Doctors Loading:** Skeleton list items.
*   **Events Empty:** "No events happening nearby this week. Check back soon!"
*   **Memorial Loading:** Simple, non-distracting spinner or fade-in. Avoid playful animations here.
