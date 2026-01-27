import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Calendar, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { PaymentMilestone } from '@/hooks/organized/utils';
import { format } from 'date-fns';

interface MilestoneCardProps {
  milestone: PaymentMilestone;
  onUpdateStatus: (id: string, status: PaymentMilestone['status']) => void;
  onLinkToPost?: (milestoneId: string) => void;
  isUpdating?: boolean;
}

export const MilestoneCard = ({ 
  milestone, 
  onUpdateStatus, 
  onLinkToPost,
  isUpdating = false 
}: MilestoneCardProps) => {
  const getStatusColor = (status: PaymentMilestone['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusLabel = (status: PaymentMilestone['status']) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'overdue': return 'Overdue';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const isOverdue = milestone.due_date && 
    new Date(milestone.due_date) < new Date() && 
    milestone.status !== 'completed';

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${isOverdue ? 'border-red-300' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            {milestone.milestone_name}
          </CardTitle>
          <Badge className={getStatusColor(isOverdue ? 'overdue' : milestone.status)}>
            {getStatusLabel(isOverdue ? 'overdue' : milestone.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium text-foreground">{formatCurrency(milestone.amount)}</span>
          </div>
          
          {milestone.percentage && (
            <div className="text-xs">
              ({milestone.percentage}%)
            </div>
          )}
        </div>

        {milestone.due_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Due: {format(new Date(milestone.due_date), 'MMM dd, yyyy')}</span>
          </div>
        )}

        {milestone.milestone_description && (
          <p className="text-sm text-muted-foreground">
            {milestone.milestone_description}
          </p>
        )}

        {milestone.trigger_condition && (
          <div className="text-xs bg-muted p-2 rounded">
            <strong>Trigger:</strong> {milestone.trigger_condition.replace('_', ' ')}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {milestone.status === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(milestone.id, 'in_progress')}
              disabled={isUpdating}
            >
              <Clock className="h-3 w-3 mr-1" />
              Start
            </Button>
          )}
          
          {milestone.status === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(milestone.id, 'completed')}
              disabled={isUpdating}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Mark Paid
            </Button>
          )}

          {onLinkToPost && milestone.status !== 'completed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onLinkToPost(milestone.id)}
              disabled={isUpdating}
            >
              Link to Post
            </Button>
          )}
        </div>

        {milestone.paid_at && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Paid on: {format(new Date(milestone.paid_at), 'MMM dd, yyyy HH:mm')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
