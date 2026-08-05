import { create } from 'zustand';

export const useGroomingStore = create((set) => ({
  // Booking Data
  bookingData: {
    shopId: null,
    shop: null,
    packageId: null,
    pkg: null,
    addons: [],
    date: null,
    timeSlot: null,
    pet: null,
    visitType: 'Salon Visit',
    address: null,
    specialInstructions: ''
  },

  // Actions
  setShop: (shop) => set((state) => ({
    bookingData: { ...state.bookingData, shopId: shop?.id, shop }
  })),
  
  setPackage: (pkg) => set((state) => ({
    bookingData: { ...state.bookingData, packageId: pkg?.id, pkg }
  })),

  toggleAddon: (addon) => set((state) => {
    const exists = state.bookingData.addons.find(a => a.id === addon.id);
    if (exists) {
      return {
        bookingData: {
          ...state.bookingData,
          addons: state.bookingData.addons.filter(a => a.id !== addon.id)
        }
      };
    } else {
      return {
        bookingData: {
          ...state.bookingData,
          addons: [...state.bookingData.addons, addon]
        }
      };
    }
  }),

  setDateTime: (date, timeSlot) => set((state) => ({
    bookingData: { ...state.bookingData, date, timeSlot }
  })),

  setPet: (pet) => set((state) => ({
    bookingData: { ...state.bookingData, pet }
  })),

  setAddress: (visitType, address) => set((state) => ({
    bookingData: { ...state.bookingData, visitType, address }
  })),

  setInstructions: (instructions) => set((state) => ({
    bookingData: { ...state.bookingData, specialInstructions: instructions }
  })),

  resetBooking: () => set({
    bookingData: {
      shopId: null,
      shop: null,
      packageId: null,
      pkg: null,
      addons: [],
      date: null,
      timeSlot: null,
      pet: null,
      visitType: 'Salon Visit',
      address: null,
      specialInstructions: ''
    }
  })
}));
