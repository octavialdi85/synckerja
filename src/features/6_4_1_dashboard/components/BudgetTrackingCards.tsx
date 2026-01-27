import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Progress } from '@/features/ui/progress';
import { DollarSign, TrendingUp, Target, AlertTriangle } from 'lucide-react';
import { useKOLBudgetAllocations } from '@/hooks/organized/utils';
import { useKOLCampaigns } from '../hooks/useKOLCampaigns';

interface BudgetTrackingCardsProps {
  campaignId?: string;
}

export const BudgetTrackingCards: React.FC<BudgetTrackingCardsProps> = ({ campaignId }) => {
  const { allocations } = useKOLBudgetAllocations();
  const { campaigns } = useKOLCampaigns();
  
  // Ensure allocations is always an array
  const safeAllocations = Array.isArray(allocations) ? allocations : [];
  
  // Filter allocations by campaign if provided
  const campaignAllocations = campaignId ? 
    safeAllocations.filter(allocation => allocation.campaign_id === campaignId) : 
    safeAllocations;

  // Get total campaign budgets (company budget)
  const totalCampaignBudget = campaignId ? 
    (campaigns && Array.isArray(campaigns) ? campaigns.find(campaign => campaign.id === campaignId)?.budget || 0 : 0) :
    (campaigns && Array.isArray(campaigns) ? campaigns.reduce((sum, campaign) => sum + (campaign.budget || 0), 0) : 0);
  
  // Get total allocated budget (what's been allocated to KOLs)
  const totalAllocatedBudget = campaignAllocations.reduce((sum, allocation) => sum + allocation.allocated_budget, 0);
  
  // Get total spent (actual payouts)
  const totalSpent = campaignAllocations.reduce((sum, allocation) => sum + (allocation.actual_payout || 0), 0);
  
  // Calculate remaining budget (campaign budget - allocated budget)
  const remainingBudget = totalCampaignBudget - totalAllocatedBudget;
  
  // Calculate percentage based on campaign budget
  const allocationPercentage = totalCampaignBudget > 0 ? (totalAllocatedBudget / totalCampaignBudget) * 100 : 0;
  const spentPercentage = totalAllocatedBudget > 0 ? (totalSpent / totalAllocatedBudget) * 100 : 0;
  
  const activeAllocations = campaignAllocations.filter(allocation => (allocation.actual_payout || 0) > 0);
  const averageUtilization = activeAllocations.length > 0 ? 
    activeAllocations.reduce((sum, allocation) => {
      return sum + ((allocation.actual_payout || 0) / allocation.allocated_budget) * 100;
    }, 0) / activeAllocations.length : 0;

  const overBudgetCount = campaignAllocations.filter(allocation => 
    (allocation.actual_payout || 0) > allocation.allocated_budget
  ).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      {/* Campaign Budget */}
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-xs font-medium text-slate-600">Campaign Budget</p>
            <p className="text-sm font-bold text-slate-900">{formatCurrency(totalCampaignBudget)}</p>
          </div>
        </div>
        <div className="text-xs text-slate-500">Total available</div>
      </div>

      {/* Allocated Budget */}
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-xs font-medium text-slate-600">Allocated Budget</p>
            <p className="text-sm font-bold text-slate-900">{formatCurrency(totalAllocatedBudget)}</p>
          </div>
        </div>
        <div className="text-xs text-slate-500">{allocationPercentage.toFixed(1)}%</div>
      </div>

      {/* Remaining Budget */}
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-amber-600" />
          <div>
            <p className="text-xs font-medium text-slate-600">Remaining Budget</p>
            <p className="text-sm font-bold text-slate-900">{formatCurrency(remainingBudget)}</p>
          </div>
        </div>
        <div className="text-xs text-slate-500">Available</div>
      </div>

      {/* Budget Spent */}
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${overBudgetCount > 0 ? 'text-red-500' : 'text-purple-600'}`} />
          <div>
            <p className="text-xs font-medium text-slate-600">Budget Spent</p>
            <p className="text-sm font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
          </div>
        </div>
        <div className="text-xs text-slate-500">{spentPercentage.toFixed(1)}%</div>
      </div>
    </div>
  );
};
