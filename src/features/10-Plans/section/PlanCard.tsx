import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Slider } from '@/features/ui/slider';
import { Switch } from '@/features/ui/switch';
import { Label } from '@/features/ui/label';
import { Check, type LucideIcon } from 'lucide-react';
import { formatIDR } from '@/features/1-login/utils/subscriptionUtils';
import type { SubscriptionPlan } from '@/features/10-management/hooks/useOptimizedSubscription';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';

interface PlanCardProps {
  plan: SubscriptionPlan;
  memberCount: number;
  billingCycle: 'monthly' | 'yearly';
  totalPrice: number;
  monthlyPrice: number;
  maxEmployees: number;
  isTrialPlan: boolean;
  isCurrent: boolean;
  isPopular: boolean;
  canChange: boolean;
  buttonText: string;
  hasBillingCycleChange: boolean;
  IconComponent: LucideIcon;
  currentMemberCount: number;
  currentEmployeeCount: number;
  isRenewEligible: boolean;
  subscriptionStatus?: {
    is_trial?: boolean;
    days_until_expiry?: number;
    billing_cycle?: string;
  };
  onMemberCountChange: (planId: string, count: number) => void;
  onBillingCycleChange: (planId: string, isYearly: boolean) => void;
  onUpgrade: (plan: SubscriptionPlan, memberCount: number, billingCycle: 'monthly' | 'yearly') => void;
  onRenew?: (plan: SubscriptionPlan, memberCount: number, billingCycle: 'monthly' | 'yearly') => void;
}

export const PlanCard = memo(({
  plan,
  memberCount,
  billingCycle,
  totalPrice,
  monthlyPrice,
  maxEmployees,
  isTrialPlan,
  isCurrent,
  isPopular,
  canChange,
  buttonText,
  hasBillingCycleChange,
  IconComponent,
  currentMemberCount,
  currentEmployeeCount,
  isRenewEligible,
  subscriptionStatus,
  onMemberCountChange,
  onBillingCycleChange,
  onUpgrade,
  onRenew,
}: PlanCardProps) => {
  const { t } = useAppTranslation();
  const isYearly = billingCycle === 'yearly';
  const isComingSoon = plan.description?.toLowerCase().includes('coming soon') || 
                       plan.description?.toLowerCase().includes('comming soon');
  const shouldRenew =
    isRenewEligible &&
    isCurrent &&
    memberCount === currentMemberCount &&
    !hasBillingCycleChange;
  const handlePrimaryAction = () => {
    if (shouldRenew && onRenew) {
      onRenew(plan, memberCount, billingCycle);
    } else {
      onUpgrade(plan, memberCount, billingCycle);
    }
  };

  return (
    <Card 
      className={`relative transition-all duration-300 hover:shadow-xl flex flex-col h-full ${
        isCurrent 
          ? 'border-2 border-green-500 bg-green-50/50 shadow-lg' 
          : isPopular 
            ? 'border-2 border-blue-500 shadow-lg' 
            : 'border border-gray-200'
      }`}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-green-500 text-white px-4 py-1">
            {subscriptionStatus?.is_trial 
              ? applyVariables(t('subscription.plans.badge.trial', 'Trial - {{days}} days left'), { days: String(subscriptionStatus.days_until_expiry || 0) })
              : t('subscription.plans.badge.current', 'Current Plan')
            }
          </Badge>
        </div>
      )}
      {!isCurrent && isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-500 text-white px-4 py-1">
            {t('subscription.plans.badge.popular', 'Most Popular')}
          </Badge>
        </div>
      )}

      <CardHeader className="text-center space-y-2">
        <div className="flex justify-center">
          <div className={`p-3 rounded-full ${
            isCurrent 
              ? 'bg-green-100 text-green-600' 
              : isPopular 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-gray-100 text-gray-600'
          }`}>
            <IconComponent className="h-6 w-6" />
          </div>
        </div>
        
        <div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {plan.name}
          </CardTitle>
          <CardDescription className="text-base text-gray-600 mt-2">
            {plan.description}
          </CardDescription>
        </div>

        {/* Pricing */}
        <div className="space-y-2">
          <div className="text-4xl font-bold text-gray-900">
            {formatIDR(totalPrice)}
          </div>
          <div className="text-sm text-gray-600">
            {isYearly 
              ? applyVariables(t('subscription.plans.pricing.perYear', 'per year for {{count}} members'), { count: String(memberCount) })
              : applyVariables(t('subscription.plans.pricing.perMonth', 'per month for {{count}} members'), { count: String(memberCount) })
            }
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 flex flex-col h-full">
        {/* Employee Count Slider */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            {applyVariables(t('subscription.plans.memberCount.label', 'Member Count: {{count}}'), { count: String(memberCount) })}
            {isTrialPlan && applyVariables(t('subscription.plans.memberCount.max', '(max {{max}})'), { max: String(maxEmployees) })}
          </Label>
          <Slider
            value={[memberCount]}
            onValueChange={isTrialPlan ? undefined : (value) => onMemberCountChange(plan.id, value[0])}
            max={maxEmployees}
            min={1}
            step={1}
            className={`w-full ${isTrialPlan ? 'opacity-50 pointer-events-none' : ''}`}
            disabled={isTrialPlan}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{t('subscription.plans.memberCount.min', '1 member')}</span>
            <span>{applyVariables(t('subscription.plans.memberCount.maxDisplay', '{{max}} member'), { max: String(maxEmployees) })}</span>
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-700">
            {t('subscription.plans.billingCycle.yearly', 'Yearly Billing')}
          </Label>
          <Switch
            checked={billingCycle === 'yearly'}
            onCheckedChange={isTrialPlan ? undefined : (checked) => onBillingCycleChange(plan.id, checked)}
            disabled={isTrialPlan}
            className={isTrialPlan ? 'opacity-50 pointer-events-none' : ''}
          />
        </div>

        {/* Features */}
        <div className="space-y-3 flex-grow">
          <h4 className="font-medium text-gray-900">{t('subscription.plans.features.title', 'Included Features:')}</h4>
          <ul className="space-y-2 min-h-[120px]">
            {plan.features?.map((feature, index) => (
              <li key={index} className="flex items-start space-x-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Button - Fixed at bottom */}
        <div className="mt-auto">
          <Button 
            className={`w-full py-3 text-base font-medium ${
              isComingSoon
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : !canChange
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : isCurrent && memberCount === currentMemberCount
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : isPopular 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
            onClick={handlePrimaryAction}
            disabled={
              isComingSoon ||
              !canChange || 
              (isCurrent && memberCount === currentMemberCount && !hasBillingCycleChange && !isRenewEligible)
            }
          >
            {isComingSoon ? t('subscription.plans.button.comingSoon', 'Coming Soon') : buttonText}
          </Button>
          {isCurrent && (
            <div className="text-xs text-green-600 font-medium text-center mt-2">
              {applyVariables(t('subscription.plans.currentPlan.label', 'Current plan: {{memberCount}} member limit | {{employeeCount}} active employees'), { 
                memberCount: String(currentMemberCount), 
                employeeCount: String(currentEmployeeCount) 
              })}
            </div>
          )}
          {!canChange && isCurrent && memberCount < currentMemberCount && (
            <p className="text-xs text-red-500 text-center mt-2">
              {applyVariables(t('subscription.plans.downgrade.error', 'Cannot downgrade. You have {{count}} active employees.'), { 
                count: String(currentEmployeeCount) 
              })}
            </p>
          )}
        </div>

        {/* Savings Text */}
        {isYearly && plan.annual_discount_percentage && (
          <div className="text-center">
            <div className="text-sm text-green-600 font-medium">
              {applyVariables(t('subscription.plans.savings', 'Save {{percentage}}% with yearly plan!'), { 
                percentage: String(plan.annual_discount_percentage) 
              })}
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>{t('subscription.plans.priceBreakdown.perMember', 'Price per member:')}</span>
            <span>{formatIDR(plan.base_price_per_member)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('subscription.plans.priceBreakdown.monthlySubtotal', 'Monthly subtotal:')}</span>
            <span>{formatIDR(monthlyPrice)}</span>
          </div>
          {isYearly && plan.annual_discount_percentage && (
            <>
              <div className="flex justify-between text-red-600">
                <span>{applyVariables(t('subscription.plans.priceBreakdown.yearlyDiscount', 'Yearly discount ({{percentage}}%):'), { 
                  percentage: String(plan.annual_discount_percentage) 
                })}</span>
                <span>-{formatIDR(monthlyPrice * 12 * (plan.annual_discount_percentage / 100))}</span>
              </div>
            </>
          )}
          <hr />
          <div className="flex justify-between font-medium text-gray-900">
            <span>{isYearly 
              ? t('subscription.plans.priceBreakdown.totalYearly', 'Total yearly:')
              : t('subscription.plans.priceBreakdown.totalMonthly', 'Total monthly:')
            }</span>
            <span>{formatIDR(totalPrice)}</span>
          </div>
        </div>

        {plan.demo_required && (
          <p className="text-xs text-center text-gray-500">
            {t('subscription.plans.demoRequired', 'This plan requires a demo first')}
          </p>
        )}
      </CardContent>
    </Card>
  );
});

PlanCard.displayName = 'PlanCard';
