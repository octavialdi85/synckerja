import React, { useState } from 'react';
import { MoreVertical, Download, RefreshCw, Shield, Wifi } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { toast } from 'sonner';
import { useContentPillarData } from '../../hook/useContentPillarData';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useOptimizedSocialMedia } from '../../hook/useOptimizedSocialMediaState';

const FUNNEL_CONFIG = {
  top: {
    label: "TOP FUNNEL",
    name: "Awareness",
    color: "#10B981",
    bgColor: "#ECFDF5",
    emoji: "🟢"
  },
  middle: {
    label: "MIDDLE FUNNEL",
    name: "Consideration",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    emoji: "🟡"
  },
  bottom: {
    label: "BOTTOM FUNNEL",
    name: "Conversion",
    color: "#EF4444",
    bgColor: "#FEF2F2",
    emoji: "🔴"
  }
};

export const ContentPillarTracker: React.FC = () => {
  const [selectedFunnel, setSelectedFunnel] = useState<'top' | 'middle' | 'bottom'>('top');
  const {
    organizationId
  } = useCurrentOrg();
  const queryClient = useQueryClient();
  const {
    data: pillarData = [],
    isLoading,
    error,
    refetch
  } = useContentPillarData();
  const {
    contentPlans
  } = useOptimizedSocialMedia();

  const handleManualRefresh = async () => {
    // Invalidate both content pillar data and social media plans to ensure sync
    await queryClient.invalidateQueries({
      queryKey: ['contentPillarData', organizationId]
    });
    await queryClient.invalidateQueries({
      queryKey: ['contentPlans', organizationId]
    });
    refetch();
    toast.success('Data refreshed');
  };

  const exportToCSV = () => {
    const csvContent = [['Pillar Name', 'Count', 'Funnel', 'Type'].join(','), ...pillarData.map(p => [`"${p.pillar_name}"`, p.count, p.funnel, p.isDefault ? 'Default' : 'Custom'].join(','))].join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-pillar-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Content pillar data exported successfully');
  };

  // Calculate funnel percentages based on current month's content
  const calculateFunnelPercentages = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Filter content plans for current month
    const currentMonthContent = contentPlans.filter(plan => {
      if (!plan.post_date) return false;
      const planDate = new Date(plan.post_date);
      return planDate.getFullYear() === currentYear && planDate.getMonth() === currentMonth;
    });
    const totalContent = currentMonthContent.length;
    if (totalContent === 0) {
      return {
        total: 0,
        top: {
          count: 0,
          percentage: 0
        },
        middle: {
          count: 0,
          percentage: 0
        },
        bottom: {
          count: 0,
          percentage: 0
        }
      };
    }

    // Count content by funnel stage
    const funnelCounts = {
      top: 0,
      middle: 0,
      bottom: 0
    };
    currentMonthContent.forEach(plan => {
      if (plan.content_pillar_id) {
        const pillar = pillarData.find(p => p.pillar_id === plan.content_pillar_id);
        if (pillar) {
          funnelCounts[pillar.funnel]++;
        }
      }
    });
    return {
      total: totalContent,
      top: {
        count: funnelCounts.top,
        percentage: Math.round(funnelCounts.top / totalContent * 100)
      },
      middle: {
        count: funnelCounts.middle,
        percentage: Math.round(funnelCounts.middle / totalContent * 100)
      },
      bottom: {
        count: funnelCounts.bottom,
        percentage: Math.round(funnelCounts.bottom / totalContent * 100)
      }
    };
  };

  const funnelStats = calculateFunnelPercentages();

  if (isLoading) {
    return <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Content Pillar Tracker</h3>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded"></div>)}
          </div>
        </div>
      </div>;
  }

  if (error) {
    return <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Content Pillar Tracker</h3>
          <p className="text-sm text-red-600">Error loading data</p>
        </div>
        <div className="p-4">
          <Button variant="outline" size="sm" onClick={handleManualRefresh} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      </div>;
  }

  // Filter data by selected funnel
  const filteredPillars = pillarData.filter(pillar => pillar.funnel === selectedFunnel);
  const selectedConfig = FUNNEL_CONFIG[selectedFunnel];

  // Count pillars by funnel for tabs
  const topCount = pillarData.filter(p => p.funnel === 'top').length;
  const middleCount = pillarData.filter(p => p.funnel === 'middle').length;
  const bottomCount = pillarData.filter(p => p.funnel === 'bottom').length;

  return <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col max-h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Content Pillar Tracker</h3>
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <Wifi className="h-3 w-3" />
              Live
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            Current Month Distribution ({new Date().toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            })}) - Total: {funnelStats.total} content
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleManualRefresh} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToCSV} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Funnel Tabs - Fixed layout to prevent overlap */}
      <div className="p-2 border-b border-gray-100 flex-shrink-0">
        <div className="grid grid-cols-3 gap-1">
          <button type="button" onClick={() => setSelectedFunnel('top')} className={`flex flex-col items-center py-2 px-1 rounded text-xs font-medium transition-colors ${selectedFunnel === 'top' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
            <div className="text-sm font-semibold text-green-600 mb-1">
              {funnelStats.top.percentage}% ({funnelStats.top.count})
            </div>
            <span className="text-center leading-tight">Awareness</span>
          </button>
          
          <button type="button" onClick={() => setSelectedFunnel('middle')} className={`flex flex-col items-center py-2 px-1 rounded text-xs font-medium transition-colors ${selectedFunnel === 'middle' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
            <div className="text-sm font-semibold text-yellow-600 mb-1">
              {funnelStats.middle.percentage}% ({funnelStats.middle.count})
            </div>
            <span className="text-center leading-tight">Consideration</span>
          </button>
          
          <button type="button" onClick={() => setSelectedFunnel('bottom')} className={`flex flex-col items-center py-2 px-1 rounded text-xs font-medium transition-colors ${selectedFunnel === 'bottom' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
            <div className="text-sm font-semibold text-red-600 mb-1">
              {funnelStats.bottom.percentage}% ({funnelStats.bottom.count})
            </div>
            <span className="text-center leading-tight">Conversion</span>
          </button>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto seamless-scroll px-2 pb-2 min-h-0">
        {/* Current Funnel Label */}
        <div className="px-3 py-2 rounded-lg text-sm font-medium mb-3 mt-3 sticky top-0 bg-white z-10" style={{
        backgroundColor: selectedConfig.bgColor,
        color: selectedConfig.color
      }}>
          {selectedConfig.label} - {selectedConfig.name}
          <span className="ml-2 text-gray-600">{filteredPillars.length} pillars</span>
        </div>

        {/* Pillar List */}
        <div className="space-y-3">
          {filteredPillars.length === 0 ? <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No pillars found for {selectedConfig.name}</p>
            </div> : filteredPillars.map(pillar => <div key={pillar.pillar_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium text-gray-900">
                      {pillar.pillar_name}
                    </span>
                    {pillar.isDefault && <div className="flex items-center">
                        <Shield className="h-3 w-3 text-blue-500" />
                        <span className="text-xs text-blue-600 ml-1">Default</span>
                      </div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {pillar.count}
                    </span>
                    <span>{selectedConfig.emoji}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-300 rounded-full" style={{
              width: `${Math.min(pillar.count / 10 * 100, 100)}%`,
              backgroundColor: selectedConfig.color
            }} />
                </div>
              </div>)}
        </div>
      </div>

    </div>;
};