import { PageLoader } from './PageLoader';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { MobileWrapper } from './modules/user/layouts/MobileWrapper';
import { isLoggedIn } from './services/api';
import { CallProvider } from './context/CallContext';
import { IncomingCallOverlay } from './modules/user/components/IncomingCallOverlay';

// Auth Module






// Onboarding Module






// App Module













// Adopt & Marketplace Module













// Daycare Module




















































// Admin & Vendor Web Modules



import { ShopVendorProvider } from './modules/Admin/ShopVendor/context/ShopVendorContext';
import { ClinicVendorProvider } from './modules/Admin/ClinicVeterinaryDoctor/context/ClinicVendorContext';













import { MealProviderProvider } from './modules/Admin/MealSubscriptionProvider/context/MealProviderContext';













import { PetEventsProvider } from './modules/Admin/PetEventsOrganizer/context/PetEventsContext';













import { MemorialProviderProvider } from './modules/Admin/MemorialProvider/context/MemorialProviderContext';













import { MealPortalProvider } from './modules/Admin/MealPortalAdmin/context/MealPortalContext';












// New Vendor Management Views































// Platform Views









import { ErrorBoundary } from './ErrorBoundary';

// Lazy Imports
const AuthLayout = lazy(() => import('./modules/user/layouts/AuthLayout').then(m => ({ default: m.AuthLayout })));
const Splash = lazy(() => import('./modules/user/features/auth/Splash').then(m => ({ default: m.Splash })));
const Login = lazy(() => import('./modules/user/features/auth/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./modules/user/features/auth/Signup').then(m => ({ default: m.Signup })));
const OtpVerify = lazy(() => import('./modules/user/features/auth/OtpVerify').then(m => ({ default: m.OtpVerify })));
const OnboardingLayout = lazy(() => import('./modules/user/features/onboarding/OnboardingLayout').then(m => ({ default: m.OnboardingLayout })));
const Step1Details = lazy(() => import('./modules/user/features/onboarding/Step1Details').then(m => ({ default: m.Step1Details })));
const Step2Media = lazy(() => import('./modules/user/features/onboarding/Step2Media').then(m => ({ default: m.Step2Media })));
const Step3Health = lazy(() => import('./modules/user/features/onboarding/Step3Health').then(m => ({ default: m.Step3Health })));
const WelcomeIntro = lazy(() => import('./modules/user/features/onboarding/WelcomeIntro').then(m => ({ default: m.WelcomeIntro })));
const MainLayout = lazy(() => import('./modules/user/layouts/MainLayout').then(m => ({ default: m.MainLayout })));
const Home = lazy(() => import('./modules/user/features/home/Home').then(m => ({ default: m.Home })));
const Matches = lazy(() => import('./modules/user/features/matches/Matches').then(m => ({ default: m.Matches })));
const ChatRoom = lazy(() => import('./modules/user/features/chat/ChatRoom').then(m => ({ default: m.ChatRoom })));
const Community = lazy(() => import('./modules/user/features/community/Community').then(m => ({ default: m.Community })));
const CreatePost = lazy(() => import('./modules/user/features/community/CreatePost').then(m => ({ default: m.CreatePost })));
const Shop = lazy(() => import('./modules/user/features/shop/Shop').then(m => ({ default: m.Shop })));
const ProductDetail = lazy(() => import('./modules/user/features/shop/ProductDetail').then(m => ({ default: m.ProductDetail })));
const Cart = lazy(() => import('./modules/user/features/shop/Cart').then(m => ({ default: m.Cart })));
const ShopCheckout = lazy(() => import('./modules/user/features/shop/ShopCheckout').then(m => ({ default: m.ShopCheckout })));
const OrderSuccess = lazy(() => import('./modules/user/features/shop/OrderSuccess').then(m => ({ default: m.OrderSuccess })));
const Marketplace = lazy(() => import('./modules/user/features/shop/Marketplace').then(m => ({ default: m.Marketplace })));
const AdoptHome = lazy(() => import('./modules/user/features/adopt/screens/AdoptHome').then(m => ({ default: m.AdoptHome })));
const PetListing = lazy(() => import('./modules/user/features/adopt/screens/PetListing').then(m => ({ default: m.PetListing })));
const PetDetail = lazy(() => import('./modules/user/features/adopt/screens/PetDetail').then(m => ({ default: m.PetDetail })));
const ShelterChat = lazy(() => import('./modules/user/features/adopt/screens/ShelterChat').then(m => ({ default: m.ShelterChat })));
const MyAdoptions = lazy(() => import('./modules/user/features/adopt/screens/MyAdoptions').then(m => ({ default: m.MyAdoptions })));
const ListPetForAdoption = lazy(() => import('./modules/user/features/adopt/screens/ListPetForAdoption').then(m => ({ default: m.ListPetForAdoption })));
const MyAdoptionListings = lazy(() => import('./modules/user/features/adopt/screens/MyAdoptionListings').then(m => ({ default: m.MyAdoptionListings })));
const AdoptionApplication = lazy(() => import('./modules/user/features/adopt/booking/AdoptionApplication').then(m => ({ default: m.AdoptionApplication })));
const HomeCheck = lazy(() => import('./modules/user/features/adopt/booking/HomeCheck').then(m => ({ default: m.HomeCheck })));
const ApplicationApproved = lazy(() => import('./modules/user/features/adopt/booking/ApplicationApproved').then(m => ({ default: m.ApplicationApproved })));
const MeetAndGreet = lazy(() => import('./modules/user/features/adopt/booking/MeetAndGreet').then(m => ({ default: m.MeetAndGreet })));
const AdoptionAgreement = lazy(() => import('./modules/user/features/adopt/booking/AdoptionAgreement').then(m => ({ default: m.AdoptionAgreement })));
const AdoptionFee = lazy(() => import('./modules/user/features/adopt/booking/AdoptionFee').then(m => ({ default: m.AdoptionFee })));
const AdoptionSuccess = lazy(() => import('./modules/user/features/adopt/booking/AdoptionSuccess').then(m => ({ default: m.AdoptionSuccess })));
const DaycareHome = lazy(() => import('./modules/user/features/daycare/screens/DaycareHome').then(m => ({ default: m.DaycareHome })));
const DaycareListing = lazy(() => import('./modules/user/features/daycare/screens/DaycareListing').then(m => ({ default: m.DaycareListing })));
const DaycareDetail = lazy(() => import('./modules/user/features/daycare/screens/DaycareDetail').then(m => ({ default: m.DaycareDetail })));
const SelectPlan = lazy(() => import('./modules/user/features/daycare/booking/SelectPlan').then(m => ({ default: m.SelectPlan })));
const SelectDateDuration = lazy(() => import('./modules/user/features/daycare/booking/SelectDateDuration').then(m => ({ default: m.SelectDateDuration })));
const PetInformation = lazy(() => import('./modules/user/features/daycare/booking/PetInformation').then(m => ({ default: m.PetInformation })));
const PickupDrop = lazy(() => import('./modules/user/features/daycare/booking/PickupDrop').then(m => ({ default: m.PickupDrop })));
const DaycarePriceSummary = lazy(() => import('./modules/user/features/daycare/booking/DaycarePriceSummary').then(m => ({ default: m.DaycarePriceSummary })));
const DaycarePayment = lazy(() => import('./modules/user/features/daycare/booking/DaycarePayment').then(m => ({ default: m.DaycarePayment })));
const DaycareBookingConfirmed = lazy(() => import('./modules/user/features/daycare/booking/DaycareBookingConfirmed').then(m => ({ default: m.DaycareBookingConfirmed })));
const DaycareBookingDetail = lazy(() => import('./modules/user/features/daycare/booking/DaycareBookingDetail').then(m => ({ default: m.DaycareBookingDetail })));
const DoctorList = lazy(() => import('./modules/user/features/doctors/DoctorList').then(m => ({ default: m.DoctorList })));
const DoctorDetail = lazy(() => import('./modules/user/features/doctors/DoctorDetail').then(m => ({ default: m.DoctorDetail })));
const DoctorCheckout = lazy(() => import('./modules/user/features/doctors/DoctorCheckout').then(m => ({ default: m.DoctorCheckout })));
const DoctorSuccess = lazy(() => import('./modules/user/features/doctors/DoctorSuccess').then(m => ({ default: m.DoctorSuccess })));
const ConsultCall = lazy(() => import('./modules/user/features/doctors/ConsultCall').then(m => ({ default: m.ConsultCall })));
const EventList = lazy(() => import('./modules/user/features/events/EventList').then(m => ({ default: m.EventList })));
const EventDetail = lazy(() => import('./modules/user/features/events/EventDetail').then(m => ({ default: m.EventDetail })));
const EventCheckout = lazy(() => import('./modules/user/features/events/EventCheckout').then(m => ({ default: m.EventCheckout })));
const TicketSuccess = lazy(() => import('./modules/user/features/events/TicketSuccess').then(m => ({ default: m.TicketSuccess })));
const MyEventTickets = lazy(() => import('./modules/user/features/events/MyEventTickets').then(m => ({ default: m.MyEventTickets })));
const MemorialService = lazy(() => import('./modules/user/features/memorial/MemorialService').then(m => ({ default: m.MemorialService })));
const GroomingList = lazy(() => import('./modules/user/features/grooming/GroomingList').then(m => ({ default: m.GroomingList })));
const GroomingListing = lazy(() => import('./modules/user/features/grooming/GroomingListing').then(m => ({ default: m.GroomingListing })));
const GroomingDetail = lazy(() => import('./modules/user/features/grooming/GroomingDetail').then(m => ({ default: m.GroomingDetail })));
const SelectPackage = lazy(() => import('./modules/user/features/grooming/booking/SelectPackage').then(m => ({ default: m.SelectPackage })));
const SelectSlot = lazy(() => import('./modules/user/features/grooming/booking/SelectSlot').then(m => ({ default: m.SelectSlot })));
const PetDetails = lazy(() => import('./modules/user/features/grooming/booking/PetDetails').then(m => ({ default: m.PetDetails })));
const VisitAddress = lazy(() => import('./modules/user/features/grooming/booking/VisitAddress').then(m => ({ default: m.VisitAddress })));
const PriceSummary = lazy(() => import('./modules/user/features/grooming/booking/PriceSummary').then(m => ({ default: m.PriceSummary })));
const BookingConfirmed = lazy(() => import('./modules/user/features/grooming/booking/BookingConfirmed').then(m => ({ default: m.BookingConfirmed })));
const GroomingBookingDetail = lazy(() => import('./modules/user/features/grooming/booking/MyBookingDetail').then(m => ({ default: m.MyBookingDetail })));
const Profile = lazy(() => import('./modules/user/features/profile/Profile').then(m => ({ default: m.Profile })));
const Wallet = lazy(() => import('./modules/user/features/wallet/Wallet').then(m => ({ default: m.Wallet })));
const Notifications = lazy(() => import('./modules/user/features/notifications/Notifications').then(m => ({ default: m.Notifications })));
const BookingHistory = lazy(() => import('./modules/user/features/profile/screens/BookingHistory').then(m => ({ default: m.BookingHistory })));
const BookingDetail = lazy(() => import('./modules/user/features/profile/screens/BookingDetail').then(m => ({ default: m.BookingDetail })));
const MyOrders = lazy(() => import('./modules/user/features/profile/screens/MyOrders').then(m => ({ default: m.MyOrders })));
const SavedItems = lazy(() => import('./modules/user/features/profile/screens/SavedItems').then(m => ({ default: m.SavedItems })));
const MyPosts = lazy(() => import('./modules/user/features/profile/screens/MyPosts').then(m => ({ default: m.MyPosts })));
const AddressBook = lazy(() => import('./modules/user/features/profile/screens/AddressBook').then(m => ({ default: m.AddressBook })));
const AddAddress = lazy(() => import('./modules/user/features/profile/screens/AddAddress').then(m => ({ default: m.AddAddress })));
const HelpSupport = lazy(() => import('./modules/user/features/profile/screens/HelpSupport').then(m => ({ default: m.HelpSupport })));
const EditProfile = lazy(() => import('./modules/user/features/profile/screens/EditProfile').then(m => ({ default: m.EditProfile })));
const AddPet = lazy(() => import('./modules/user/features/profile/screens/AddPet').then(m => ({ default: m.AddPet })));
const TrackDelivery = lazy(() => import('./modules/user/features/meals/screens/TrackDelivery').then(m => ({ default: m.TrackDelivery })));
const ChangePlan = lazy(() => import('./modules/user/features/meals/screens/ChangePlan').then(m => ({ default: m.ChangePlan })));
const PlanDetail = lazy(() => import('./modules/user/features/meals/screens/PlanDetail').then(m => ({ default: m.PlanDetail })));
const UpdateAllergies = lazy(() => import('./modules/user/features/meals/screens/UpdateAllergies').then(m => ({ default: m.UpdateAllergies })));
const PauseSubscription = lazy(() => import('./modules/user/features/meals/screens/PauseSubscription').then(m => ({ default: m.PauseSubscription })));
const MealSubscribeFlow = lazy(() => import('./modules/user/features/meals/MealSubscribeFlow').then(m => ({ default: m.MealSubscribeFlow })));
const UserMealDashboard = lazy(() => import('./modules/user/features/meals/MealDashboard').then(m => ({ default: m.MealDashboard })));
const VendorLayout = lazy(() => import('./modules/Admin/layouts/VendorLayout').then(m => ({ default: m.VendorLayout || m.default })));
const AdminLayout = lazy(() => import('./modules/Admin/layouts/AdminLayout').then(m => ({ default: m.AdminLayout || m.default })));
const VendorAuth = lazy(() => import('./modules/Admin/auth/VendorAuth').then(m => ({ default: m.VendorAuth || m.default })));
const AdminLogin = lazy(() => import('./modules/Admin/auth/AdminLogin').then(m => ({ default: m.AdminLogin || m.default })));
const ProviderVendorPortal = lazy(() => import('./modules/Admin/ProviderVendor/ProviderVendorPortal').then(m => ({ default: m.ProviderVendorPortal || m.default })));
const GroomingVendorPortal = lazy(() => import('./modules/Admin/GroomingVendor/GroomingVendorPortal').then(m => ({ default: m.GroomingVendorPortal || m.default })));
const DaycareVendorPortal = lazy(() => import('./modules/Admin/DaycareVendor/DaycareVendorPortal').then(m => ({ default: m.DaycareVendorPortal || m.default })));
const AdoptionVendorPortal = lazy(() => import('./modules/Admin/AdoptionVendor/AdoptionVendorPortal').then(m => ({ default: m.AdoptionVendorPortal || m.default })));
const ShopVendorLayout = lazy(() => import('./modules/Admin/ShopVendor/ShopVendorLayout').then(m => ({ default: m.ShopVendorLayout || m.default })));
const ShopDashboard = lazy(() => import('./modules/Admin/ShopVendor/views/DashboardOverview').then(m => ({ default: m.DashboardOverview || m.default })));
const ShopProductsView = lazy(() => import('./modules/Admin/ShopVendor/views/ProductsView').then(m => ({ default: m.ProductsView || m.default })));
const ShopBannersView = lazy(() => import('./modules/Admin/ShopVendor/views/ShopBannersView').then(m => ({ default: m.ShopBannersView || m.default })));
const ShopOrdersView = lazy(() => import('./modules/Admin/ShopVendor/views/OrdersView').then(m => ({ default: m.OrdersView || m.default })));
const ShopInventoryView = lazy(() => import('./modules/Admin/ShopVendor/views/InventoryView').then(m => ({ default: m.InventoryView || m.default })));
const ShopReturnsView = lazy(() => import('./modules/Admin/ShopVendor/views/ReturnsRefundsView').then(m => ({ default: m.ReturnsRefundsView || m.default })));
const ShopFeedbackView = lazy(() => import('./modules/Admin/ShopVendor/views/CustomerFeedbackView').then(m => ({ default: m.CustomerFeedbackView || m.default })));
const ShopFinanceView = lazy(() => import('./modules/Admin/ShopVendor/views/FinanceCenterView').then(m => ({ default: m.FinanceCenterView || m.default })));
const ShopSettingsView = lazy(() => import('./modules/Admin/ShopVendor/views/BusinessControlCenterView').then(m => ({ default: m.BusinessControlCenterView || m.default })));
const DoctorManagement = lazy(() => import('./modules/Admin/ClinicVeterinaryDoctor/DoctorManagement').then(m => ({ default: m.DoctorManagement || m.default })));
const VendorPayouts = lazy(() => import('./modules/Admin/vendor/CommonVendorPages').then(m => ({ default: m.VendorPayouts || m.default })));
const VendorSupport = lazy(() => import('./modules/Admin/vendor/CommonVendorPages').then(m => ({ default: m.VendorSupport || m.default })));
const VendorSettings = lazy(() => import('./modules/Admin/vendor/CommonVendorPages').then(m => ({ default: m.VendorSettings || m.default })));
const MealProviderLayout = lazy(() => import('./modules/Admin/MealSubscriptionProvider/MealProviderLayout').then(m => ({ default: m.MealProviderLayout || m.default })));
const MealDashboard = lazy(() => import('./modules/Admin/MealSubscriptionProvider/views/DashboardOverview').then(m => ({ default: m.DashboardOverview || m.default })));
const MealPlansView = lazy(() => import('./modules/Admin/MealSubscriptionProvider/views/MealPlansView').then(m => ({ default: m.MealPlansView || m.default })));
const SubscriptionsView = lazy(() => import('./modules/Admin/MealSubscriptionProvider/views/SubscriptionsView').then(m => ({ default: m.SubscriptionsView || m.default })));
const TrialMealsView = lazy(() => import('./modules/Admin/MealSubscriptionProvider/views/TrialMealsView').then(m => ({ default: m.TrialMealsView || m.default })));
const DeliveryManagementView = lazy(() => import('./modules/Admin/MealSubscriptionProvider/views/DeliveryManagementView').then(m => ({ default: m.DeliveryManagementView || m.default })));
const KitchenQueueView = lazy(() => import('./modules/Admin/MealSubscriptionProvider/views/KitchenQueueView').then(m => ({ default: m.KitchenQueueView || m.default })));
const LiveTrackingView = lazy(() => import('./modules/Admin/MealSubscriptionProvider/views/LiveTrackingView').then(m => ({ default: m.LiveTrackingView || m.default })));
const BusinessControlCenterView = lazy(() => import('./modules/Admin/MealSubscriptionProvider/views/BusinessControlCenterView').then(m => ({ default: m.BusinessControlCenterView || m.default })));
const CustomerFeedbackView = lazy(() => import('./modules/Admin/MealSubscriptionProvider/views/CustomerFeedbackView').then(m => ({ default: m.CustomerFeedbackView || m.default })));
const FinanceCenterView = lazy(() => import('./modules/Admin/MealSubscriptionProvider/views/FinanceCenterView').then(m => ({ default: m.FinanceCenterView || m.default })));
const PetEventsLayout = lazy(() => import('./modules/Admin/PetEventsOrganizer/PetEventsLayout').then(m => ({ default: m.PetEventsLayout || m.default })));
const DashboardOverview = lazy(() => import('./modules/Admin/PetEventsOrganizer/views/DashboardOverview').then(m => ({ default: m.DashboardOverview || m.default })));
const EventsView = lazy(() => import('./modules/Admin/PetEventsOrganizer/views/EventsView').then(m => ({ default: m.EventsView || m.default })));
const CreateEventView = lazy(() => import('./modules/Admin/PetEventsOrganizer/views/CreateEventView').then(m => ({ default: m.CreateEventView || m.default })));
const BookingsView = lazy(() => import('./modules/Admin/PetEventsOrganizer/views/BookingsView').then(m => ({ default: m.BookingsView || m.default })));
const CalendarView = lazy(() => import('./modules/Admin/PetEventsOrganizer/views/CalendarView').then(m => ({ default: m.CalendarView || m.default })));
const PackagesAddonsView = lazy(() => import('./modules/Admin/PetEventsOrganizer/views/PackagesAddonsView').then(m => ({ default: m.PackagesAddonsView || m.default })));
const EventGalleryView = lazy(() => import('./modules/Admin/PetEventsOrganizer/views/EventGalleryView').then(m => ({ default: m.EventGalleryView || m.default })));
const CustomerRequestsView = lazy(() => import('./modules/Admin/PetEventsOrganizer/views/CustomerRequestsView').then(m => ({ default: m.CustomerRequestsView || m.default })));
const EventsFeedbackView = lazy(() => import('./modules/Admin/PetEventsOrganizer/views/CustomerFeedbackView').then(m => ({ default: m.CustomerFeedbackView || m.default })));
const EventsFinanceView = lazy(() => import('./modules/Admin/PetEventsOrganizer/views/FinanceCenterView').then(m => ({ default: m.FinanceCenterView || m.default })));
const EventsSettingsView = lazy(() => import('./modules/Admin/PetEventsOrganizer/views/BusinessControlCenterView').then(m => ({ default: m.BusinessControlCenterView || m.default })));
const MemorialProviderLayout = lazy(() => import('./modules/Admin/MemorialProvider/MemorialProviderLayout').then(m => ({ default: m.MemorialProviderLayout || m.default })));
const MemorialDashboard = lazy(() => import('./modules/Admin/MemorialProvider/views/DashboardOverview').then(m => ({ default: m.DashboardOverview || m.default })));
const MemorialRequests = lazy(() => import('./modules/Admin/MemorialProvider/views/ServiceRequestsView').then(m => ({ default: m.ServiceRequestsView || m.default })));
const MemorialCalendar = lazy(() => import('./modules/Admin/MemorialProvider/views/ScheduleCalendarView').then(m => ({ default: m.ScheduleCalendarView || m.default })));
const MemorialTeam = lazy(() => import('./modules/Admin/MemorialProvider/views/TeamAssignmentView').then(m => ({ default: m.TeamAssignmentView || m.default })));
const MemorialServicesView = lazy(() => import('./modules/Admin/MemorialProvider/views/MemorialServicesView').then(m => ({ default: m.MemorialServicesView || m.default })));
const MemoryAddonsView = lazy(() => import('./modules/Admin/MemorialProvider/views/MemoryAddonsView').then(m => ({ default: m.MemoryAddonsView || m.default })));
const ServiceProofsView = lazy(() => import('./modules/Admin/MemorialProvider/views/ServiceProofsView').then(m => ({ default: m.ServiceProofsView || m.default })));
const MemorialSupport = lazy(() => import('./modules/Admin/MemorialProvider/views/CustomerSupportView').then(m => ({ default: m.CustomerSupportView || m.default })));
const MemorialFinance = lazy(() => import('./modules/Admin/MemorialProvider/views/FinanceCenterView').then(m => ({ default: m.FinanceCenterView || m.default })));
const MemorialSettings = lazy(() => import('./modules/Admin/MemorialProvider/views/BusinessControlCenterView').then(m => ({ default: m.BusinessControlCenterView || m.default })));
const MealPortalAdminLayout = lazy(() => import('./modules/Admin/MealPortalAdmin/MealPortalAdminLayout').then(m => ({ default: m.MealPortalAdminLayout || m.default })));
const SuperAdminDashboard = lazy(() => import('./modules/Admin/MealPortalAdmin/views/DashboardOverview').then(m => ({ default: m.DashboardOverview || m.default })));
const TrialMealsAdminView = lazy(() => import('./modules/Admin/MealPortalAdmin/views/TrialMealsAdminView').then(m => ({ default: m.TrialMealsAdminView || m.default })));
const SubscriptionsAdminView = lazy(() => import('./modules/Admin/MealPortalAdmin/views/SubscriptionsAdminView').then(m => ({ default: m.SubscriptionsAdminView || m.default })));
const SuperDeliveryView = lazy(() => import('./modules/Admin/MealPortalAdmin/views/DeliveryOperationsView').then(m => ({ default: m.DeliveryOperationsView || m.default })));
const VendorsManagementView = lazy(() => import('./modules/Admin/MealPortalAdmin/views/VendorsManagementView').then(m => ({ default: m.VendorsManagementView || m.default })));
const FinanceAdminView = lazy(() => import('./modules/Admin/MealPortalAdmin/views/FinanceAdminView').then(m => ({ default: m.FinanceAdminView || m.default })));
const AdminDashboard = lazy(() => import('./modules/Admin/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard || m.default })));
const AdminManagement = lazy(() => import('./modules/Admin/admin/AdminManagement').then(m => ({ default: m.AdminManagement || m.default })));
const Users = lazy(() => import('./modules/Admin/admin/views/users/Users').then(m => ({ default: m.Users || m.default })));
const Pets = lazy(() => import('./modules/Admin/admin/views/users/Pets').then(m => ({ default: m.Pets || m.default })));
const AllVendors = lazy(() => import('./modules/Admin/admin/views/vendors/AllVendors').then(m => ({ default: m.AllVendors || m.default })));
const PendingApprovals = lazy(() => import('./modules/Admin/admin/views/vendors/PendingApprovals').then(m => ({ default: m.PendingApprovals || m.default })));
const ShopVendors = lazy(() => import('./modules/Admin/admin/views/vendors/ShopVendors').then(m => ({ default: m.ShopVendors || m.default })));
const MealProviders = lazy(() => import('./modules/Admin/admin/views/vendors/MealProviders').then(m => ({ default: m.MealProviders || m.default })));
const EventOrganizers = lazy(() => import('./modules/Admin/admin/views/vendors/EventOrganizers').then(m => ({ default: m.EventOrganizers || m.default })));
const DoctorsClinics = lazy(() => import('./modules/Admin/admin/views/vendors/DoctorsClinics').then(m => ({ default: m.DoctorsClinics || m.default })));
const MemorialProviders = lazy(() => import('./modules/Admin/admin/views/vendors/MemorialProviders').then(m => ({ default: m.MemorialProviders || m.default })));
const VendorDocuments = lazy(() => import('./modules/Admin/admin/views/vendors/VendorDocuments').then(m => ({ default: m.VendorDocuments || m.default })));
const VendorPerformance = lazy(() => import('./modules/Admin/admin/views/vendors/VendorPerformance').then(m => ({ default: m.VendorPerformance || m.default })));
const Orders = lazy(() => import('./modules/Admin/admin/views/operations/Orders').then(m => ({ default: m.Orders || m.default })));
const Bookings = lazy(() => import('./modules/Admin/admin/views/operations/Bookings').then(m => ({ default: m.Bookings || m.default })));
const Appointments = lazy(() => import('./modules/Admin/admin/views/operations/Appointments').then(m => ({ default: m.Appointments || m.default })));
const Deliveries = lazy(() => import('./modules/Admin/admin/views/operations/Deliveries').then(m => ({ default: m.Deliveries || m.default })));
const Returns = lazy(() => import('./modules/Admin/admin/views/operations/Returns').then(m => ({ default: m.Returns || m.default })));
const Support = lazy(() => import('./modules/Admin/admin/views/operations/Support').then(m => ({ default: m.Support || m.default })));
const Products = lazy(() => import('./modules/Admin/admin/views/services/Products').then(m => ({ default: m.Products || m.default })));
const ProductCategories = lazy(() => import('./modules/Admin/admin/views/services/ProductCategories').then(m => ({ default: m.ProductCategories || m.default })));
const MealPlans = lazy(() => import('./modules/Admin/admin/views/services/MealPlans').then(m => ({ default: m.MealPlans || m.default })));
const DoctorServices = lazy(() => import('./modules/Admin/admin/views/services/DoctorServices').then(m => ({ default: m.DoctorServices || m.default })));
const EventCategories = lazy(() => import('./modules/Admin/admin/views/services/EventCategories').then(m => ({ default: m.EventCategories || m.default })));
const MemorialPackages = lazy(() => import('./modules/Admin/admin/views/services/MemorialPackages').then(m => ({ default: m.MemorialPackages || m.default })));
const GroomingDayCare = lazy(() => import('./modules/Admin/admin/views/services/GroomingDayCare').then(m => ({ default: m.GroomingDayCare || m.default })));
const AddonsAmenities = lazy(() => import('./modules/Admin/admin/views/services/AddonsAmenities').then(m => ({ default: m.AddonsAmenities || m.default })));
const BreedManagement = lazy(() => import('./modules/Admin/admin/views/services/BreedManagement').then(m => ({ default: m.BreedManagement || m.default })));
const Transactions = lazy(() => import('./modules/Admin/admin/views/finance/Transactions').then(m => ({ default: m.Transactions || m.default })));
const Payments = lazy(() => import('./modules/Admin/admin/views/finance/Payments').then(m => ({ default: m.Payments || m.default })));
const Commission = lazy(() => import('./modules/Admin/admin/views/finance/Commission').then(m => ({ default: m.Commission || m.default })));
const AdminVendorPayouts = lazy(() => import('./modules/Admin/admin/views/finance/VendorPayouts').then(m => ({ default: m.VendorPayouts || m.default })));
const AdminWallet = lazy(() => import('./modules/Admin/admin/views/finance/Wallet').then(m => ({ default: m.Wallet || m.default })));
const TaxGSTReports = lazy(() => import('./modules/Admin/admin/views/finance/TaxGSTReports').then(m => ({ default: m.TaxGSTReports || m.default })));
const AdminNotifications = lazy(() => import('./modules/Admin/admin/views/platform/Notifications').then(m => ({ default: m.Notifications || m.default })));
const AdminCommunity = lazy(() => import('./modules/Admin/admin/views/platform/Community').then(m => ({ default: m.Community || m.default })));
const Reviews = lazy(() => import('./modules/Admin/admin/views/platform/Reviews').then(m => ({ default: m.Reviews || m.default })));
const BannersContent = lazy(() => import('./modules/Admin/admin/views/platform/BannersContent').then(m => ({ default: m.BannersContent || m.default })));
const Reports = lazy(() => import('./modules/Admin/admin/views/platform/Reports').then(m => ({ default: m.Reports || m.default })));
const Security = lazy(() => import('./modules/Admin/admin/views/platform/Security').then(m => ({ default: m.Security || m.default })));
const Staff = lazy(() => import('./modules/Admin/admin/views/platform/Staff').then(m => ({ default: m.Staff || m.default })));
const AdminSettings = lazy(() => import('./modules/Admin/admin/views/platform/Settings').then(m => ({ default: m.AdminSettings || m.Settings || m.default })));


// ─── User App Route Guard ──────────────────────────────────────────────────
function RequireAuth() {
  if (!isLoggedIn()) {
    return <Navigate to="/auth/login" replace />;
  }
  return <Outlet />;
}

// ─── Admin Route Guard ─────────────────────────────────────────────────────
function ProtectedAdminRoute({ children }) {
  const token = localStorage.getItem('tc_access_token');
  const info = localStorage.getItem('admin_info');
  if (!token || !info) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

/** Backend vendorType → the portal each vendor belongs in. */
const VENDOR_HOME = {
  shop: '/vendor/shop-provider',
  clinic: '/vendor/doctor/consultations',
  meal_subscription: '/vendor/meal-provider/dashboard',
  events: '/vendor/events-organizer',
  memorial: '/vendor/memorial-provider',
  grooming: '/vendor/grooming-provider',
  daycare: '/vendor/daycare-provider',
  adoption: '/vendor/adoption-partner',
};

/**
 * Vendor route guard.
 *
 * `allow` names the vendorType(s) a portal belongs to. A vendor who lands on
 * someone else's portal is sent to their own home rather than left on a screen
 * that can only ever error — the API refuses cross-type data, so without this
 * they'd see a permanently broken page.
 *
 * Omitting `allow` marks a route as shared by every vendor (profile, payouts,
 * settings, support).
 */
function ProtectedVendorRoute({ children, allow }) {
  const token = localStorage.getItem('tc_access_token');
  const info = localStorage.getItem('vendor_info');
  if (!token || !info) {
    return <Navigate to="/vendor/login" replace />;
  }

  if (allow) {
    let vendorType = null;
    try {
      vendorType = JSON.parse(info)?.profile?.vendorType ?? null;
    } catch {
      return <Navigate to="/vendor/login" replace />;
    }
    const allowed = Array.isArray(allow) ? allow : [allow];
    if (vendorType && !allowed.includes(vendorType)) {
      return <Navigate to={VENDOR_HOME[vendorType] || '/vendor/login'} replace />;
    }
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <MobileWrapper>
        <ErrorBoundary>
          {/* Wraps the router so an in-progress consultation survives navigation. */}
          <CallProvider>
          <Suspense fallback={<PageLoader />}><Routes>
            <Route path="/" element={<Navigate to="/splash" replace />} />
            <Route path="/splash" element={<Splash />} />
            
            {/* Auth Routes */}
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="otp" element={<OtpVerify />} />
            </Route>

            {/* Authenticated user app (everything below needs a session) */}
            <Route element={<RequireAuth />}>

            {/* Onboarding Routes */}
            <Route path="/onboarding" element={<OnboardingLayout />}>
              <Route path="step1" element={<Step1Details />} />
              <Route path="step2" element={<Step2Media />} />
              <Route path="step3" element={<Step3Health />} />
            </Route>
            <Route path="/welcome" element={<WelcomeIntro />} />

            {/* Main App Routes with Bottom Nav */}
            <Route path="/app" element={<MainLayout />}>
              <Route path="home" element={<Home />} />
              <Route path="matches" element={<Matches />} />
              <Route path="community" element={<Community />} />
              <Route path="shop" element={<Shop />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Full Screen Modals/Pages */}
            <Route path="/app/chat/room" element={<ChatRoom />} />
            {/* Matches, match notifications and the matches list all link to
                /app/chat/room/<conversationId>. Only the bare path was
                registered, so every one of those landed on "No routes
                matched" and a blank screen. */}
            <Route path="/app/chat/room/:conversationId" element={<ChatRoom />} />
            <Route path="/app/community/create" element={<CreatePost />} />
            <Route path="/app/shop/product/:id" element={<ProductDetail />} />
            <Route path="/app/shop/cart" element={<Cart />} />
            <Route path="/app/shop/checkout" element={<ShopCheckout />} />
            <Route path="/app/shop/success" element={<OrderSuccess />} />
             <Route path="/app/shop/marketplace" element={<Marketplace />} />
             <Route path="/app/adopt" element={<AdoptHome />} />
             <Route path="/app/adopt/list" element={<PetListing />} />
             <Route path="/app/adopt/list-pet" element={<ListPetForAdoption />} />
             <Route path="/app/adopt/my-listings" element={<MyAdoptionListings />} />
             <Route path="/app/adopt/my-adoptions" element={<MyAdoptions />} />
             <Route path="/app/adopt/:id" element={<PetDetail />} />
             <Route path="/app/adopt/chat/:id" element={<ShelterChat />} />
             <Route path="/app/adopt/apply/:id" element={<AdoptionApplication />} />
             <Route path="/app/adopt/home-check/:id" element={<HomeCheck />} />
             <Route path="/app/adopt/approved/:id" element={<ApplicationApproved />} />
             <Route path="/app/adopt/meet/:id" element={<MeetAndGreet />} />
             <Route path="/app/adopt/agreement/:id" element={<AdoptionAgreement />} />
             <Route path="/app/adopt/fee/:id" element={<AdoptionFee />} />
             <Route path="/app/adopt/success/:id" element={<AdoptionSuccess />} />
            <Route path="/app/services/daycare" element={<DaycareHome />} />
            <Route path="/app/services/daycare/list" element={<DaycareListing />} />
            <Route path="/app/services/daycare/:id" element={<DaycareDetail />} />
            <Route path="/app/services/daycare/book/plan" element={<SelectPlan />} />
            <Route path="/app/services/daycare/book/date" element={<SelectDateDuration />} />
            <Route path="/app/services/daycare/book/pet" element={<PetInformation />} />
            <Route path="/app/services/daycare/book/pickup" element={<PickupDrop />} />
            <Route path="/app/services/daycare/book/payment" element={<DaycarePriceSummary />} />
            <Route path="/app/services/daycare/book/pay" element={<DaycarePayment />} />
            <Route path="/app/services/daycare/book/success" element={<DaycareBookingConfirmed />} />
            <Route path="/app/services/daycare/booking/:id" element={<DaycareBookingDetail />} />
            <Route path="/app/services/doctors" element={<DoctorList />} />
            <Route path="/app/services/doctors/:id" element={<DoctorDetail />} />
            <Route path="/app/services/doctors/:id/checkout" element={<DoctorCheckout />} />
            <Route path="/app/services/doctors/:id/success" element={<DoctorSuccess />} />
            {/* Video consultation room — deep-linked from the ring notification. */}
            <Route path="/app/consult/:bookingId" element={<ConsultCall />} />
             <Route path="/app/events" element={<EventList />} />
             <Route path="/app/events/list" element={<EventList />} />
             <Route path="/app/events/my-tickets" element={<MyEventTickets />} />
             <Route path="/app/services/events" element={<EventList />} />
             <Route path="/app/services/events/:id" element={<EventDetail />} />
            <Route path="/app/services/events/:id/checkout" element={<EventCheckout />} />
            <Route path="/app/services/events/:id/success" element={<TicketSuccess />} />
            <Route path="/app/services/memorial" element={<MemorialService />} />
            <Route path="/app/services/grooming" element={<GroomingList />} />
            <Route path="/app/services/grooming/list" element={<GroomingListing />} />
            <Route path="/app/services/grooming/book/package" element={<SelectPackage />} />
            <Route path="/app/services/grooming/book/slot" element={<SelectSlot />} />
            <Route path="/app/services/grooming/book/pet" element={<PetDetails />} />
            <Route path="/app/services/grooming/book/address" element={<VisitAddress />} />
            <Route path="/app/services/grooming/book/payment" element={<PriceSummary />} />
            <Route path="/app/services/grooming/book/success" element={<BookingConfirmed />} />
            <Route path="/app/services/grooming/booking/:id" element={<GroomingBookingDetail />} />
            <Route path="/app/services/grooming/:id" element={<GroomingDetail />} />
            <Route path="/app/wallet" element={<Wallet />} />
            <Route path="/app/notifications" element={<Notifications />} />
            
            {/* Meal Plan Sub-screens */}
            <Route path="/app/meals" element={<UserMealDashboard />} />
            <Route path="/app/meals/subscribe" element={<MealSubscribeFlow />} />
            <Route path="/app/meals/track" element={<TrackDelivery />} />
            <Route path="/app/meals/plan" element={<ChangePlan />} />
            <Route path="/app/meals/plan/:id" element={<PlanDetail />} />
            <Route path="/app/meals/allergies" element={<UpdateAllergies />} />
            <Route path="/app/meals/pause" element={<PauseSubscription />} />
            
            {/* Profile Sub-screens */}
            <Route path="/app/profile/edit" element={<EditProfile />} />
            <Route path="/app/profile/pets/add" element={<AddPet />} />
            <Route path="/app/profile/bookings" element={<BookingHistory />} />
            <Route path="/app/profile/bookings/:id" element={<BookingDetail />} />
            <Route path="/app/profile/orders" element={<MyOrders />} />
            <Route path="/app/profile/address" element={<AddressBook />} />
            <Route path="/app/profile/address/add" element={<AddAddress />} />
            <Route path="/app/profile/saved" element={<SavedItems />} />
            <Route path="/app/profile/posts" element={<MyPosts />} />
            <Route path="/app/profile/support" element={<HelpSupport />} />

            </Route>
            {/* End authenticated user app */}

            {/* Admin Redirects & Auth */}
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/auth/login/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="/auth/signup/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="/auth/admin" element={<Navigate to="/admin/login" replace />} />

            {/* Super Admin Control (Full Web Layout) — PROTECTED */}
            <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
              {/* Main */}
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="pets" element={<Pets />} />

              {/* Vendors */}
              <Route path="vendors" element={<AllVendors />} />
              <Route path="vendors/pending" element={<PendingApprovals />} />
              <Route path="vendors/shop" element={<ShopVendors />} />
              <Route path="vendors/meal" element={<MealProviders />} />
              <Route path="vendors/event" element={<EventOrganizers />} />
              <Route path="vendors/doctors" element={<DoctorsClinics />} />
              <Route path="vendors/memorial" element={<MemorialProviders />} />
              <Route path="vendors/documents" element={<VendorDocuments />} />
              <Route path="vendors/performance" element={<VendorPerformance />} />

              {/* Operations */}
              <Route path="operations/orders" element={<Orders />} />
              <Route path="operations/bookings" element={<Bookings />} />
              <Route path="operations/appointments" element={<Appointments />} />
              <Route path="operations/deliveries" element={<Deliveries />} />
              <Route path="operations/refunds" element={<Returns />} />
              <Route path="operations/support" element={<Support />} />

              {/* Services */}
              <Route path="services/products" element={<Products />} />
              <Route path="services/product-categories" element={<ProductCategories />} />
              <Route path="services/meal-plans" element={<MealPlans />} />
              <Route path="services/doctor-services" element={<DoctorServices />} />
              <Route path="services/event-categories" element={<EventCategories />} />
              <Route path="services/memorial-packages" element={<MemorialPackages />} />
              <Route path="services/grooming" element={<GroomingDayCare />} />
              <Route path="services/addons" element={<AddonsAmenities />} />
              <Route path="services/breeds" element={<BreedManagement />} />

              {/* Finance */}
              <Route path="finance/transactions" element={<Transactions />} />
              <Route path="finance/payments" element={<Payments />} />
              <Route path="finance/commission" element={<Commission />} />
              <Route path="finance/payouts" element={<AdminVendorPayouts />} />
              <Route path="finance/wallet" element={<AdminWallet />} />
              <Route path="finance/tax" element={<TaxGSTReports />} />

              {/* Platform */}
              <Route path="platform/notifications" element={<AdminNotifications />} />
              <Route path="platform/community" element={<AdminCommunity />} />
              <Route path="platform/reviews" element={<Reviews />} />
              <Route path="platform/content" element={<BannersContent />} />
              <Route path="platform/reports" element={<Reports />} />
              <Route path="platform/security" element={<Security />} />
              <Route path="platform/staff" element={<Staff />} />
              <Route path="platform/settings" element={<AdminSettings />} />
            </Route>

            {/* Super Admin - Meal Portal Operations */}
            <Route path="/admin/meal-portal" element={<ProtectedAdminRoute><MealPortalProvider><MealPortalAdminLayout /></MealPortalProvider></ProtectedAdminRoute>}>
              <Route path="dashboard" element={<SuperAdminDashboard />} />
              <Route path="plans" element={<div className="p-8 text-center text-gray-500">Global Meal Plans (Integrated with Vendor Module)</div>} />
              <Route path="subscriptions" element={<SubscriptionsAdminView />} />
              <Route path="trials" element={<TrialMealsAdminView />} />
              <Route path="deliveries" element={<SuperDeliveryView />} />
              <Route path="tracking" element={<div className="p-8 text-center text-gray-500">Live GPS Tracking Maps...</div>} />
              <Route path="vendors" element={<VendorsManagementView />} />
              <Route path="kitchens" element={<div className="p-8 text-center text-gray-500">Global Kitchen Queue...</div>} />
              <Route path="inventory" element={<div className="p-8 text-center text-gray-500">Platform Inventory...</div>} />
              <Route path="nutrition" element={<div className="p-8 text-center text-gray-500">Pet Nutrition DB...</div>} />
              <Route path="support" element={<div className="p-8 text-center text-gray-500">Reviews & Tickets...</div>} />
              <Route path="users" element={<div className="p-8 text-center text-gray-500">User Directory...</div>} />
              <Route path="finance" element={<FinanceAdminView />} />
              <Route path="analytics" element={<div className="p-8 text-center text-gray-500">Reports & Analytics...</div>} />
              <Route path="settings" element={<div className="p-8 text-center text-gray-500">Platform Settings...</div>} />
            </Route>

            {/* Vendor Redirects & Auth */}
            <Route path="/vendor" element={<Navigate to="/vendor/login" replace />} />
            <Route path="/vandor" element={<Navigate to="/vendor/login" replace />} />
            <Route path="/auth/login/vendor" element={<Navigate to="/vendor/login" replace />} />
            <Route path="/auth/login/vandor" element={<Navigate to="/vendor/login" replace />} />
            <Route path="/vendor/login" element={<VendorAuth />} />
            <Route path="/vendor/signup" element={<VendorAuth />} />
            <Route path="/vendor/pending" element={<VendorAuth />} />

            {/* Vendor Dashboard & Tools (Full Web Layout) */}
            <Route path="/vendor" element={<ProtectedVendorRoute><VendorLayout /></ProtectedVendorRoute>}>
              <Route path="doctor/consultations" element={<ProtectedVendorRoute allow="clinic"><ClinicVendorProvider><DoctorManagement /></ClinicVendorProvider></ProtectedVendorRoute>} />
              <Route path="grooming-provider" element={<ProtectedVendorRoute allow="grooming"><GroomingVendorPortal /></ProtectedVendorRoute>} />
              <Route path="daycare-provider" element={<ProtectedVendorRoute allow="daycare"><DaycareVendorPortal /></ProtectedVendorRoute>} />
              <Route path="adoption-partner" element={<ProtectedVendorRoute allow="adoption"><AdoptionVendorPortal /></ProtectedVendorRoute>} />
              <Route path="meal/plans" element={<Navigate to="/vendor/meal-provider/dashboard" replace />} />
              <Route path="event/packages" element={<Navigate to="/vendor/events-organizer" replace />} />
              <Route path="memorial/requests" element={<Navigate to="/vendor/memorial-provider" replace />} />
              <Route path="settings" element={<VendorSettings />} />
              <Route path="payouts" element={<VendorPayouts />} />
              <Route path="support" element={<VendorSupport />} />
            </Route>

            {/* Shop Partner Standalone Dashboard */}
            <Route path="/vendor/shop-provider" element={<ProtectedVendorRoute allow="shop"><ShopVendorProvider><ShopVendorLayout /></ShopVendorProvider></ProtectedVendorRoute>}>
              <Route index element={<ShopDashboard />} />
              <Route path="products" element={<ShopProductsView />} />
              <Route path="orders" element={<ShopOrdersView />} />
              <Route path="inventory" element={<ShopInventoryView />} />
              <Route path="returns" element={<ShopReturnsView />} />
              <Route path="feedback" element={<ShopFeedbackView />} />
              <Route path="finance" element={<ShopFinanceView />} />
              <Route path="settings" element={<ShopSettingsView />} />
              <Route path="*" element={<Navigate to="/vendor/shop-provider" replace />} />
            </Route>

            {/* Fresh Meals Partner Exclusive Dashboard */}
            <Route path="/vendor/meal-provider" element={<ProtectedVendorRoute allow="meal_subscription"><MealProviderProvider><MealProviderLayout /></MealProviderProvider></ProtectedVendorRoute>}>
              <Route path="dashboard" element={<MealDashboard />} />
              <Route path="plans" element={<MealPlansView />} />
              <Route path="subscriptions" element={<SubscriptionsView />} />
              <Route path="trials" element={<TrialMealsView />} />
              <Route path="kitchen" element={<KitchenQueueView />} />
              <Route path="delivery-board" element={<DeliveryManagementView />} />
              <Route path="live-tracking" element={<LiveTrackingView />} />
              <Route path="feedback" element={<CustomerFeedbackView />} />
              
              <Route path="finance" element={<FinanceCenterView />} />
              <Route path="settings" element={<BusinessControlCenterView />} />

              {/* Redirects for removed legacy routes */}
              <Route path="support" element={<Navigate to="/vendor/meal-provider/feedback" replace />} />
              <Route path="tickets" element={<Navigate to="/vendor/meal-provider/feedback" replace />} />
              <Route path="payouts" element={<Navigate to="/vendor/meal-provider/finance" replace />} />
              <Route path="transactions" element={<Navigate to="/vendor/meal-provider/finance" replace />} />
              <Route path="zones" element={<Navigate to="/vendor/meal-provider/settings" replace />} />
              <Route path="notifications" element={<Navigate to="/vendor/meal-provider/settings" replace />} />
              <Route path="security" element={<Navigate to="/vendor/meal-provider/settings" replace />} />
              <Route path="*" element={<Navigate to="/vendor/meal-provider/dashboard" replace />} />
            </Route>

            {/* Events Partner Dashboard */}
            <Route path="/vendor/events-organizer" element={<ProtectedVendorRoute allow="events"><PetEventsProvider><PetEventsLayout /></PetEventsProvider></ProtectedVendorRoute>}>
              <Route index element={<DashboardOverview />} />
              <Route path="events" element={<EventsView />} />
              <Route path="events/create" element={<CreateEventView />} />
              <Route path="events/:id/edit" element={<CreateEventView />} />
              <Route path="bookings" element={<BookingsView />} />
              <Route path="calendar" element={<CalendarView />} />
              <Route path="packages" element={<PackagesAddonsView />} />
              <Route path="gallery" element={<EventGalleryView />} />
              <Route path="requests" element={<CustomerRequestsView />} />
              <Route path="feedback" element={<EventsFeedbackView />} />
              <Route path="finance" element={<EventsFinanceView />} />
              <Route path="settings" element={<EventsSettingsView />} />
              <Route path="*" element={<Navigate to="/vendor/events-organizer" replace />} />
            </Route>

            {/* Last Ride Partner Dashboard */}
            <Route path="/vendor/memorial-provider" element={<ProtectedVendorRoute allow="memorial"><MemorialProviderProvider><MemorialProviderLayout /></MemorialProviderProvider></ProtectedVendorRoute>}>
              <Route index element={<MemorialDashboard />} />
              <Route path="requests" element={<MemorialRequests />} />
              <Route path="calendar" element={<MemorialCalendar />} />
              <Route path="team" element={<MemorialTeam />} />
              <Route path="services" element={<MemorialServicesView />} />
              <Route path="addons" element={<MemoryAddonsView />} />
              <Route path="proofs" element={<ServiceProofsView />} />
              <Route path="support" element={<MemorialSupport />} />
              <Route path="finance" element={<MemorialFinance />} />
              <Route path="settings" element={<MemorialSettings />} />
              <Route path="*" element={<Navigate to="/vendor/memorial-provider" replace />} />
            </Route>

            {/* Legacy route redirects */}
            <Route path="/home" element={<Navigate to="/app/home" replace />} />
          </Routes></Suspense>
          {/* Rings wherever the user is in the app. */}
          <IncomingCallOverlay />
          </CallProvider>
        </ErrorBoundary>
      </MobileWrapper>
    </BrowserRouter>
  );
}

export default App;
