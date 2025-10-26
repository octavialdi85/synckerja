import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { formatIDR } from '@/features/1-login/utils/subscriptionUtils';
import { SubscriptionPlan } from '@/features/10-management/hooks/useOptimizedSubscription';
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
  proRatedData,
  isLoading
}: UpgradeConfirmationModalProps) => {
  const isYearly = billingCycle === 'yearly';
  const memberCount = newMemberCount;
  const selectedPlan = newPlan;
  
  // Calculate total amount based on plan and billing cycle
  const totalAmount = isYearly 
    ? (newPlan.base_price_per_member * newMemberCount * 12 * (1 - (newPlan.annual_discount_percentage || 0) / 100))
    : (newPlan.base_price_per_member * newMemberCount);
  const isProRate = proRatedData?.calculation;
  const isScheduledChange = isProRate && !proRatedData.calculation.charge_now;
  const isImmediateCharge = isProRate && proRatedData.calculation.charge_now;
  const isPlanChange = isProRate && proRatedData.calculation.is_plan_change;
  const isMemberChange = isProRate && proRatedData.calculation.member_difference !== 0;

  const getModalTitle = () => {
    if (isScheduledChange) {
      if (isPlanChange) return 'Jadwalkan Perubahan Plan';
      return 'Jadwalkan Perubahan Member';
    }
    if (isPlanChange) return 'Konfirmasi Perubahan Plan';
    return 'Konfirmasi Upgrade Member';
  };

  const getButtonText = () => {
    if (isScheduledChange) return 'Jadwalkan Perubahan';
    return 'Konfirmasi & Bayar';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Tanggal tidak tersedia';
    
    const date = new Date(dateStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateStr);
      return 'Tanggal tidak valid';
    }
    
    // Check if date is in the past (shouldn't happen for scheduled changes)
    const now = new Date();
    if (date < now) {
      console.warn('Scheduled date is in the past:', dateStr);
      // For past dates, show current date + 1 day as fallback
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return tomorrow.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[500px] h-[500px] max-w-[500px] max-h-[500px] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-bold">
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 seamless-scroll overflow-auto px-6 pb-6">
          <div className="space-y-4">
          {/* Current vs New Plan Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Detail Perubahan:</h4>
            
            {proRatedData ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Plan saat ini:</span>
                  <span>{proRatedData.current_plan?.name || currentPlan?.name || 'Unknown'}</span>
                </div>
                {isPlanChange && (
                  <div className="flex justify-between">
                    <span>Plan baru:</span>
                    <span>{proRatedData.target_plan?.name || newPlan?.name || 'Unknown'}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Member saat ini:</span>
                  <span>{proRatedData.current_plan.member_count} member</span>
                </div>
                <div className="flex justify-between">
                  <span>Member baru:</span>
                  <span>{proRatedData.calculation.new_member_count} member</span>
                </div>
                {proRatedData.calculation.member_difference !== 0 && (
                  <div className={`flex justify-between font-medium ${
                    proRatedData.calculation.member_difference > 0 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    <span>
                      {proRatedData.calculation.member_difference > 0 ? 'Tambahan member:' : 'Pengurangan member:'}
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
                  <span>Plan:</span>
                  <span>{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Member:</span>
                  <span>{memberCount} member</span>
                </div>
                <div className="flex justify-between">
                  <span>Billing:</span>
                  <span>{isYearly ? 'Tahunan' : 'Bulanan'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Scheduled Change Info */}
          {isScheduledChange && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-semibold mb-2 text-orange-800">📅 Perubahan Dijadwalkan:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tanggal efektif:</span>
                  <span className="font-medium">{formatDate(proRatedData.calculation.scheduled_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sisa hari periode saat ini:</span>
                  <span>{proRatedData.calculation.remaining_days} hari</span>
                </div>
              </div>
              <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-700">
                💡 Sesuai kebijakan "no refund", perubahan akan berlaku di akhir periode berjalan
              </div>
            </div>
          )}

          {/* Immediate Prorate Calculation */}
          {isImmediateCharge && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-2 text-blue-800">💰 Kalkulasi Prorate:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Sisa hari subscription:</span>
                  <span>{proRatedData.calculation.remaining_days} hari</span>
                </div>
                <div className="flex justify-between">
                  <span>Persentase prorate:</span>
                  <span>{proRatedData.calculation.prorate_percentage.toFixed(1)}%</span>
                </div>
                {proRatedData.calculation.plan_change_charge > 0 && (
                  <div className="flex justify-between">
                    <span>Biaya perubahan plan:</span>
                    <span>{formatIDR(proRatedData.calculation.plan_change_charge)}</span>
                  </div>
                )}
                {proRatedData.calculation.member_change_charge > 0 && (
                  <div className="flex justify-between">
                    <span>Biaya tambahan member:</span>
                    <span>{formatIDR(proRatedData.calculation.member_change_charge)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-blue-700 border-t pt-1">
                  <span>Total prorate:</span>
                  <span>{formatIDR(proRatedData.calculation.prorate_amount)}</span>
                </div>
              </div>
              <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-600">
                💡 Anda hanya membayar untuk peningkatan sesuai sisa periode subscription
              </div>
            </div>
          )}

          {/* Payment Amount */}
          {isImmediateCharge ? (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-800">Total Pembayaran:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatIDR(totalAmount)}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Pembayaran akan diproses segera dan perubahan berlaku langsung
              </p>
            </div>
          ) : isScheduledChange ? (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">Biaya Tambahan:</span>
                <span className="text-xl font-bold text-gray-600">
                  {formatIDR(0)}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Tidak ada biaya tambahan. Perubahan akan berlaku di akhir periode berjalan.
              </p>
            </div>
          ) : (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-800">Total Pembayaran:</span>
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
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            className={`flex-1 ${
              isScheduledChange 
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : getButtonText()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};