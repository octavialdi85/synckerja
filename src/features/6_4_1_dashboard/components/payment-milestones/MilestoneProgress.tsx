import { Progress } from '@/features/ui/progress';
import { Badge } from '@/features/ui/badge';
import { PaymentMilestone } from '@/hooks/organized/utils';

interface MilestoneProgressProps {
  milestones: PaymentMilestone[];
  className?: string;
}

export const MilestoneProgress = ({ milestones, className }: MilestoneProgressProps) => {
  if (!milestones || milestones.length === 0) {
    return (
      <div className={`bg-muted/50 rounded-lg p-4 text-center ${className}`}>
        <p className="text-sm text-muted-foreground">No milestones defined</p>
      </div>
    );
  }

  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const totalMilestones = milestones.length;
  const progressPercentage = (completedMilestones / totalMilestones) * 100;

  const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
  const paidAmount = milestones
    .filter(m => m.status === 'completed')
    .reduce((sum, m) => sum + m.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const overdueCount = milestones.filter(m => 
    m.due_date && 
    new Date(m.due_date) < new Date() && 
    m.status !== 'completed'
  ).length;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Payment Progress</p>
          <p className="text-xs text-muted-foreground">
            {completedMilestones} of {totalMilestones} milestones completed
          </p>
        </div>
        
        <div className="text-right space-y-1">
          <p className="text-sm font-medium">{formatCurrency(paidAmount)}</p>
          <p className="text-xs text-muted-foreground">
            of {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      <Progress value={progressPercentage} className="h-2" />

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">
          {Math.round(progressPercentage)}% Complete
        </Badge>
        
        {overdueCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {overdueCount} Overdue
          </Badge>
        )}
        
        {completedMilestones === totalMilestones && totalMilestones > 0 && (
          <Badge className="bg-green-100 text-green-800 text-xs">
            All Paid
          </Badge>
        )}
      </div>
    </div>
  );
};
