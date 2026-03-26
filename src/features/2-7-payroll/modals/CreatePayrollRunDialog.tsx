import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/organized/utils';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { useQueryClient, useQuery } from '@tanstack/react-query';

interface CreatePayrollRunDialogProps {
  children?: React.ReactNode;
}

interface PayrollPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export const CreatePayrollRunDialog = ({ children }: CreatePayrollRunDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    run_name: '',
    payroll_period_id: '',
    run_date: new Date().toISOString().split('T')[0],
    calculation_method: 'automatic',
    notes: ''
  });

  // Fetch available payroll periods
  const { data: payrollPeriods } = useQuery({
    queryKey: ['payroll-periods-for-run', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['draft', 'approved'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PayrollPeriod[];
    },
    enabled: !!organizationId && open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Organization not found",
        variant: "destructive",
      });
      return;
    }

    if (!formData.payroll_period_id) {
      toast({
        title: "Error",
        description: "Please select a payroll period",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Try to get existing tax configuration from employee payroll info first
      let taxConfigId = null;
      
      const { data: existingTaxConfig } = await supabase
        .from('employee_payroll_info')
        .select('tax_configuration_id')
        .eq('organization_id', organizationId)
        .not('tax_configuration_id', 'is', null)
        .limit(1)
        .single();

      if (existingTaxConfig?.tax_configuration_id) {
        taxConfigId = existingTaxConfig.tax_configuration_id;
      } else {
        // If no existing tax config found, try to get or create default
        const { data: defaultTaxConfig } = await supabase
          .from('tax_configurations')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_default', true)
          .maybeSingle();

        if (defaultTaxConfig) {
          taxConfigId = defaultTaxConfig.id;
        } else {
          // Create default tax configuration using the database function
          const { data: newTaxConfig, error: createError } = await supabase
            .rpc('create_default_tax_configuration', { org_id: organizationId });
          
          if (createError) {
            console.error('Error creating default tax configuration:', createError);
            throw new Error('Failed to create default tax configuration');
          }
          
          taxConfigId = newTaxConfig;
        }
      }

      const { data: newPayrollRun, error } = await supabase
        .from('payroll_runs')
        .insert([{
          ...formData,
          organization_id: organizationId,
          status: 'draft',
          tax_configuration_id: taxConfigId
        }])
        .select()
        .single();

      if (error) throw error;

      // Calculate totals for the new payroll run
      if (newPayrollRun) {
        const { error: calcError } = await supabase.rpc('calculate_payroll_run_totals', {
          run_id: newPayrollRun.id
        });
        
        if (calcError) {
          console.error('Error calculating payroll totals:', calcError);
          // Don't throw error here as the payroll run is already created
        }
      }

      toast({
        title: "Success",
        description: "Payroll run created successfully",
      });

      // Reset form
      setFormData({
        run_name: '',
        payroll_period_id: '',
        run_date: new Date().toISOString().split('T')[0],
        calculation_method: 'automatic',
        notes: ''
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['payroll-runs-overview', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs', organizationId] });
      
      setOpen(false);
    } catch (error: any) {
      console.error('Error creating payroll run:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create payroll run",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Payroll Run
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Payroll Run</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="run_name">Run Name</Label>
            <Input
              id="run_name"
              value={formData.run_name}
              onChange={(e) => handleInputChange('run_name', e.target.value)}
              placeholder="e.g., Regular Payroll January 2024"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payroll_period_id">Payroll Period</Label>
            <Select
              value={formData.payroll_period_id}
              onValueChange={(value) => handleInputChange('payroll_period_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a payroll period" />
              </SelectTrigger>
              <SelectContent>
                {payrollPeriods?.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.period_name} ({new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="run_date">Run Date</Label>
              <Input
                id="run_date"
                type="date"
                value={formData.run_date}
                onChange={(e) => handleInputChange('run_date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calculation_method">Calculation Method</Label>
              <Select
                value={formData.calculation_method}
                onValueChange={(value) => handleInputChange('calculation_method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about this payroll run..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Payroll Run'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
