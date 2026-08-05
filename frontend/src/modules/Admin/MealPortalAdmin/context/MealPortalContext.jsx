import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchMealPortalData } from '../../../../services/admin';

export const MealPortalContext = createContext();

const initialMockData = {
  platformMetrics: {
    totalRevenue: 2450000,
    activeSubscriptions: 3450,
    totalDeliveriesToday: 420,
    activeVendors: 45,
    failedDeliveries: 3,
    delayedDeliveries: 12,
    pendingTrials: 85,
    refundRequests: 4
  },
  vendors: [
    { id: 'V-001', name: 'NutriPet Kitchens', type: 'Cloud Kitchen', zone: 'South Bangalore', activeSubs: 450, revenue: 125000, status: 'Verified', rating: 4.8 },
    { id: 'V-002', name: 'FreshPaws Foods', type: 'Dietary Specialists', zone: 'North Bangalore', activeSubs: 210, revenue: 85000, status: 'Verified', rating: 4.5 },
    { id: 'V-003', name: 'Healthy Tails', type: 'Cloud Kitchen', zone: 'East Bangalore', activeSubs: 120, revenue: 42000, status: 'Pending', rating: 0 },
    { id: 'V-004', name: 'Gourmet Bark', type: 'Premium Meals', zone: 'Central Bangalore', activeSubs: 600, revenue: 350000, status: 'Verified', rating: 4.9 },
  ],
  globalMealPlans: [
    { id: 'MP-01', name: 'Fresh Chicken & Veggie Diet', vendor: 'NutriPet Kitchens', petType: 'Dog', price: 1250, subsCount: 200, status: 'Active' },
    { id: 'MP-02', name: 'Grain-Free Salmon Diet', vendor: 'Gourmet Bark', petType: 'Dog', price: 5400, subsCount: 450, status: 'Active' },
    { id: 'MP-03', name: 'Kitten Growth Paste', vendor: 'NutriPet Kitchens', petType: 'Cat', price: 850, subsCount: 150, status: 'Active' },
    { id: 'MP-04', name: 'Sensitive Stomach Beef', vendor: 'FreshPaws Foods', petType: 'Dog', price: 2200, subsCount: 85, status: 'Active' },
  ],
  globalSubscriptions: [
    { id: 'SUB-101', user: 'Rahul Kumar', pet: 'Max (Dog)', plan: 'Fresh Chicken & Veggie', vendor: 'NutriPet Kitchens', endDate: '2026-06-01', status: 'Active', payment: 'Paid' },
    { id: 'SUB-102', user: 'Aisha Khan', pet: 'Bella (Cat)', plan: 'Kitten Growth Paste', vendor: 'NutriPet Kitchens', endDate: '2026-06-15', status: 'Active', payment: 'Paid' },
    { id: 'SUB-103', user: 'Rohan Sharma', pet: 'Rocky (Dog)', plan: 'Grain-Free Salmon Diet', vendor: 'Gourmet Bark', endDate: '2026-05-10', status: 'Paused', payment: 'Failed' },
    { id: 'SUB-104', user: 'Priya Dev', pet: 'Luna (Dog)', plan: 'Sensitive Stomach Beef', vendor: 'FreshPaws Foods', endDate: '2026-05-20', status: 'Cancelled', payment: 'Refunded' },
  ],
  globalDeliveries: [
    { id: 'DEL-01', orderId: 'ORD-901', user: 'Rahul Kumar', vendor: 'NutriPet Kitchens', driver: 'Raju Bhai', eta: '15 mins', status: 'Out for Delivery', zone: 'South Bangalore' },
    { id: 'DEL-02', orderId: 'ORD-902', user: 'Aisha Khan', vendor: 'NutriPet Kitchens', driver: 'Unassigned', eta: '--', status: 'Preparing', zone: 'South Bangalore' },
    { id: 'DEL-03', orderId: 'ORD-903', user: 'Sanya Mirza', vendor: 'Gourmet Bark', driver: 'Mohan Das', eta: '+45 mins (Delayed)', status: 'Delayed', zone: 'Central Bangalore' },
    { id: 'DEL-04', orderId: 'ORD-904', user: 'Vikram Singh', vendor: 'FreshPaws Foods', driver: 'Abdul K.', eta: 'Delivered 10m ago', status: 'Delivered', zone: 'North Bangalore' },
    { id: 'DEL-05', orderId: 'ORD-905', user: 'Rohit K', vendor: 'Gourmet Bark', driver: 'Kiran', eta: '--', status: 'Failed', zone: 'Central Bangalore' },
  ],
  globalTrials: [
    { id: 'TR-01', user: 'Amit Patel', pet: 'Simba', mobile: '+91-8877665544', vendor: 'NutriPet Kitchens', eligibility: 'Verified', status: 'Pending' },
    { id: 'TR-02', user: 'Neha Sharma', pet: 'Lucy', mobile: '+91-9988776655', vendor: 'Gourmet Bark', eligibility: 'Duplicate Mobile', status: 'Blocked' },
    { id: 'TR-03', user: 'Vikram Singh', pet: 'Bruno', mobile: '+91-7766554433', vendor: 'FreshPaws Foods', eligibility: 'Verified', status: 'Approved' },
  ]
};

// MealPortalContext is exported at the top

export const MealPortalProvider = ({ children }) => {
  // Cross-vendor meal-ops snapshot from the API (empty-safe defaults while loading).
  const [state, setState] = useState(initialMockData);

  useEffect(() => {
    fetchMealPortalData()
      .then((data) => setState((prev) => ({ ...prev, ...data })))
      .catch((err) => console.error('Failed to load meal-portal data', err));
  }, []);

  const updateGlobalStatus = (collection, id, newStatus) => {
    setState(p => ({
      ...p,
      [collection]: p[collection].map(item => item.id === id ? { ...item, status: newStatus } : item)
    }));
  };

  const blockTrial = (id) => updateGlobalStatus('globalTrials', id, 'Blocked');
  const approveTrial = (id) => updateGlobalStatus('globalTrials', id, 'Approved');
  
  return (
    <MealPortalContext.Provider value={{
      ...state,
      updateGlobalStatus,
      blockTrial,
      approveTrial
    }}>
      {children}
    </MealPortalContext.Provider>
  );
};

export const useMealPortal = () => useContext(MealPortalContext);
