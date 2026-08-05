import { create } from 'zustand';

export const useDaycareStore = create((set) => ({
  // Booking Data State
  selectedCenter: null,
  selectedPlan: null,
  selectedAddons: [],
  dateSelectionType: 'Single Day', // 'Single Day', 'Multiple Days', 'Custom Week', 'Monthly'
  selectedDates: [], // Array of YYYY-MM-DD strings
  dropoffTime: '',
  pickupTime: '',
  selectedPet: null,
  petAnswers: {
    breed: '',
    age: '',
    size: '',
    gender: '',
    vaccinated: null,
    aggressive: null,
    skinIssues: null,
    separationAnxiety: null,
    instructions: ''
  },
  visitOption: 'Self Drop', // 'Self Drop', 'Pickup & Drop'
  selectedAddress: null,
  pickupDropTimes: {
    pickup: '8:00 AM',
    drop: '6:00 PM'
  },
  
  // Last confirmed booking for success screen
  lastConfirmedBooking: null,

  // Actions
  setCenter: (center) => set({ selectedCenter: center }),
  setPlan: (plan) => set({ selectedPlan: plan }),
  toggleAddon: (addon) => set((state) => {
    const exists = state.selectedAddons.find(a => a.id === addon.id);
    if (exists) {
      return { selectedAddons: state.selectedAddons.filter(a => a.id !== addon.id) };
    } else {
      return { selectedAddons: [...state.selectedAddons, addon] };
    }
  }),
  setDateSelectionType: (type) => set({ dateSelectionType: type, selectedDates: [] }),
  toggleDate: (dateStr) => set((state) => {
    if (state.dateSelectionType === 'Single Day' || state.dateSelectionType === 'Monthly') {
      return { selectedDates: [dateStr] };
    }
    const exists = state.selectedDates.includes(dateStr);
    if (exists) {
      return { selectedDates: state.selectedDates.filter(d => d !== dateStr) };
    } else {
      return { selectedDates: [...state.selectedDates, dateStr].sort() };
    }
  }),
  setTimes: (dropoff, pickup) => set({ dropoffTime: dropoff, pickupTime: pickup }),
  setPet: (pet) => set({ selectedPet: pet }),
  setPetAnswers: (answers) => set({ petAnswers: answers }),
  setVisitOption: (option) => set({ visitOption: option }),
  setAddress: (address) => set({ selectedAddress: address }),
  setPickupDropTimes: (pickup, drop) => set({ pickupDropTimes: { pickup, drop } }),
  
  setLastConfirmedBooking: (booking) => set({ lastConfirmedBooking: booking }),

  resetBooking: () => set({
    selectedCenter: null,
    selectedPlan: null,
    selectedAddons: [],
    dateSelectionType: 'Single Day',
    selectedDates: [],
    dropoffTime: '',
    pickupTime: '',
    selectedPet: null,
    petAnswers: {
      breed: 'Golden Retriever',
      age: '2 Years',
      size: 'Large',
      gender: 'Male',
      vaccinated: null,
      aggressive: null,
      skinIssues: null,
      separationAnxiety: null,
      instructions: ''
    },
    visitOption: 'Self Drop',
    selectedAddress: null,
    pickupDropTimes: { pickup: '8:00 AM', drop: '6:00 PM' }
  })
}));
