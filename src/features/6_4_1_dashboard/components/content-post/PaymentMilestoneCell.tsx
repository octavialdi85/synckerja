import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { Card, CardContent } from '@/features/ui/card';
import { CheckCircle, Clock, DollarSign, Calendar } from 'lucide-react';
import { PaymentMilestone } from '@/hooks/organized/utils';
import { useMilestoneSync } from '@/hooks/organized/utils';

interface PaymentMilestoneCellProps {
  milestones: PaymentMilestone[];
  isCompact?: boolean;
}

export const PaymentMilestoneCell = ({ milestones, isCompact = true }: PaymentMilestoneCellProps) => {
  const { markMilestoneAsPaid } = useMilestoneSync();

  console.log('🎯 PaymentMilestoneCell - Rendering milestones:', milestones);

  if (!milestones || milestones.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No milestones
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: PaymentMilestone['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const totalCount = milestones.length;

  if (isCompact) {
    return (
      <div className="space-y-2 min-w-[140px]">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {completedCount}/{totalCount} Completed
          </span>
          <Badge variant="outline" className="text-xs">
            {Math.round((completedCount / totalCount) * 100)}%
          </Badge>
        </div>
        
        {/* Milestone list */}
        <div className="space-y-1">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                {milestone.status === 'completed' ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <Clock className="h-3 w-3 text-yellow-600" />
                )}
                <span className="truncate max-w-[80px]">{milestone.milestone_name}</span>
              </div>
              <span className="text-muted-foreground">
                {formatCurrency(milestone.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Detailed view
  return (
    <div className="space-y-3">
      {milestones.map((milestone) => (
        <Card key={milestone.id} className="border-l-4 border-l-primary/20">
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-sm">{milestone.milestone_name}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <DollarSign className="h-3 w-3" />
                  <span>{formatCurrency(milestone.amount)}</span>
                  {milestone.due_date && (
                    <>
                      <Calendar className="h-3 w-3 ml-2" />
                      <span>Due: {new Date(milestone.due_date).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge className={getStatusColor(milestone.status)}>
                {milestone.status.replace('_', ' ')}
              </Badge>
            </div>

            {milestone.status !== 'completed' && (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markMilestoneAsPaid(milestone.id)}
                  className="text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Upload Receipt & Mark Paid
                </Button>
              </div>
            )}

            {milestone.paid_at && (
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                Paid on: {new Date(milestone.paid_at).toLocaleDateString()}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
