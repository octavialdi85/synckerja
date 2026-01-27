import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { MilestoneProgress } from './MilestoneProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { Clock, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react';

interface MilestoneSummaryData {
  total_milestones: number;
  pending_milestones: number;
  completed_milestones: number;
  overdue_milestones: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
}

export const PaymentMilestonesSummary = () => {
  const { organizationId } = useCurrentOrg();

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['payment-milestones-summary', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      // Get all milestones for the organization through payment terms
      const { data: milestones, error } = await supabase
        .from('payment_milestones')
        .select(`
          *,
          kol_payment_terms!inner(organization_id)
        `)
        .eq('kol_payment_terms.organization_id', organizationId);

      if (error) throw error;

      const now = new Date();
      const summary: MilestoneSummaryData = {
        total_milestones: milestones.length,
        pending_milestones: milestones.filter(m => m.status === 'pending' || m.status === 'in_progress').length,
        completed_milestones: milestones.filter(m => m.status === 'completed').length,
        overdue_milestones: milestones.filter(m => 
          m.due_date && 
          new Date(m.due_date) < now && 
          m.status !== 'completed'
        ).length,
        total_amount: milestones.reduce((sum, m) => sum + m.amount, 0),
        paid_amount: milestones
          .filter(m => m.status === 'completed')
          .reduce((sum, m) => sum + m.amount, 0),
        pending_amount: milestones
          .filter(m => m.status !== 'completed')
          .reduce((sum, m) => sum + m.amount, 0)
      };

      return summary;
    },
    enabled: !!organizationId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-6 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No milestone data available</p>
      </div>
    );
  }

  const progressPercentage = summaryData.total_milestones > 0 
    ? (summaryData.completed_milestones / summaryData.total_milestones) * 100 
    : 0;

  return (
    <div className="space-y-3">
      {/* Milestone Status Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs font-medium text-blue-600">Pending</p>
              <p className="text-sm font-bold text-blue-700">{summaryData.pending_milestones}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs font-medium text-green-600">Completed</p>
              <p className="text-sm font-bold text-green-700">{summaryData.completed_milestones}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-xs font-medium text-red-600">Overdue</p>
              <p className="text-sm font-bold text-red-700">{summaryData.overdue_milestones}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-xs font-medium text-emerald-600">Paid</p>
              <p className="text-xs font-bold text-emerald-700">{formatCurrency(summaryData.paid_amount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-slate-700">Overall Progress</p>
          <span className="text-xs text-slate-600">{Math.round(progressPercentage)}% Complete</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Total Budget: {formatCurrency(summaryData.total_amount)}</span>
            <span>Pending: {formatCurrency(summaryData.pending_amount)}</span>
          </div>
          
          <div className="w-full bg-white rounded-full h-2 border border-slate-200">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
