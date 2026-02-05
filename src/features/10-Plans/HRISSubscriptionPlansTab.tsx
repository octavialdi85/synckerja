
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Zap, Users, Shield, Star } from 'lucide-react';
import { useSubscriptionPlans } from './hooks/useSubscriptionPlans';
import { useOptimizedSubscription, SubscriptionPlan } from '@/features/10-management/hooks/useOptimizedSubscription';
import { useMidtransPayment } from './hooks/useMidtransPayment';
import { useProRateCalculation } from './hooks/useProRateCalculation';
import { useEmployeeCount } from '@/features/share/hooks/useEmployeeCount';
import { formatIDR, getMonthlyPriceForMembers, getYearlyPriceForMembers } from '@/features/1-login/utils/subscriptionUtils';
import { toast } from 'sonner';
import { UpgradeConfirmationModal } from './modal/UpgradeConfirmationModal';
import { useSchedulePlanChange } from './hooks/useSchedulePlanChange';
import { PendingChangesCard } from './section/PendingChangesCard';
import { UpgradeOptionsModal } from './modal/UpgradeOptionsModal';
import { PlanCard, TrustIndicators } from './section';
import { Card, CardContent, CardHeader } from '@/features/ui/card';
import { LoadingDots } from '@/components/LoadingDots';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';

const RENEWAL_WINDOW_DAYS = 7;

const HRISSubscriptionPlansTab = () => {
  const { t } = useAppTranslation();
  const [memberCounts, setMemberCounts] = useState<{ [key: string]: number }>({});
  const [billingCycles, setBillingCycles] = useState<{ [key: string]: 'monthly' | 'yearly' }>({});
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedMemberCount, setSelectedMemberCount] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [proRatedData, setProRatedData] = useState<any>(null);
  
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { subscriptionStatus, subscriptionPlans } = useOptimizedSubscription();
  const { initiateMidtransPayment } = useMidtransPayment();
  const proRateCalculation = useProRateCalculation();
  const { data: currentEmployeeCount = 0 } = useEmployeeCount();

  // Get current subscription details
  const currentPlanId = subscriptionStatus?.plan_name ? 
    subscriptionPlans?.find(p => p.name === subscriptionStatus.plan_name)?.id : null;
  const currentMemberCount = subscriptionStatus?.member_count || 0;

  // Extract employee limit from plan features
  const getEmployeeLimitFromFeatures = (features: string[]) => {
    if (!features || !Array.isArray(features)) return 100;
    
    for (const feature of features) {
      // Look for patterns like "1 Member Allowed", "12 employee limit", "5 karyawan", "10 orang", etc.
      const patterns = [
        /(\d+)\s*Member\s*Allowed/i,
        /(\d+)\s*(employee\s*limit|karyawan|orang|employees?|members?)/i
      ];
      
      for (const pattern of patterns) {
        const match = feature.match(pattern);
        if (match) {
          return parseInt(match[1]);
        }
      }
    }
    return 100; // Default fallback for non-trial plans
  };

  // Function to check if a plan is the current active plan
  const isCurrentPlan = (plan: any) => {
    if (!subscriptionStatus) return false;
    
    // Only match by exact plan name - this ensures only ONE plan is current
    return subscriptionStatus.plan_name === plan.name;
  };

  // Initialize memberCounts state properly for each plan
  useEffect(() => {
    if (!plans || !subscriptionStatus || Object.keys(memberCounts).length > 0) return;

    const newMemberCounts: { [key: string]: number } = {};

    plans.forEach(plan => {
      const isTrialPlan = plan.name === 'Trial' || plan.base_price_per_member === 0;
      const isCurrent = isCurrentPlan(plan);
      const maxEmployees = isTrialPlan ? getEmployeeLimitFromFeatures(plan.features) : 100;
      
      let defaultCount;
      if (isCurrent) {
        // For current plan, use actual subscription member count
        defaultCount = subscriptionStatus.member_count || currentMemberCount || 1;
      } else if (isTrialPlan) {
        defaultCount = maxEmployees;
      } else {
        defaultCount = 5;
      }
      
      newMemberCounts[plan.id] = defaultCount;
    });

    setMemberCounts(newMemberCounts);
  }, [plans, subscriptionStatus, currentMemberCount]);

  const handleMemberCountChange = (planId: string, count: number) => {
    setMemberCounts(prev => ({ ...prev, [planId]: count }));
  };

  const handleBillingCycleChange = (planId: string, isYearly: boolean) => {
    setBillingCycles(prev => ({ ...prev, [planId]: isYearly ? 'yearly' : 'monthly' }));
  };

const calculatePlanPrice = (plan: any, memberCount: number, isYearly: boolean) => {
    const basePrice = plan.base_price_per_member * memberCount;
    if (isYearly && plan.annual_discount_percentage) {
      return basePrice * 12 * (1 - plan.annual_discount_percentage / 100);
    }
    return isYearly ? basePrice * 12 : basePrice;
  };

  const handleUpgrade = useCallback(async (plan: SubscriptionPlan, memberCount: number, billingCycleOverride?: 'monthly' | 'yearly') => {
    const selectedBillingCycle = billingCycleOverride || billingCycles[plan.id] || 'monthly';

    setSelectedPlan(plan);
    setSelectedMemberCount(memberCount);
    // Update global isYearly state for modal consistency
    setIsYearly(selectedBillingCycle === 'yearly');

    try {
      // Selalu hitung prorate untuk semua skenario (plan change / member change)
      const calculation = await proRateCalculation.mutateAsync({
        new_member_count: memberCount,
        target_plan_id: plan.id,
      });

      if (calculation?.success) {
        // ✅ FIX: Jika subscription sudah expired, paksa charge_now = true
        const isExpired = subscriptionStatus?.is_expired || false;
        if (isExpired && calculation.calculation) {
          calculation.calculation.charge_now = true;
          // Set scheduled_date ke hari ini karena expired, perubahan harus langsung
          calculation.calculation.scheduled_date = new Date().toISOString();
          calculation.calculation.remaining_days = 0;
        }

        setProRatedData(calculation);

        // Check if this is a member increase (scale-up) without plan change
        const isMemberIncrease = calculation.calculation?.member_difference > 0 && 
                                !calculation.calculation?.is_plan_change;
        
        // For member increases, proceed directly with immediate payment (no scheduling options)
        if (isMemberIncrease && calculation.calculation?.charge_now) {
          setIsModalOpen(true);
        } else if (calculation.calculation?.charge_now && calculation.calculation?.prorate_amount > 0) {
          setIsOptionsModalOpen(true);
        } else {
          // For downgrades or no charge scenarios, show regular confirmation modal
          setIsModalOpen(true);
        }
      } else {
        setProRatedData(null);
        setIsModalOpen(true);
      }
    } catch {
      setProRatedData(null);
      setIsModalOpen(true);
    }
  }, [proRateCalculation, billingCycles, subscriptionStatus]);

  const schedulePlanChange = useSchedulePlanChange();

  const handleRenew = useCallback(async (plan: SubscriptionPlan, memberCount: number, billingCycle: 'monthly' | 'yearly') => {
    if (!subscriptionStatus) return;

    const chargeCycle = subscriptionStatus.billing_cycle === 'yearly' ? 'yearly' : billingCycle;
    const basePrice = plan.base_price_per_member;
    const finalAmount = chargeCycle === 'yearly'
      ? getYearlyPriceForMembers(basePrice, memberCount)
      : getMonthlyPriceForMembers(basePrice, memberCount);

    try {
      await initiateMidtransPayment({
        planId: plan.id,
        planName: plan.name,
        amount: finalAmount,
        memberCount,
        billingCycle: chargeCycle,
      });
    } catch {
      toast.error(t('subscription.plans.error.renewalFailed', 'Unable to start renewal payment. Please try again.'));
    }
  }, [subscriptionStatus, initiateMidtransPayment, t]);

  const handleConfirmUpgrade = useCallback(async () => {
    if (!selectedPlan) return;

    try {
      // ✅ FIX: Jika subscription sudah expired, jangan schedule, langsung proses
      const isExpired = subscriptionStatus?.is_expired || false;
      
      // If prorate says no charge now AND subscription is NOT expired, schedule the change
      if (proRatedData?.calculation && proRatedData.calculation.charge_now === false && !isExpired) {
        await schedulePlanChange.mutateAsync({
          current_plan_id: proRatedData.current_plan.id,
          target_plan_id: proRatedData.target_plan.id,
          current_member_count: proRatedData.current_plan.member_count,
          target_member_count: proRatedData.calculation.new_member_count,
          change_type: (proRatedData.calculation.change_type || 'downgrade') as any,
          scheduled_date: proRatedData.calculation.scheduled_date,
          prorate_amount: 0,
          charge_now: false,
        });

        setIsModalOpen(false);
        setSelectedPlan(null);
        setProRatedData(null);
        return;
      }

      // Otherwise, proceed with immediate payment (upgrade/member increase OR expired subscription)
      const basePrice = selectedPlan.base_price_per_member;
      // Use prorate_amount if it exists and > 0, otherwise use full price
      const prorateAmount = proRatedData?.calculation?.prorate_amount;
      const fullPrice = isYearly
        ? getYearlyPriceForMembers(basePrice, selectedMemberCount)
        : getMonthlyPriceForMembers(basePrice, selectedMemberCount);
      const finalAmount = (prorateAmount !== undefined && prorateAmount > 0) ? prorateAmount : fullPrice;

      await initiateMidtransPayment({
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: finalAmount,
        memberCount: selectedMemberCount,
        billingCycle: isYearly ? 'yearly' : 'monthly',
        proRateDetails: proRatedData?.calculation ? {
          is_member_upgrade: proRatedData.calculation.is_upgrade && !proRatedData.calculation.is_plan_change,
          previous_member_count: proRatedData.current_plan.member_count,
          member_difference: proRatedData.calculation.member_difference,
          remaining_days: proRatedData.calculation.remaining_days,
          prorate_amount: proRatedData.calculation.prorate_amount,
          prorate_percentage: proRatedData.calculation.prorate_percentage
        } : undefined
      });
      
      setIsModalOpen(false);
      setSelectedPlan(null);
      setProRatedData(null);
    } catch {
      // Error surfaced via toast from payment/schedule
    }
  }, [selectedPlan, selectedMemberCount, isYearly, initiateMidtransPayment, proRatedData, schedulePlanChange, subscriptionStatus]);

  const handleChooseImmediate = useCallback(async () => {
    setIsOptionsModalOpen(false);
    
    if (!selectedPlan) return;

    try {
      // Directly proceed with immediate payment
      const basePrice = selectedPlan.base_price_per_member;
      // Use prorate_amount if it exists and > 0, otherwise use full price
      const prorateAmount = proRatedData?.calculation?.prorate_amount;
      const fullPrice = isYearly
        ? getYearlyPriceForMembers(basePrice, selectedMemberCount)
        : getMonthlyPriceForMembers(basePrice, selectedMemberCount);
      const finalAmount = (prorateAmount !== undefined && prorateAmount > 0) ? prorateAmount : fullPrice;

      await initiateMidtransPayment({
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: finalAmount,
        memberCount: selectedMemberCount,
        billingCycle: isYearly ? 'yearly' : 'monthly',
        proRateDetails: proRatedData?.calculation ? {
          is_member_upgrade: proRatedData.calculation.is_upgrade && !proRatedData.calculation.is_plan_change,
          previous_member_count: proRatedData.current_plan.member_count,
          member_difference: proRatedData.calculation.member_difference,
          remaining_days: proRatedData.calculation.remaining_days,
          prorate_amount: proRatedData.calculation.prorate_amount,
          prorate_percentage: proRatedData.calculation.prorate_percentage
        } : undefined
      });
      
      setSelectedPlan(null);
      setProRatedData(null);
    } catch {
      // Error surfaced via toast from payment
    }
  }, [selectedPlan, selectedMemberCount, isYearly, initiateMidtransPayment, proRatedData]);

  const handleChooseScheduled = useCallback(async () => {
    if (!selectedPlan || !proRatedData?.calculation) return;

    try {
      await schedulePlanChange.mutateAsync({
        current_plan_id: proRatedData.current_plan.id,
        target_plan_id: proRatedData.target_plan.id,
        current_member_count: proRatedData.current_plan.member_count,
        target_member_count: proRatedData.calculation.new_member_count,
        change_type: (proRatedData.calculation.change_type || 'upgrade') as any,
        scheduled_date: proRatedData.calculation.scheduled_date,
        prorate_amount: 0,
        charge_now: false,
      });

      setIsOptionsModalOpen(false);
      setSelectedPlan(null);
      setProRatedData(null);
    } catch {
      // Error surfaced via toast from schedulePlanChange
    }
  }, [selectedPlan, proRatedData, schedulePlanChange]);

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('basic')) return Users;
    if (planName.toLowerCase().includes('professional')) return Zap;
    if (planName.toLowerCase().includes('enterprise')) return Shield;
    return Star;
  };
  

  // Function to check if upgrade/downgrade is allowed
  const canChangePlan = (plan: any, newMemberCount: number) => {
    if (!subscriptionStatus) return true;
    
    const isCurrent = isCurrentPlan(plan);
    const currentMemberLimit = subscriptionStatus.member_count || 0;
    
    if (isCurrent) {
      // For current plan, always allow upgrade (increase member count)
      // For downgrade, check if new member count >= actual employee count
      if (newMemberCount < currentMemberLimit) {
        // This is a downgrade - check if we have enough room
        return currentEmployeeCount <= newMemberCount;
      }
      // This is an upgrade or same count - always allowed
      return true;
    }
    
    // For different plans, check if the new plan can accommodate current employees
    return currentEmployeeCount <= newMemberCount;
  };

  const getButtonText = (plan: any, memberCount: number, billingCycle: string, isRenewEligible: boolean) => {
    const isCurrent = isCurrentPlan(plan);
    const currentMemberLimit = subscriptionStatus?.member_count || 0;
    const currentBillingCycle = subscriptionStatus?.billing_cycle || 'monthly';
    
    if (isCurrent) {
      if (isRenewEligible && memberCount === currentMemberLimit && billingCycle === currentBillingCycle) {
        return t('subscription.plans.button.renew', 'Perpanjang Sekarang');
      }
      if (memberCount > currentMemberLimit) {
        return t('subscription.plans.button.upgrade', 'Upgrade Plan');
      } else if (memberCount < currentMemberLimit) {
        return canChangePlan(plan, memberCount) 
          ? t('subscription.plans.button.downgrade', 'Downgrade Plan') 
          : t('subscription.plans.button.cannotDowngrade', 'Cannot Downgrade');
      } else if (billingCycle !== currentBillingCycle) {
        return billingCycle === 'yearly' 
          ? t('subscription.plans.button.upgradeToYearly', 'Upgrade to Yearly') 
          : t('subscription.plans.button.switchToMonthly', 'Switch to Monthly');
      } else {
        return t('subscription.plans.button.current', 'Current Plan');
      }
    }
    
    return t('subscription.plans.button.select', 'Select Plan');
  };
  
  const daysUntilExpiry = subscriptionStatus?.days_until_expiry ?? null;
  const isRenewWindow = typeof daysUntilExpiry === 'number' && daysUntilExpiry >= 0 && daysUntilExpiry <= RENEWAL_WINDOW_DAYS;
  // Allow renewal if: (1) within renewal window OR (2) subscription is expired (not trial)
  const isRenewEligibleBase = Boolean(subscriptionStatus) && 
    (isRenewWindow || subscriptionStatus?.is_expired) && 
    !subscriptionStatus?.is_trial;
  if (isLoading) {
    return (
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        <div className="col-span-9">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
            <LoadingDots size="lg" />
          </div>
        </div>
        <div className="col-span-3">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
            <LoadingDots size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
      {/* Main Content Section - 9 columns */}
      <div className="col-span-9 flex flex-col min-h-0">
        <div className="flex-1 min-h-0">
          <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
            {/* Content Header */}
            <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="text-sm font-semibold text-gray-900">{t('subscription.plans.title', 'Subscription Plans')}</h2>
                  <p className="text-xs text-gray-500 mt-1">{t('subscription.plans.description', 'Choose the perfect plan for your organization')}</p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto seamless-scroll min-h-0">
              <div className="p-4 space-y-4">
                {/* Pending Changes Card */}
                <PendingChangesCard />

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {plans?.map((plan) => {
                    const isTrialPlan = plan.name === 'Trial' || plan.base_price_per_member === 0;
                    const maxEmployees = isTrialPlan ? getEmployeeLimitFromFeatures(plan.features) : 100;
                    const isCurrent = isCurrentPlan(plan);
                    const isRenewEligible = isCurrent && isRenewEligibleBase;
                    
                    // Use memberCounts state value for slider - this makes it interactive
                    // Only use fallback if memberCounts[plan.id] is undefined
                    const memberCount = memberCounts[plan.id] !== undefined 
                      ? memberCounts[plan.id]
                      : (isCurrent 
                          ? (subscriptionStatus?.member_count || currentMemberCount || 1)
                          : (isTrialPlan ? maxEmployees : 5)
                        );
                      
                    const billingCycle = billingCycles[plan.id] || 'monthly';
                    const isYearly = billingCycle === 'yearly';
                    const totalPrice = calculatePlanPrice(plan, memberCount, isYearly);
                    const monthlyPrice = plan.base_price_per_member * memberCount;
                    const IconComponent = getPlanIcon(plan.name);
                    
                    const isPopular = plan.name.toLowerCase().includes('professional');
                    const canChange = canChangePlan(plan, memberCount);
                    const buttonText = getButtonText(plan, memberCount, billingCycle, isRenewEligible);
                    const currentBillingCycle = subscriptionStatus?.billing_cycle || 'monthly';
                    const hasBillingCycleChange = isCurrent && billingCycle !== currentBillingCycle;
                    
                    return (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        memberCount={memberCount}
                        billingCycle={billingCycle}
                        totalPrice={totalPrice}
                        monthlyPrice={monthlyPrice}
                        maxEmployees={maxEmployees}
                        isTrialPlan={isTrialPlan}
                        isCurrent={isCurrent}
                        isPopular={isPopular}
                        canChange={canChange}
                        buttonText={buttonText}
                        hasBillingCycleChange={hasBillingCycleChange}
                        IconComponent={IconComponent}
                        currentMemberCount={currentMemberCount}
                        currentEmployeeCount={currentEmployeeCount}
                        isRenewEligible={isRenewEligible}
                        subscriptionStatus={subscriptionStatus}
                        onRenew={handleRenew}
                        onMemberCountChange={handleMemberCountChange}
                        onBillingCycleChange={handleBillingCycleChange}
                        onUpgrade={handleUpgrade}
                      />
                    );
                  })}
                </div>

                {/* Trust Indicators */}
                <TrustIndicators />
              </div>
            </div>

            {/* Content Footer */}
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  {applyVariables(t('subscription.plans.footer.showing', 'Showing {{count}} plans'), { count: String(plans?.length || 0) })}
                </div>
                <div className="text-xs text-gray-500">
                  {applyVariables(t('subscription.plans.footer.lastUpdated', 'Last updated: {{time}}'), { time: new Date().toLocaleTimeString() })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar Section - 3 columns */}
      <div className="col-span-3 h-full">
        <div className="bg-white border rounded-lg h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="px-4 py-1.5 border-b flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900">{t('subscription.plans.comparison.title', 'Plan Comparison')}</h3>
            <p className="text-xs text-gray-500 mt-1">{t('subscription.plans.comparison.description', 'Compare features and pricing')}</p>
          </div>

          {/* Scrollable Sidebar Content */}
          <div className="flex-1 overflow-y-auto seamless-scroll p-4">
            <div className="space-y-4">
              {/* Current Plan Summary */}
              {subscriptionStatus && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">{t('subscription.plans.comparison.currentPlan', 'Current Plan')}</h4>
                  <div className="space-y-1 text-xs text-blue-800">
                    <div className="flex justify-between">
                      <span>{t('subscription.plans.comparison.plan', 'Plan:')}</span>
                      <span className="font-medium">{subscriptionStatus.plan_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('subscription.plans.comparison.members', 'Members:')}</span>
                      <span className="font-medium">{subscriptionStatus.member_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('subscription.plans.comparison.billing', 'Billing:')}</span>
                      <span className="font-medium capitalize">{subscriptionStatus.billing_cycle}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-900">{t('subscription.plans.comparison.quickStats', 'Quick Stats')}</div>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>{t('subscription.plans.comparison.totalPlans', 'Total Plans:')}</span>
                    <span className="font-medium">{plans?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('subscription.plans.comparison.currentEmployees', 'Current Employees:')}</span>
                    <span className="font-medium">{currentEmployeeCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('subscription.plans.comparison.activeFeatures', 'Active Features:')}</span>
                    <span className="font-medium">{plans?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{t('subscription.plans.comparison.footer.livePricing', 'Live pricing')}</span>
              <span className="text-xs text-gray-400">{t('subscription.plans.comparison.footer.realTime', 'Real-time')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Confirmation Modal */}
      {selectedPlan && subscriptionStatus && (
        <UpgradeConfirmationModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onConfirm={handleConfirmUpgrade}
          currentPlan={subscriptionPlans?.find(p => p.name === subscriptionStatus?.plan_name) || selectedPlan}
          newPlan={selectedPlan}
          subscriptionStatus={subscriptionStatus}
          billingCycle={isYearly ? 'yearly' : 'monthly'}
          currentMemberCount={subscriptionStatus?.member_count}
          newMemberCount={selectedMemberCount}
          currentEmployeeCount={currentEmployeeCount}
          proRatedData={proRatedData}
        />
      )}

      <UpgradeOptionsModal
        open={isOptionsModalOpen}
        onOpenChange={setIsOptionsModalOpen}
        onChooseImmediate={handleChooseImmediate}
        onChooseScheduled={handleChooseScheduled}
        immediateAmount={proRatedData?.calculation?.prorate_amount || 0}
        scheduledDate={proRatedData?.calculation?.scheduled_date || ''}
        planName={selectedPlan?.name || ''}
        currentPlanName={proRatedData?.current_plan?.name || subscriptionStatus?.plan_name || 'Unknown Plan'}
        memberChange={{
          from: proRatedData?.current_plan?.member_count || subscriptionStatus?.member_count || 0,
          to: selectedMemberCount
        }}
        proRateData={{
          remainingDays: proRatedData?.calculation?.remaining_days || 31,
          proRatePercentage: proRatedData?.calculation?.prorate_percentage || 103.3,
          memberCostIncrease: proRatedData?.calculation?.prorate_amount || 0,
          currentPlanCredit: proRatedData?.calculation?.current_plan_credit || 0
        }}
      />
    </div>
  );
};

export default HRISSubscriptionPlansTab;
