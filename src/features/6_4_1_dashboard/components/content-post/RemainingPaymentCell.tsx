import { Progress } from '@/features/ui/progress';
import { Badge } from '@/features/ui/badge';
import { DollarSign, TrendingUp } from 'lucide-react';
import { PaymentMilestone } from '@/hooks/organized/utils';
interface RemainingPaymentCellProps {
  milestones: PaymentMilestone[];
}
export const RemainingPaymentCell = ({
  milestones
}: RemainingPaymentCellProps) => {
  if (!milestones || milestones.length === 0) {
    return <div className="text-xs text-muted-foreground">
        No payment data
      </div>;
  }
  const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
  const paidAmount = milestones.filter(m => m.status === 'completed').reduce((sum, m) => sum + m.amount, 0);
  const remainingAmount = totalAmount - paidAmount;
  const progressPercentage = totalAmount > 0 ? paidAmount / totalAmount * 100 : 0;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate completion count for display
  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const totalCount = milestones.length;
  const getNextMilestone = () => {
    return milestones.filter(m => m.status === 'pending' || m.status === 'in_progress').sort((a, b) => a.milestone_order - b.milestone_order)[0];
  };
  const nextMilestone = getNextMilestone();
  const isFullyPaid = remainingAmount <= 0;
  return <div className="space-y-2 min-w-[160px]">
      {/* Main amount display */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {isFullyPaid ? <span className="text-green-600 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Fully Paid
              </span> : <span className="flex items-center gap-1">
                
                {formatCurrency(remainingAmount)}
              </span>}
          </span>
          {!isFullyPaid && <Badge variant="outline" className="text-xs">
              {Math.round(progressPercentage)}%
            </Badge>}
        </div>
        
        <div className="text-xs text-muted-foreground">
          of {formatCurrency(totalAmount)} total
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={progressPercentage} className="h-1.5" />

      {/* Next milestone info */}
      {nextMilestone && !isFullyPaid && <div className="p-2 bg-muted/50 rounded-sm">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Next Payment</span>
          </div>
          <div className="text-xs space-y-0.5">
            <div className="font-medium">{nextMilestone.milestone_name}</div>
            <div className="text-muted-foreground">
              {formatCurrency(nextMilestone.amount)}
              {nextMilestone.due_date && <span className="ml-2">
                  • Due {new Date(nextMilestone.due_date).toLocaleDateString('id-ID', {
              month: 'short',
              day: 'numeric'
            })}
                </span>}
            </div>
          </div>
        </div>}

      {/* Milestone completion status */}
      

      {/* Completion badge */}
      {isFullyPaid && <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
          Payment Complete
        </Badge>}
    </div>;
};
