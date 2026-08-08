import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';
import uploadRoutes from '../modules/upload/upload.routes.js';
import paymentRoutes from '../modules/payment/payment.routes.js';
import addressRoutes from '../modules/address/address.routes.js';
import supportRoutes from '../modules/support/support.routes.js';
import petRoutes from '../modules/pet/pet.routes.js';
import breedRoutes from '../modules/breed/breed.routes.js';
import shopRoutes from '../modules/shop/shop.routes.js';
import cartRoutes from '../modules/cart/cart.routes.js';
import orderRoutes from '../modules/order/order.routes.js';
import reviewRoutes from '../modules/review/review.routes.js';
import savedItemRoutes from '../modules/savedItem/savedItem.routes.js';
import providerRoutes, { doctorRouter, eventRouter } from '../modules/provider/provider.routes.js';
import bookingRoutes from '../modules/booking/booking.routes.js';
import consultRoutes from '../modules/consult/consult.routes.js';
import mealRoutes from '../modules/meal/meal.routes.js';
import adoptionRoutes from '../modules/adoption/adoption.routes.js';
import marketplaceRoutes from '../modules/adoption/marketplace.routes.js';
import communityRoutes from '../modules/social/community.routes.js';
import { matchRouter, chatRouter, storyRouter } from '../modules/social/social.routes.js';
import walletRoutes from '../modules/wallet/wallet.routes.js';
import notificationRoutes from '../modules/notification/notification.routes.js';
import vendorRoutes from '../modules/vendor/vendor.routes.js';
import { providerVendorRouter } from '../modules/vendor/vendor.provider.routes.js';
import adminRoutes, { bannersRouter, adminBannersRouter } from '../modules/admin/admin.routes.js';

const router = Router();

/**
 * Central API router — mounted under the API prefix (/api).
 * Still to mount as their phases land: admin.
 */
router.get('/', (_req, res) => {
  res.json({ success: true, message: 'TailCircle API' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/uploads', uploadRoutes);
router.use('/payments', paymentRoutes);
router.use('/addresses', addressRoutes);
router.use('/support', supportRoutes);
router.use('/pets', petRoutes);
router.use('/breeds', breedRoutes);
router.use('/shop', shopRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/reviews', reviewRoutes);
router.use('/saved-items', savedItemRoutes);
router.use('/providers', providerRoutes);
router.use('/doctors', doctorRouter);
router.use('/events', eventRouter);
router.use('/bookings', bookingRoutes);
router.use('/consults', consultRoutes);
router.use('/meals', mealRoutes);
router.use('/adoption', adoptionRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/community', communityRoutes);
router.use('/matches', matchRouter);
router.use('/chat', chatRouter);
router.use('/stories', storyRouter);
router.use('/wallet', walletRoutes);
router.use('/notifications', notificationRoutes);
// Provider-backed vendor portals. Mounted before /vendor so their paths win.
router.use('/vendor/grooming', providerVendorRouter('grooming'));
router.use('/vendor/daycare', providerVendorRouter('daycare'));
router.use('/vendor', vendorRoutes);
router.use('/admin/banners', adminBannersRouter);
router.use('/admin', adminRoutes);
router.use('/banners', bannersRouter);

export default router;
