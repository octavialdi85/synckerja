import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Card, CardContent } from '@/features/ui/card';
import { CreditCard, Calendar, Clock, DollarSign } from 'lucide-react';
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
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[500px] h-[500px] max-w-[500px] max-h-[500px] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl">Konfirmasi Upgrade Member</DialogTitle>
          <DialogDescription>
            Pilih kapan Anda ingin menerapkan perubahan ke {planName}
          </DialogDescription>
        </DialogHeader>

        {/* Detail Upgrade */}
        <div className="flex-1 min-h-0 seamless-scroll overflow-auto px-6 pb-6">
          <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Detail Perubahan:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan saat ini:</span>
                <span className="font-medium">{currentPlanName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Plan baru:</span>
                <span className="font-medium">{planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member saat ini:</span>
                <span className="font-medium">{memberChange.from} member</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member baru:</span>
                <span className="font-medium">{memberChange.to} member</span>
              </div>
              {memberChange.to !== memberChange.from && (
                <div className={`flex justify-between ${memberChange.to > memberChange.from ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="font-medium">
                    {memberChange.to > memberChange.from ? 'Tambahan member:' : 'Pengurangan member:'}
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
              <h4 className="font-semibold text-blue-900">Kalkulasi Prorate:</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Sisa hari subscription:</span>
                <span className="font-medium text-blue-900">{proRateData?.remainingDays || 31} hari</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Persentase prorate:</span>
                <span className="font-medium text-blue-900">{Math.round((proRateData?.proRatePercentage || 103.3) * 100) / 100}%</span>
              </div>
              
              {/* Simplified breakdown */}
              <div className="pt-2 border-t border-blue-200">
                <div className="space-y-1 text-sm">
                  {memberChange.to > memberChange.from ? (
                    // Member increase scenario
                    <>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Tambahan member:</span>
                        <span className="text-blue-900">+{memberChange.to - memberChange.from} member</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Biaya per member (prorate):</span>
                        <span className="text-blue-900">{formatIDR((proRateData?.memberCostIncrease || immediateAmount) / Math.abs(memberChange.to - memberChange.from))}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-blue-700">Total biaya tambahan member:</span>
                        <span className="text-blue-900">{formatIDR(proRateData?.memberCostIncrease || immediateAmount)}</span>
                      </div>
                    </>
                  ) : memberChange.to < memberChange.from ? (
                    // Member decrease scenario
                    <>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Pengurangan member:</span>
                        <span className="text-blue-900">{memberChange.to - memberChange.from} member</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Biaya upgrade plan (prorate):</span>
                        <span className="text-blue-900">{formatIDR(immediateAmount)}</span>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded p-2 mt-2">
                        <p className="text-xs text-orange-700">
                          ⚠️ Pengurangan member tidak dikenakan biaya tambahan. 
                          Biaya di atas adalah untuk upgrade plan saja.
                        </p>
                      </div>
                    </>
                  ) : (
                    // No member change - plan change only
                    <div className="flex justify-between font-medium">
                      <span className="text-blue-700">Biaya upgrade plan (prorate):</span>
                      <span className="text-blue-900">{formatIDR(immediateAmount)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between font-semibold text-blue-600 pt-2 border-t border-blue-200">
                <span>Total prorate:</span>
                <span>{formatIDR(immediateAmount)}</span>
              </div>
            </div>
            {/* Only show warning if current members exceed new plan limit */}
            {memberChange.from > memberChange.to && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-700 flex items-center gap-1">
                  <span>💡</span>
                   Setelah konfirmasi, member akan otomatis dikurangi sesuai batas plan baru
                </p>
              </div>
            )}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Total Pembayaran:</h4>
            <div className="text-2xl font-bold text-green-600">{formatIDR(immediateAmount)}</div>
            <p className="text-sm text-green-700 mt-1">Pembayaran akan diproses segera dan perubahan berlaku langsung</p>
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
            Batal
          </Button>
          <Button 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={onChooseImmediate}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Konfirmasi & Bayar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};