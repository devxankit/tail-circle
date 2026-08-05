# Auth + Pet Onboarding UI Design

## General Rules for these Modules
*   **Theme:** Light, clean, off-white background (`bg-[#FDFDFD]`).
*   **Inputs:** Large touch targets, soft borders.
*   **Buttons:** Full width (`w-full`), 56px height (`h-14`), rounded-2xl.
*   **Transitions:** Smooth fade-ins for steps.

---

## 1. Splash Screen
*   **Layout:** Full screen centered logo.
*   **UI Elements:**
    *   TailCircle logo (animated pop-in or soft fade).
    *   Subtle gradient or solid brand color background (`bg-[#FF8A65]`).
*   **Tailwind:** `flex items-center justify-center h-screen bg-primary-main`
*   **Flow:** Auto-redirects to Login (if logged out) or Home (if logged in) after 2 seconds.

## 2. Login Screen
*   **Layout:** Top aligned logo, center aligned form, bottom aligned social logins.
*   **Components:**
    *   `Typography` (Welcome Back!).
    *   `InputField` (Email/Phone).
    *   `InputField` (Password, with eye icon for toggle).
    *   `Button` (Primary: Log In).
    *   `TextButton` (Forgot Password?).
    *   `Divider` (or login with).
    *   `Button` (Outline: Google / Apple).
*   **Tailwind:** `px-6 py-10 bg-bg-primary min-h-screen flex flex-col space-y-6`
*   **States:** Loading spinner inside Login button during API call.
*   **Validation:** Email format, Password min length.

## 3. Signup Screen
*   **Layout:** Similar to Login.
*   **Components:**
    *   `InputField` (Full Name, Email, Phone Number, Password).
    *   `Button` (Primary: Create Account).
    *   `Checkbox` (Terms & Conditions).
*   **Error State:** Inline red text `text-error text-xs mt-1` below inputs.

## 4. OTP Verify
*   **Layout:** Centered numeric inputs.
*   **Components:**
    *   `OTPInput` (4 or 6 boxes).
    *   `Typography` (We sent a code to +1 234...).
    *   `Button` (Primary: Verify).
    *   `TextButton` (Resend in 00:30).
*   **Tailwind:** `flex justify-between gap-2` for OTP boxes (`w-12 h-14 text-center text-xl rounded-xl border border-border-light focus:border-primary-main`).

## 5 & 6. Forgot / Reset Password
*   **Forgot Layout:** Input for Email/Phone -> Send Reset Link.
*   **Reset Layout:** Input for New Password -> Confirm New Password -> Update Button.

---

## Pet Onboarding Flow (Multi-step)

### 7. Add Pet Basic Details
*   **Layout:** Progress bar at the top (Step 1 of 3).
*   **Components:**
    *   `ProgressBar` (`w-1/3 bg-primary-main`).
    *   `InputField` (Pet Name).
    *   `Dropdown`/`BottomSheet` (Species: Dog, Cat, Bird, etc.).
    *   `Dropdown` (Breed).
    *   `ButtonGroup` (Gender: Male / Female selection pills).
    *   `InputField` (Date of Birth / Age).
*   **Tailwind:** Input wrappers: `flex flex-col gap-1.5 mb-5`. Pills: `flex-1 py-3 text-center rounded-xl border data-[active=true]:bg-primary-light`.

### 8. Upload Pet Media
*   **Layout:** Top progress bar (Step 2 of 3).
*   **Components:**
    *   `ImageUploader`: Large circular placeholder `w-32 h-32 rounded-full border-2 border-dashed border-primary-main bg-primary-light/20 flex items-center justify-center`.
    *   Camera Icon inside.
    *   `Button` (Primary: Continue).
    *   `TextButton` (Skip for now).
*   **State:** Loading overlay on image while uploading.

### 9. Pet Health Details
*   **Layout:** Top progress bar (Step 3 of 3).
*   **Components:**
    *   `InputField` (Weight in kg/lbs).
    *   `MultiSelectPills` (Dietary Restrictions / Allergies).
    *   `ToggleSwitch` (Neutered / Spayed?).
    *   `ToggleSwitch` (Vaccinated?).
    *   `Button` (Primary: Complete Profile).
*   **Success State:** Full screen Lottie animation of a happy pet -> Auto-redirects to Home.

### 10. Multi-pet Switch Screen (BottomSheet / Header Dropdown)
*   **Layout:** Appears when clicking the pet avatar on the Home screen header.
*   **Components:**
    *   `PetListItem`: Horizontal flex `flex items-center p-3 rounded-2xl hover:bg-bg-secondary`.
        *   Avatar (`w-12 h-12 rounded-full`).
        *   Name & Breed (`flex-col`).
        *   Check Icon (if currently selected, `text-primary-main`).
    *   `Button` (Outline: + Add another pet).
*   **UX Flow:** Tap a pet -> Global state updates -> Bottom sheet closes -> Home feed refreshes for the selected pet.
