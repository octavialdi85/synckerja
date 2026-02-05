import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { formatIDR } from '@/features/1-login/utils/subscriptionUtils';
import { SubscriptionPlan } from '@/features/10-management/hooks/useOptimizedSubscription';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';
import { EmployeeRemovalSelector } from '../components/EmployeeRemovalSelector';
import { useState, useCallback, useEffect } from 'react';
import { useEmployeeCount } from '@/features/share/hooks/useEmployeeCount';
import './UpgradeConfirmationModal.css';

interface ProRatedData {
  current_plan: {
    name: string;
    member_count: number;
    base_price_per_member: number;
    billing_cycle: string;
    end_date: string;
  };
  target_plan: {
    name: string;
    base_price_per_member: number;
  };
  calculation: {
    new_member_count: number;
    member_difference: number;
    remaining_days: number;
    total_days: number;
    prorate_percentage: number;
    prorate_amount: number;
    plan_change_charge: number;
    member_change_charge: number;
    is_upgrade: boolean;
    is_plan_change: boolean;
    charge_now: boolean;
    change_type: string;
    scheduled_date: string;
  };
}

interface UpgradeConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  currentPlan: SubscriptionPlan;
  newPlan: SubscriptionPlan;
  subscriptionStatus: any;
  billingCycle: 'monthly' | 'yearly';
  currentMemberCount: number;
  newMemberCount: number;
  currentEmployeeCount?: number;
  proRatedData?: ProRatedData;
  isLoading?: boolean;
}

export const UpgradeConfirmationModal = ({
  open,
  onOpenChange,
  onConfirm,
  currentPlan,
  newPlan,
  subscriptionStatus,
  billingCycle,
  currentMemberCount,
  newMemberCount,
  currentEmployeeCount: propCurrentEmployeeCount = 0,
  proRatedData,
  isLoading
}: UpgradeConfirmationModalProps) => {
  const { t, language } = useAppTranslation();
  const isYearly = billingCycle === 'yearly';
  const memberCount = newMemberCount;
  const selectedPlan = newPlan;
  
  // Also fetch employee count directly in modal as fallback
  const { data: fetchedEmployeeCount = 0 } = useEmployeeCount();
  // Use prop value if available, otherwise use fetched value
  const currentEmployeeCount = propCurrentEmployeeCount > 0 ? propCurrentEmployeeCount : fetchedEmployeeCount;
  
  // State untuk tracking employee removal selection
  const [isRemovalSelectionValid, setIsRemovalSelectionValid] = useState(false);
  const [removalSelectionCount, setRemovalSelectionCount] = useState(0);
  const [requiredRemovalCount, setRequiredRemovalCount] = useState(0);

  // Calculate if this is a downgrade that requires employee removal
  const effectiveCurrentCount = proRatedData?.current_plan?.member_count || currentMemberCount;
  const effectiveNewCount = proRatedData?.calculation?.new_member_count || newMemberCount;
  const isDowngrade = effectiveNewCount < effectiveCurrentCount;
  
  // Show removal selector if it's a downgrade - EmployeeRemovalSelector will handle the logic internally
  // We show it if it's a downgrade, even if currentEmployeeCount is still loading (0)
  // The component itself will handle the actual removal requirement check
  const requiresRemoval = isDowngrade;

  // Reset selection state when requiresRemoval changes
  useEffect(() => {
    if (!requiresRemoval) {
      setIsRemovalSelectionValid(false);
      setRemovalSelectionCount(0);
      setRequiredRemovalCount(0);
    }
  }, [requiresRemoval]);

  // Handler for selection change
  const handleRemovalSelectionChange = useCallback((selectedCount: number, requiredCount: number) => {
    setRemovalSelectionCount(selectedCount);
    setRequiredRemovalCount(requiredCount);
    setIsRemovalSelectionValid(selectedCount >= requiredCount);
  }, []);
  
  // Calculate total amount - use prorate_amount if immediate charge and > 0, otherwise full price
  const isProRate = proRatedData?.calculation;
  const isScheduledChange = isProRate && !proRatedData.calculation.charge_now;
  const isImmediateCharge = isProRate && proRatedData.calculation.charge_now;
  
  // Use prorate_amount if it exists and > 0, otherwise use full price (consistent with HRISSubscriptionPlansTab.tsx)
  const prorateAmount = proRatedData?.calculation?.prorate_amount;
  const fullPrice = isYearly 
    ? (newPlan.base_price_per_member * newMemberCount * 12 * (1 - (newPlan.annual_discount_percentage || 0) / 100))
    : (newPlan.base_price_per_member * newMemberCount);
  
  const totalAmount = (isImmediateCharge && prorateAmount !== undefined && prorateAmount > 0)
    ? prorateAmount
    : fullPrice;
  const isPlanChange = isProRate && proRatedData.calculation.is_plan_change;
  const isMemberChange = isProRate && proRatedData.calculation.member_difference !== 0;

  const getModalTitle = () => {
    if (isScheduledChange) {
      if (isPlanChange) return t('subscription.plans.modal.title.schedulePlan', 'Schedule Plan Change');
      return t('subscription.plans.modal.title.scheduleMember', 'Schedule Member Change');
    }
    if (isPlanChange) return t('subscription.plans.modal.title.confirmPlan', 'Confirm Plan Change');
    return t('subscription.plans.modal.title.confirmMember', 'Confirm Member Upgrade');
  };

  const getButtonText = () => {
    if (isScheduledChange) return t('subscription.plans.modal.button.schedule', 'Schedule Change');
    // Only disable if it's a downgrade AND currentEmployeeCount is available AND selection is not valid
    if (requiresRemoval && currentEmployeeCount > 0 && !isRemovalSelectionValid) {
      return t('subscription.plans.modal.button.selectEmployees', 'Select Employees First');
    }
    return t('subscription.plans.modal.button.confirmPay', 'Confirm & Pay');
  };

  // Disable button if removal is required and selection is not yet valid
  const isConfirmDisabled = requiresRemoval && !isRemovalSelectionValid;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return t('subscription.plans.modal.date.unavailable', 'Date unavailable');
    
    const date = new Date(dateStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return t('subscription.plans.modal.date.invalid', 'Invalid date');
    }

    const now = new Date();
    if (date < now) {
      // For past dates, show current date + 1 day as fallback
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const locale = language === 'id' ? 'id-ID' : 'en-US';
      return tomorrow.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    
    const locale = language === 'id' ? 'id-ID' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[500px] h-[600px] max-w-[500px] max-h-[600px] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-bold">
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 seamless-scroll overflow-auto px-6 pb-6">
          <div className="space-y-4">
          {/* Current vs New Plan Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">{t('subscription.plans.modal.details.title', 'Change Details:')}</h4>
            
            {proRatedData ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('subscription.plans.modal.details.currentPlan', 'Current Plan:')}</span>
                  <span>{proRatedData.current_plan?.name || currentPlan?.name || 'Unknown'}</span>
                </div>
                {isPlanChange && (
                  <div className="flex justify-between">
                    <span>{t('subscription.plans.modal.details.newPlan', 'New Plan:')}</span>
                    <span>{proRatedData.target_plan?.name || newPlan?.name || 'Unknown'}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t('subscription.plans.modal.details.currentMember', 'Current Members:')}</span>
                  <span>{proRatedData.current_plan.member_count} member</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('subscription.plans.modal.details.newMember', 'New Members:')}</span>
                  <span>{proRatedData.calculation.new_member_count} member</span>
                </div>
                {proRatedData.calculation.member_difference !== 0 && (
                  <div className={`flex justify-between font-medium ${
                    proRatedData.calculation.member_difference > 0 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    <span>
                      {proRatedData.calculation.member_difference > 0 
                        ? t('subscription.plans.modal.details.additionalMember', 'Additional Members:')
                        : t('subscription.plans.modal.details.reductionMember', 'Member Reduction:')}
                    </span>
                    <span>
                      {proRatedData.calculation.member_difference > 0 ? '+' : ''}
                      {proRatedData.calculation.member_difference} member
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('subscription.plans.modal.details.plan', 'Plan:')}</span>
                  <span>{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('subscription.plans.modal.details.member', 'Member:')}</span>
                  <span>{memberCount} member</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('subscription.plans.modal.details.billing', 'Billing:')}</span>
                  <span>{isYearly 
                    ? t('subscription.plans.modal.details.billingYearly', 'Yearly')
                    : t('subscription.plans.modal.details.billingMonthly', 'Monthly')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Scheduled Change Info */}
          {isScheduledChange && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-semibold mb-2 text-orange-800">📅 {t('subscription.plans.modal.scheduled.title', 'Scheduled Change:')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('subscription.plans.modal.scheduled.effectiveDate', 'Effective Date:')}</span>
                  <span className="font-medium">{formatDate(proRatedData.calculation.scheduled_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('subscription.plans.modal.scheduled.remainingDays', 'Remaining Days in Current Period:')}</span>
                  <span>{proRatedData.calculation.remaining_days} {t('subscription.plans.modal.scheduled.days', 'days')}</span>
                </div>
              </div>
              <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-700">
                💡 {t('subscription.plans.modal.scheduled.policy', 'Per our "no refund" policy, changes will take effect at the end of the current period')}
              </div>
            </div>
          )}

          {/* Employee Removal Selector - Show if downgrade requires removal */}
          {requiresRemoval && (
            <EmployeeRemovalSelector
              currentEmployeeCount={currentEmployeeCount}
              newMemberCount={effectiveNewCount}
              onSelectionChange={handleRemovalSelectionChange}
            />
          )}

          {/* Immediate Prorate Calculation */}
          {isImmediateCharge && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-2 text-blue-800">💰 {t('subscription.plans.modal.prorate.title', 'Prorate Calculation:')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('subscription.plans.modal.prorate.remainingDays', 'Remaining Subscription Days:')}</span>
                  <span>{proRatedData.calculation.remaining_days} {t('subscription.plans.modal.scheduled.days', 'days')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('subscription.plans.modal.prorate.percentage', 'Prorate Percentage:')}</span>
                  <span>{proRatedData.calculation.prorate_percentage.toFixed(1)}%</span>
                </div>
                {proRatedData.calculation.plan_change_charge > 0 && (
                  <div className="flex justify-between">
                    <span>{t('subscription.plans.modal.prorate.planChangeCost', 'Plan Change Cost:')}</span>
                    <span>{formatIDR(proRatedData.calculation.plan_change_charge)}</span>
                  </div>
                )}
                {proRatedData.calculation.member_change_charge > 0 && (
                  <div className="flex justify-between">
                    <span>{t('subscription.plans.modal.prorate.memberCost', 'Additional Member Cost:')}</span>
                    <span>{formatIDR(proRatedData.calculation.member_change_charge)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-blue-700 border-t pt-1">
                  <span>{t('subscription.plans.modal.prorate.total', 'Total Prorate:')}</span>
                  <span>{formatIDR(proRatedData.calculation.prorate_amount)}</span>
                </div>
              </div>
              <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-600">
                💡 {t('subscription.plans.modal.prorate.note', 'You only pay for the upgrade based on the remaining subscription period')}
              </div>
            </div>
          )}

          {/* Payment Amount */}
          {isImmediateCharge ? (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-800">{t('subscription.plans.modal.payment.total', 'Total Payment:')}</span>
                <span className="text-xl font-bold text-green-600">
                  {formatIDR(totalAmount)}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {t('subscription.plans.modal.payment.immediate', 'Payment will be processed immediately and changes will take effect right away')}
              </p>
            </div>
          ) : isScheduledChange ? (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">{t('subscription.plans.modal.payment.additionalCost', 'Additional Cost:')}</span>
                <span className="text-xl font-bold text-gray-600">
                  {formatIDR(0)}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {t('subscription.plans.modal.payment.noAdditionalCost', 'No additional cost. Changes will take effect at the end of the current period.')}
              </p>
            </div>
          ) : (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-800">{t('subscription.plans.modal.payment.total', 'Total Payment:')}</span>
                <span className="text-xl font-bold text-green-600">
                  {formatIDR(totalAmount)}
                </span>
              </div>
            </div>
          )}

          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-3 p-6 pt-4 border-t bg-background flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isLoading}
          >
            {t('subscription.plans.modal.button.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            className={`flex-1 ${
              isScheduledChange 
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
            disabled={isLoading || isConfirmDisabled}
          >
            {isLoading ? t('subscription.plans.modal.button.processing', 'Processing...') : getButtonText()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};