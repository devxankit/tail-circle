import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getStoredVendor,
  fetchEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  fetchEventBookings,
  checkInEventBooking,
  fetchEventPackages,
  createEventPackage,
  updateEventPackage,
  deleteEventPackage,
  fetchEventAddons,
  createEventAddon,
  updateEventAddon,
  deleteEventAddon,
  fetchEventRequests,
  updateEventRequest,
  fetchEventFeedback,
  replyToEventFeedback,
  fetchEventGallery,
  addEventGalleryItem,
  deleteEventGalleryItem,
  fetchVendorDashboard,
} from '../../../../services/vendor';
import { fetchNotifications, markAllNotificationsRead } from '../../../../services/notifications';

const PetEventsContext = createContext();

function toPortalProfile(p) {
  if (!p) return { businessName: 'Events Organizer', email: '', phone: '', address: '', status: 'Online', verification: 'Pending', logo: null };
  const vmap = { approved: 'Approved', pending: 'Pending', rejected: 'Rejected', suspended: 'Suspended' };
  return {
    businessName: p.businessName,
    email: p.email,
    phone: p.phone,
    address: p.address,
    status: p.online ? 'Online' : 'Offline',
    verification: vmap[p.approvalStatus] || 'Pending',
    logo: p.logo || null,
  };
}

const EMPTY_FINANCES = {
  todayRevenue: 0, weeklyRevenue: 0, pendingPayout: 0, activeEvents: 0,
  chartData: [], transactions: [], settlements: [],
};

export const PetEventsProvider = ({ children }) => {
  const stored = getStoredVendor();
  const [profile, setProfile] = useState(toPortalProfile(stored?.profile));
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [calendarSlots, setCalendarSlots] = useState([]);
  const [packages, setPackages] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [customerRequests, setCustomerRequests] = useState([]);
  const [finances, setFinances] = useState(EMPTY_FINANCES);
  const [feedback, setFeedback] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [evs, bks, pkgs, adds, reqs, fb, gal, dash, notifs] = await Promise.all([
      fetchEvents().catch(() => []),
      fetchEventBookings().catch(() => []),
      fetchEventPackages().catch(() => []),
      fetchEventAddons().catch(() => []),
      fetchEventRequests().catch(() => []),
      fetchEventFeedback().catch(() => []),
      fetchEventGallery().catch(() => []),
      fetchVendorDashboard().catch(() => null),
      fetchNotifications().catch(() => ({ items: [] })),
    ]);
    setEvents(evs);
    setBookings(bks);
    setPackages(pkgs);
    setAddOns(adds);
    setCustomerRequests(reqs);
    setFeedback(fb);
    setGallery(gal);
    setNotifications(notifs.items.map((n) => ({ id: n.id, message: n.title ? `${n.title} — ${n.msg}` : n.msg, time: n.time, read: !n.unread })));
    // Calendar slots derive from the events themselves.
    setCalendarSlots(evs.map((e) => ({
      id: `SL-${e._id}`, date: e.date, start: e.time, end: '', status: e.booked >= e.capacity ? 'Booked' : 'Available', title: e.title,
    })));
    if (dash) {
      setFinances((f) => ({
        ...f,
        pendingPayout: Math.round((dash.pendingSettlement || 0) / 100),
        weeklyRevenue: Math.round((dash.lifetimeEarnings || 0) / 100),
        activeEvents: evs.filter((e) => e.status === 'Published' || e.status === 'Fully Booked').length,
      }));
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  /* ── mutators ─────────────────────────────────────────── */

  const updateProfile = (updates) => setProfile((p) => ({ ...p, ...updates }));

  const addEvent = async (event) => {
    const created = await apiCreateEvent({
      title: event.title,
      category: event.category,
      time: event.time,
      location: event.location,
      capacity: Number(event.capacity) || undefined,
      price: Number(event.price) || 0,
      date: event.date,
      status: event.status,
      image: event.image || undefined,
    });
    setEvents((prev) => [created, ...prev]);
    return created;
  };

  const updateEvent = async (id, updates) => {
    const updated = await apiUpdateEvent(id, updates);
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  };

  // Only "checked in" is real — there is no no-show/refund concept on the
  // backend for event bookings, so those actions were removed from the UI
  // rather than left pointing at nothing.
  const checkInBooking = async (id) => {
    const booking = bookings.find((b) => b.id === id);
    if (!booking?._id) return;
    await checkInEventBooking(booking._id);
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, checkedIn: true } : b)));
  };

  const updateRequest = async (id, updates) => {
    const updated = await updateEventRequest(id, updates);
    setCustomerRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

  const markAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const replyFeedback = async (id, text) => {
    await replyToEventFeedback(id, text);
    setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, reply: text, status: 'Replied' } : f)));
  };

  /* ── Packages ─────────────────────────────────────────── */
  const addPackage = async (body) => {
    const created = await createEventPackage(body);
    setPackages((prev) => [created, ...prev]);
    return created;
  };
  const editPackage = async (id, body) => {
    const updated = await updateEventPackage(id, body);
    setPackages((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };
  const removePackage = async (id) => {
    await deleteEventPackage(id);
    setPackages((prev) => prev.filter((p) => p.id !== id));
  };

  /* ── Add-ons ──────────────────────────────────────────── */
  const addAddon = async (body) => {
    const created = await createEventAddon(body);
    setAddOns((prev) => [created, ...prev]);
    return created;
  };
  const editAddon = async (id, body) => {
    const updated = await updateEventAddon(id, body);
    setAddOns((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  };
  const removeAddon = async (id) => {
    await deleteEventAddon(id);
    setAddOns((prev) => prev.filter((a) => a.id !== id));
  };

  /* ── Gallery ──────────────────────────────────────────── */
  const addGalleryItem = async (body) => {
    const created = await addEventGalleryItem(body);
    setGallery((prev) => [created, ...prev]);
    return created;
  };
  const removeGalleryItem = async (id) => {
    await deleteEventGalleryItem(id);
    setGallery((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <PetEventsContext.Provider value={{
      profile, events, bookings, calendarSlots, packages, addOns, customerRequests, finances, feedback, notifications, gallery,
      loading, refresh,
      updateProfile,
      addEvent,
      updateEvent,
      checkInBooking,
      updateRequest,
      replyFeedback,
      markAllRead,
      addPackage, editPackage, removePackage,
      addAddon, editAddon, removeAddon,
      addGalleryItem, removeGalleryItem,
    }}>
      {children}
    </PetEventsContext.Provider>
  );
};

export const usePetEvents = () => useContext(PetEventsContext);
