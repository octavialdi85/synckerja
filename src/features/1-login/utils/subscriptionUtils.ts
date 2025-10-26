// Utility functions for subscription pricing and formatting
export const formatIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const getMonthlyPriceForMembers = (basePrice: number, memberCount: number): number => {
  return basePrice * memberCount;
};

export const getYearlyPriceForMembers = (basePrice: number, memberCount: number): number => {
  return (basePrice * memberCount * 12) * 0.8; // 20% discount for yearly
};


