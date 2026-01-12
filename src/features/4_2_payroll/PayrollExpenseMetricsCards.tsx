import { useCurrentOrg } from '@/hooks/organized/utils';
import { usePayrollCalculations } from '@/hooks/organized/payroll';
import { formatToRupiah } from '@/utils/formatCurrency';
import { DollarSign, Users, Calendar, Clock } from 'lucide-react';
import { useMemo } from 'react';

export const PayrollExpenseMetricsCards = () => {
  const { organizationId } = useCurrentOrg();
  const { calculations } = usePayrollCalculations(organizationId);
  
  const metrics = useMemo(() => {
    if (!calculations || calculations.length === 0) {
      return [
        {
          title: 'Total Payroll',
          count: 0,
          amount: 0,
          icon: DollarSign,
          accentColor: 'bg-green-500',
          bgColor: 'bg-green-50',
          textColor: 'text-green-600'
        },
        {
          title: 'Employees Paid',
          count: 0,
          amount: 0,
          icon: Users,
          accentColor: 'bg-blue-500',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-600'
        },
        {
          title: 'Avg Per Employee',
          count: 0,
          amount: 0,
          icon: Calendar,
          accentColor: 'bg-purple-500',
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-600'
        },
        {
          title: 'Pending Payments',
          count: 0,
          amount: 0,
          icon: Clock,
          accentColor: 'bg-orange-500',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-600'
        }
      ];
    }

    // Calculate real metrics from payroll calculations
    const totalEmployees = calculations.length;
    const paidEmployees = calculations.filter(calc => calc.payment_status === 'paid').length;
    const pendingEmployees = calculations.filter(calc => calc.payment_status === 'pending').length;
    
    const totalPayroll = calculations.reduce((sum, calc) => sum + (calc.take_home_pay || calc.net_pay), 0);
    const paidAmount = calculations
      .filter(calc => calc.payment_status === 'paid')
      .reduce((sum, calc) => sum + (calc.take_home_pay || calc.net_pay), 0);
    const pendingAmount = calculations
      .filter(calc => calc.payment_status === 'pending')
      .reduce((sum, calc) => sum + (calc.take_home_pay || calc.net_pay), 0);
    
    const avgSalary = totalEmployees > 0 ? totalPayroll / totalEmployees : 0;
    
    return [
      {
        title: 'Total Payroll',
        count: totalEmployees,
        amount: totalPayroll,
        icon: DollarSign,
        accentColor: 'bg-green-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-600'
      },
      {
        title: 'Employees Paid',
        count: paidEmployees,
        amount: paidAmount,
        icon: Users,
        accentColor: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600'
      },
      {
        title: 'Avg Per Employee',
        count: 1,
        amount: avgSalary,
        icon: Calendar,
        accentColor: 'bg-purple-500',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-600'
      },
      {
        title: 'Pending Payments',
        count: pendingEmployees,
        amount: pendingAmount,
        icon: Clock,
        accentColor: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-600'
      }
    ];
  }, [calculations]);

  return (
    <>
      {metrics.map((metric, index) => {
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
