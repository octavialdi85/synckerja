import React from 'react';
import { Card, CardContent } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';

interface PayrollPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export const PayrollPeriodsOverview = () => {
  const { organizationId } = useCurrentOrg();

  const { data: periods, isLoading } = useQuery({
    queryKey: ['payroll-periods-overview', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as PayrollPeriod[];
    },
    enabled: !!organizationId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-md"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {periods?.map((period) => (
        <Card key={period.id} className="p-3 hover:shadow-sm transition-shadow">
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">{period.period_name}</span>
              </div>
              <Badge className={getStatusColor(period.status)} variant="secondary">
                {period.status}
              </Badge>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {(!periods || periods.length === 0) && (
        <div className="text-center py-6 text-gray-500">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No payroll periods found</p>
        </div>
      )}
    </div>
  );
};
