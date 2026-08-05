# Meal + Shop UI Design

## Overview
Premium E-commerce and Subscription management UI. Needs to feel trustworthy, appetizing (for meals), and extremely easy to navigate.

---

## MEAL SUBSCRIPTION UI

### 1. Meal Dashboard
*   **Header:** "Max's Meal Plan".
*   **Current Status Card:** `bg-accent-teal/10 border border-accent-teal rounded-2xl p-4 mb-6`.
    *   "Next Delivery: Tomorrow, 10 AM - 12 PM".
    *   Track Delivery Button (`bg-accent-teal text-white`).
*   **Menu Overview:** Horizontal scrolling cards showing upcoming meals for the week.
*   **Quick Actions:** "Pause Subscription", "Change Plan", "Update Allergies".

### 2. Free Trial / Plan Selection
*   **Layout:** Pricing table style but mobile-friendly vertical cards.
*   **Card (`PlanCard`):** `border-2 rounded-2xl p-5 mb-4 relative`.
    *   Active border: `border-primary-main`. Inactive: `border-border-light`.
    *   "Basic Plan", "Premium Fresh Food (Recommended)".
    *   Features list with checkmarks.
    *   Price per week.
*   **Bottom CTA:** Sticky "Start Free Trial" button.

### 3. Meal Preferences
*   **UI:** Questionnaire style (1 question per screen or long scrolling form).
*   **Inputs:** Multi-select image cards for proteins (Chicken, Beef, Fish). Slider for activity level.

### 4. Delivery Tracking
*   **Visual:** Top half map view (static or interactive).
*   **Bottom Sheet:** Details of the delivery partner, ETA, and a timeline stepper (Prepared -> Out for Delivery -> Arrived). `TimelineStepper` component with vertical lines and dots.

---

## SHOP UI (E-commerce)

### 1. Product Listing (Category / Search)
*   **Header:** Categories horizontal scroll (Food, Toys, Accessories, Grooming).
*   **Grid:** 2-column masonry or standard grid `grid grid-cols-2 gap-3 px-4`.
*   **`ProductCard` Component:**
    *   `bg-white rounded-xl shadow-sm overflow-hidden`.
    *   Image: `h-32 w-full object-cover bg-bg-secondary`.
    *   Badge: "10% OFF" absolute positioned top-left.
    *   Title: `text-sm font-medium mt-2 px-2 line-clamp-2`.
    *   Price: `text-primary-main font-bold px-2 pb-2`.
    *   Add to Cart Icon: Floating bottom-right of the image.

### 2. Product Detail
*   **Image Carousel:** Full width square images at the top, pagination dots.
*   **Info Section:** `bg-white -mt-4 rounded-t-3xl relative z-10 p-4`.
    *   Title, Price, Star Rating.
*   **Variants:** Size selector pills (S, M, L), Color swatches.
*   **Description/Specs:** Expandable accordions.
*   **Sticky Footer:** `flex items-center justify-between p-4 bg-white border-t fixed bottom-0 w-full`.
    *   Quantity selector (+ / -).
    *   "Add to Cart" massive button `flex-1 ml-4`.

### 3. Cart & Wishlist
*   **Cart Item (`CartRow`):** Image left, Title/Price center, Quantity controls right. Swipe left to delete.
*   **Summary:** Subtotal, Delivery Fee, Total. Fixed bottom checkout button.

### 4. Checkout Flow
*   **Accordion/Stepper Steps:** 1. Shipping Address, 2. Payment Method, 3. Review.
*   **Payment:** Integrates standard UI for Cards, UPI/Wallets (if applicable), Apple/Google Pay buttons.
*   **Success Screen:** Big green checkmark Lottie, "Order Confirmed!", Order ID, "Track Order" button.

### 5. Orders & Returns
*   **List:** History of orders with status badges (`bg-yellow-100 text-yellow-800` for Processing, `bg-green-100 text-green-800` for Delivered).
*   **Return Flow:** Select item -> Choose reason dropdown -> Upload photo (optional) -> Submit.

## Empty States
*   **Cart:** Illustration of an empty basket. "Your cart is hungry! Shop for treats."
*   **Orders:** "No orders yet."

## API Data Structure (Shop Item)
```json
{
  "id": "prod_123",
  "name": "Organic Beef Chew Bones",
  "price": 24.99,
  "discountPrice": null,
  "images": ["url1", "url2"],
  "rating": 4.8,
  "reviewsCount": 124,
  "variants": [{"size": "Large", "stock": 10}]
}
```
