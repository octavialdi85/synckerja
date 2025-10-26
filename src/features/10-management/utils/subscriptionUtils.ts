// Utility functions for subscription management
import type { SubscriptionPlan } from '../hooks/useOptimizedSubscription';

/**
 * Helper function to get monthly price from subscription plan
 * Uses base_price_per_member as the primary source
 */
export const getMonthlyPrice = (plan: SubscriptionPlan): number => {
  return plan.base_price_per_member || 0;
};

/**
 * Helper function to get yearly price from subscription plan
 * Calculates based on base_price_per_member and annual discount
 */
export const getYearlyPrice = (plan: SubscriptionPlan): number => {
  const monthlyPrice = getMonthlyPrice(plan);
  const annualDiscount = plan.annual_discount_percentage || 0;
  return monthlyPrice * 12 * (1 - annualDiscount / 100);
};

/**
 * Helper function to get monthly price for specific member count
 */
export const getMonthlyPriceForMembers = (plan: SubscriptionPlan, memberCount: number): number => {
  return plan.base_price_per_member * memberCount;
};

/**
 * Helper function to get yearly price for specific member count
 */
export const getYearlyPriceForMembers = (plan: SubscriptionPlan, memberCount: number): number => {
  const monthlyPrice = getMonthlyPriceForMembers(plan, memberCount);
  const annualDiscount = plan.annual_discount_percentage || 0;
  return monthlyPrice * 12 * (1 - annualDiscount / 100);
};

/**
 * Helper function to format currency in Indonesian Rupiah
 */
export const formatIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};