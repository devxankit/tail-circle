# TailCircle Frontend Folder Structure
**Tech Stack:** React + Vite + Tailwind CSS

This is a production-level, scalable, feature-first (domain-driven) folder structure.

```text
src/
├── assets/                 # Static assets like images, fonts, global icons, Lottie JSONs
│   ├── images/
│   ├── icons/
│   └── animations/
├── components/             # Global shared UI components (Dumb/Presentational)
│   ├── ui/                 # Base elements (Button, Input, Card, Modal, Typography)
│   ├── form/               # Form-specific components (FormWrapper, Select, Checkbox)
│   ├── layout/             # Layout wrappers (ScreenContainer, BottomSheet)
│   └── feedback/           # Loaders, Skeletons, Toasts, EmptyStates
├── constants/              # Global constants and static data
│   ├── theme.js            # Tailwind custom config variables, light theme colors
│   ├── routes.js           # Route paths (e.g., ROUTES.HOME = '/home')
│   └── apiEndpoints.js     # API route definitions
├── features/               # Feature-based modules (Domain-driven design)
│   ├── auth/               # Login, Signup, OTP, Forgot Password
│   ├── onboarding/         # Pet Onboarding (Details, Media, Health)
│   ├── home/               # Main dashboard, selected pet switcher
│   ├── matches/            # Swipe matching, matched profiles
│   ├── chat/               # Chat list, Chat room, media sharing
│   ├── community/          # Feed, Post creation, Comments
│   ├── meals/              # Meal plans, delivery tracking
│   ├── shop/               # E-commerce, products, cart, checkout
│   ├── doctors/            # Vet listings, appointments, history
│   ├── events/             # Pet events, ticket booking
│   ├── memorial/           # Memorial services, support
│   ├── profile/            # User/Pet profiles, settings, history
│   ├── wallet/             # Balances, transactions, add money
│   └── notifications/      # Notification center, settings
├── hooks/                  # Global custom React hooks
│   ├── useAuth.js          # Authentication state hook
│   ├── usePet.js           # Current selected pet context
│   ├── useToast.js         # Global toast notification trigger
│   └── useDebounce.js      # Utility hook for search inputs
├── layouts/                # Page layout wrappers
│   ├── MainLayout.jsx      # Includes Bottom Nav and Top Header
│   ├── AuthLayout.jsx      # Clean layout for login/signup
│   └── FocusedLayout.jsx   # Header with back button, no bottom nav (for checkout/chat)
├── navigation/             # React Router setup
│   ├── AppRouter.jsx       # Main router component
│   ├── PrivateRoute.jsx    # Wrapper for authenticated routes
│   └── index.js
├── services/               # API and external integrations
│   ├── api.js              # Axios instance with interceptors
│   ├── authService.js      # Auth API calls
│   └── [feature]Service.js # E.g., petService.js, shopService.js
├── store/                  # Global state management (Zustand or Redux Toolkit)
│   ├── authStore.js
│   ├── petStore.js         # Manages multi-pet switching
│   └── cartStore.js
├── utils/                  # Pure helper functions
│   ├── formatters.js       # Date, currency, string formatting
│   ├── validators.js       # Regex for emails, passwords, etc.
│   └── helpers.js
├── App.jsx                 # Root component with Providers
├── index.css               # Global Tailwind imports & CSS variables
└── main.jsx                # React DOM entry point
```

## Folder Usage Explanations:
- **`features/`**: The core of the app. Instead of separating by file type (all components together, all hooks together), we separate by domain. `features/auth` has its own local components, hooks, and API calls. This keeps the codebase highly scalable.
- **`components/`**: Only truly shared, generic UI components go here. If a component is only used in `meals`, it stays inside `features/meals/components/`.
- **`services/`**: Centralized place for external API communication.
- **`layouts/`**: To prevent repeating the Header and BottomNav on every page, we use layout wrappers.
- **`store/`**: Global state that needs to be accessed across multiple features (like the currently active pet, or user session).
