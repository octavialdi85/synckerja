
import { useState, useEffect } from 'react';
import { Package, DollarSign, TrendingUp, Archive } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export const ProductManagerMetricsCards = () => {
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    totalValue: 0,
    activeProducts: 0,
    activeValue: 0,
    highValueItems: 0,
    highValueAmount: 0,
    draftProducts: 0,
    draftValue: 0
  });
  const [loading, setLoading] = useState(true);
  const { organizationId } = useCurrentOrg();

  useEffect(() => {
    fetchMetrics();
  }, [organizationId]);

  const fetchMetrics = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('price, status')
        .eq('organization_id', organizationId);

      if (error) {
        return;
      }

      const total = products?.length || 0;
      const totalValue = products?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;
      
      const active = products?.filter(p => p.status === 'active') || [];
      const activeValue = active.reduce((sum, p) => sum + (p.price || 0), 0);
      
      const highValue = products?.filter(p => (p.price || 0) > 10000000) || [];
      const highValueAmount = highValue.reduce((sum, p) => sum + (p.price || 0), 0);
      
      const draft = products?.filter(p => p.status === 'draft') || [];
      const draftValue = draft.reduce((sum, p) => sum + (p.price || 0), 0);

      setMetrics({
        totalProducts: total,
        totalValue,
        activeProducts: active.length,
        activeValue,
        highValueItems: highValue.length,
        highValueAmount,
        draftProducts: draft.length,
        draftValue
      });
    } catch {
      // Fetch failed
    } finally {
      setLoading(false);
    }
  };

  const metricsDisplay = [
    {
      title: 'Total Products',
      count: metrics.totalProducts,
      amount: metrics.totalValue,
      icon: Package,
      accentColor: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Active Products',
      count: metrics.activeProducts,
      amount: metrics.activeValue,
      icon: TrendingUp,
      accentColor: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'High Value Items',
      count: metrics.highValueItems,
      amount: metrics.highValueAmount,
      icon: DollarSign,
      accentColor: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      title: 'Draft Products',
      count: metrics.draftProducts,
      amount: metrics.draftValue,
      icon: Archive,
      accentColor: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    }
  ];

  const formatToRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <>
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/50 p-2 shadow-sm">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded mb-2"></div>
              <div className="h-6 bg-slate-200 rounded mb-1"></div>
              <div className="h-3 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {metricsDisplay.map((metric, index) => {
        const Icon = metric.icon;
        
        return (
          <div key={index} className="bg-white rounded-md border border-gray-200/50 p-2.5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-500 mb-0.5">{metric.title}</div>
                <div className="text-xl font-bold text-gray-900">{metric.count}</div>
                <div className="text-xs text-gray-500">
                  {formatToRupiah(metric.amount)}
                </div>
              </div>
              <div className={`p-1.5 rounded-md ${metric.bgColor} ml-2`}>
                <Icon className={`h-3.5 w-3.5 ${metric.textColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
