import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Card, CardContent } from '@/features/ui/card';
import { CreditCard, Calendar, Clock, DollarSign } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';
import './UpgradeConfirmationModal.css';

interface UpgradeOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseImmediate: () => void;
  onChooseScheduled: () => void;
  immediateAmount: number;
  scheduledDate: string;
  planName: string;
  currentPlanName?: string;
  memberChange: {
    from: number;
    to: number;
  };
  proRateData?: {
    remainingDays: number;
    proRatePercentage: number;
    memberCostIncrease: number;
    currentPlanCredit: number;
  };
}

export const UpgradeOptionsModal = ({
  open,
  onOpenChange,
  onChooseImmediate,
  onChooseScheduled,
  immediateAmount,
  scheduledDate,
  planName,
  currentPlanName = 'Unknown Plan',
  memberChange,
  proRateData
}: UpgradeOptionsModalProps) => {
  const { t, language } = useAppTranslation();
  
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const locale = language === 'id' ? 'id-ID' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[500px] h-[500px] max-w-[500px] max-h-[500px] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl">{t('subscription.plans.modal.options.title', 'Confirm Member Upgrade')}</DialogTitle>
          <DialogDescription>
            {applyVariables(t('subscription.plans.modal.options.description', 'Choose when you want to apply changes to {{planName}}'), { planName })}
          </DialogDescription>
        </DialogHeader>

        {/* Detail Upgrade */}
        <div className="flex-1 min-h-0 seamless-scroll overflow-auto px-6 pb-6">
          <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">{t('subscription.plans.modal.details.title', 'Change Details:')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('subscription.plans.modal.details.currentPlan', 'Current Plan:')}</span>
                <span className="font-medium">{currentPlanName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('subscription.plans.modal.details.newPlan', 'New Plan:')}</span>
                <span className="font-medium">{planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('subscription.plans.modal.details.currentMember', 'Current Members:')}</span>
                <span className="font-medium">{memberChange.from} member</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('subscription.plans.modal.details.newMember', 'New Members:')}</span>
                <span className="font-medium">{memberChange.to} member</span>
              </div>
              {memberChange.to !== memberChange.from && (
                <div className={`flex justify-between ${memberChange.to > memberChange.from ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="font-medium">
                    {memberChange.to > memberChange.from 
                      ? t('subscription.plans.modal.options.memberIncrease', 'Additional Members:')
                      : t('subscription.plans.modal.options.memberDecrease', 'Member Reduction:')}
                  </span>
                  <span className="font-semibold">
                    {memberChange.to > memberChange.from ? '+' : ''}{memberChange.to - memberChange.from} member
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">{t('subscription.plans.modal.prorate.title', 'Prorate Calculation:')}</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">{t('subscription.plans.modal.prorate.remainingDays', 'Remaining Subscription Days:')}</span>
                <span className="font-medium text-blue-900">{proRateData?.remainingDays || 31} {t('subscription.plans.modal.scheduled.days', 'days')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">{t('subscription.plans.modal.prorate.percentage', 'Prorate Percentage:')}</span>
                <span className="font-medium text-blue-900">{Math.round((proRateData?.proRatePercentage || 103.3) * 100) / 100}%</span>
              </div>
              
              {/* Simplified breakdown */}
              <div className="pt-2 border-t border-blue-200">
                <div className="space-y-1 text-sm">
                  {memberChange.to > memberChange.from ? (
                    // Member increase scenario
                    <>
                      <div className="flex justify-between">
                        <span className="text-blue-700">{t('subscription.plans.modal.options.memberIncrease', 'Additional Members:')}</span>
                        <span className="text-blue-900">+{memberChange.to - memberChange.from} member</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">{t('subscription.plans.modal.options.costPerMember', 'Cost per member (prorate):')}</span>
                        <span className="text-blue-900">{formatIDR((proRateData?.memberCostIncrease || immediateAmount) / Math.abs(memberChange.to - memberChange.from))}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-blue-700">{t('subscription.plans.modal.options.totalMemberCost', 'Total additional member cost:')}</span>
                        <span className="text-blue-900">{formatIDR(proRateData?.memberCostIncrease || immediateAmount)}</span>
                      </div>
                    </>
                  ) : memberChange.to < memberChange.from ? (
                    // Member decrease scenario
                    <>
                      <div className="flex justify-between">
                        <span className="text-blue-700">{t('subscription.plans.modal.options.memberDecrease', 'Member Reduction:')}</span>
                        <span className="text-blue-900">{memberChange.to - memberChange.from} member</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">{t('subscription.plans.modal.options.planUpgradeCost', 'Plan upgrade cost (prorate):')}</span>
                        <span className="text-blue-900">{formatIDR(immediateAmount)}</span>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded p-2 mt-2">
                        <p className="text-xs text-orange-700">
                          ⚠️ {t('subscription.plans.modal.options.memberReductionNote', 'Member reduction does not incur additional charges. The cost above is for plan upgrade only.')}
                        </p>
                      </div>
                    </>
                  ) : (
                    // No member change - plan change only
                    <div className="flex justify-between font-medium">
                      <span className="text-blue-700">{t('subscription.plans.modal.options.planUpgradeCost', 'Plan upgrade cost (prorate):')}</span>
                      <span className="text-blue-900">{formatIDR(immediateAmount)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between font-semibold text-blue-600 pt-2 border-t border-blue-200">
                <span>{t('subscription.plans.modal.prorate.total', 'Total Prorate:')}</span>
                <span>{formatIDR(immediateAmount)}</span>
              </div>
            </div>
            {/* Only show warning if current members exceed new plan limit */}
            {memberChange.from > memberChange.to && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-700 flex items-center gap-1">
                  <span>💡</span>
                  {t('subscription.plans.modal.options.autoReductionNote', 'After confirmation, members will be automatically reduced to match the new plan limit')}
                </p>
              </div>
            )}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">{t('subscription.plans.modal.payment.total', 'Total Payment:')}</h4>
            <div className="text-2xl font-bold text-green-600">{formatIDR(immediateAmount)}</div>
            <p className="text-sm text-green-700 mt-1">{t('subscription.plans.modal.payment.immediate', 'Payment will be processed immediately and changes will take effect right away')}</p>
          </div>

          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-3 p-6 pt-4 border-t bg-background flex-shrink-0">
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t('subscription.plans.modal.button.cancel', 'Cancel')}
          </Button>
          <Button 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={onChooseImmediate}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {t('subscription.plans.modal.button.confirmPay', 'Confirm & Pay')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};