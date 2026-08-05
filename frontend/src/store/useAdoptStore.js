import { create } from 'zustand';

export const useAdoptStore = create((set) => ({
  selectedPet: null,
  applicationData: {},
  visitData: {},
  
  setSelectedPet: (pet) => set({ selectedPet: pet }),
  setApplicationData: (data) => set((state) => ({ applicationData: { ...state.applicationData, ...data } })),
  setVisitData: (data) => set((state) => ({ visitData: { ...state.visitData, ...data } })),
  
  clearStore: () => set({ selectedPet: null, applicationData: {}, visitData: {} })
}));
