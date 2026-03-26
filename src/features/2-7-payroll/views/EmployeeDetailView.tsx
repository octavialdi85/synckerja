import React from 'react';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { ArrowLeft, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { calculatePPh21, formatCurrency } from '@/features/8-4-pph-21/utils/pph21Calculator';
interface EmployeeDetailViewProps {
  selectedEmployee: any;
  onBack: () => void;
  allowanceData?: any[];
  deductionData?: any[];
  taxData?: any[];
  tardinessData?: any[];
  attendancePenalties?: any[];
}
export const EmployeeDetailView = ({
  selectedEmployee,
  onBack,
  allowanceData = [],
  deductionData = [],
  taxData = [],
  tardinessData = [],
  attendancePenalties = []
}: EmployeeDetailViewProps) => {
  if (!selectedEmployee) return null;
  const isOctaVialdi = selectedEmployee?.employee_payroll_info?.employees?.full_name?.toLowerCase().includes('octa vialdi');

  // Use actual data from payroll calculations instead of hardcoded values
  const getCalculationData = () => {
    // Get basic salary from employee data
    const basicSalary = selectedEmployee?.employee_payroll_info?.basic_salary || 0;
    
    // Calculate total allowances from allowanceData
    const totalAllowances = allowanceData?.reduce((sum, item) => sum + (item.calculated_amount || 0), 0) || selectedEmployee?.total_allowances || 0;
    
    // Calculate gross pay
    const grossPay = basicSalary + totalAllowances;
    
    // Calculate PPh21 details using current employee's PTKP status and salary
    const ptkpStatus = selectedEmployee?.employee_payroll_info?.ptkp_status || 'TK/0';
    const pph21Result = calculatePPh21({
      monthlyGross: grossPay,
      ptkpStatus: ptkpStatus,
      includeBpjsKesehatan: true,
      includeBpjsPensiun: true,
      nonTaxableAllowance: 0
    });
    
    // Calculate monthly BPJS amounts for display in deductions card (consistent with "Pengurangan Penghasilan")
    const bpjsKesehatanMonthly = pph21Result.bpjsKesehatanEmployee / 12;
    const bpjsPensiunMonthly = pph21Result.bpjsPensiunEmployee / 12;
    
    // Get tardiness penalties
    const tardinessAmount = (tardinessData.length > 0 ? tardinessData : attendancePenalties)
      .reduce((sum, item) => sum + (item.penalty_amount || 0), 0);
    
    // Calculate other deductions (excluding BPJS which we calculate separately)
    const otherDeductions = deductionData?.filter(item => 
      !item.component_name.toLowerCase().includes('bpjs')
    ).reduce((sum, item) => sum + (item.calculated_amount || 0), 0) || 0;
    
    // Total deductions for card display (monthly BPJS + other deductions + tardiness)
    // This should match what's shown in "Pengurangan Penghasilan" section but in monthly amounts
    const totalDeductionsForCard = bpjsKesehatanMonthly + bpjsPensiunMonthly + otherDeductions + tardinessAmount;
    
    // Calculate tax from taxData
    const totalTax = taxData?.reduce((sum, item) => sum + (item.calculated_amount || 0), 0) || 0;
    
    // Calculate net pay
    const netPay = grossPay - totalDeductionsForCard - totalTax;
    
    return {
      basicSalary,
      totalAllowances,
      grossPay,
      totalDeductions: totalDeductionsForCard,
      totalTax,
      netPay,
      pph21Result,
      ptkpStatus,
      bpjsKesehatanMonthly,
      bpjsPensiunMonthly,
      otherDeductions,
      tardinessAmount
    };
  };
  const calculationData = getCalculationData();
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'calculated':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  return <div className="h-full bg-white overflow-auto">
      {/* Header */}
      <div className="border-b bg-gray-50/50 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">
              {selectedEmployee.employee_payroll_info?.employees?.full_name}
            </h2>
            <p className="text-sm text-gray-500">
              {selectedEmployee.employee_payroll_info?.employees?.employee_id}
            </p>
          </div>
          {isOctaVialdi}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(selectedEmployee.calculation_status)}>
            {selectedEmployee.calculation_status}
          </Badge>
          <Badge className={getPaymentStatusColor(selectedEmployee.payment_status)}>
            {selectedEmployee.payment_status}
          </Badge>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Period Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Periode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Periode Payroll</label>
                <p className="text-sm font-semibold">
                  {selectedEmployee.payroll_runs?.payroll_periods?.period_name || '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tanggal Pembayaran</label>
                <p className="text-sm font-semibold">
                  {selectedEmployee.payroll_runs?.payroll_periods?.pay_date ? new Date(selectedEmployee.payroll_runs.payroll_periods.pay_date).toLocaleDateString('id-ID') : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tanggal Perhitungan</label>
                <p className="text-sm font-semibold">
                  {new Date(selectedEmployee.calculation_date).toLocaleDateString('id-ID')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Departemen</label>
                <p className="text-sm font-semibold">
                  {selectedEmployee.employee_payroll_info?.employees?.departments?.name || 'No Department'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculation Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Basic Salary */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600 mb-1">Gaji Pokok</div>
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(calculationData.basicSalary)}
              </div>
            </CardContent>
          </Card>

          {/* Allowances */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600 mb-1">Tunjangan</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(calculationData.totalAllowances)}
              </div>
              {allowanceData.length > 0 && <div className="mt-2 space-y-1">
                  {allowanceData.map((item, index) => <div key={index} className="text-xs text-gray-600 flex justify-between">
                      <span>{item.component_name}</span>
                      <span>{formatCurrency(item.calculated_amount)}</span>
                    </div>)}
                </div>}
            </CardContent>
          </Card>

          {/* Deductions */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
                Potongan
                {isOctaVialdi}
              </div>
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(calculationData.totalDeductions)}
              </div>
              <div className="mt-2 space-y-1">
                {/* Show BPJS amounts (monthly values to be consistent with Pengurangan Penghasilan section) */}
                <div className="text-xs text-gray-600 flex justify-between">
                  <span>BPJS Kesehatan (Bulanan)</span>
                  <span>{formatCurrency(calculationData.bpjsKesehatanMonthly)}</span>
                </div>
                <div className="text-xs text-gray-600 flex justify-between">
                  <span>BPJS Pensiun (Bulanan)</span>
                  <span>{formatCurrency(calculationData.bpjsPensiunMonthly)}</span>
                </div>

                {/* Show other deductions */}
                {deductionData.filter(item => !item.component_name.toLowerCase().includes('bpjs')).map((item, index) => (
                  <div key={index} className="text-xs text-gray-600 flex justify-between">
                    <span>{item.component_name}</span>
                    <span>{formatCurrency(item.calculated_amount)}</span>
                  </div>
                ))}

                {/* Tardiness penalties - remove duplicates and show only one entry */}
                {(tardinessData.length > 0 ? tardinessData : attendancePenalties)
                  .filter((item, index, array) => {
                    // Remove duplicates based on penalty amount and date
                    const currentKey = `${item.penalty_amount}_${item.applied_date}`;
                    const firstOccurrenceIndex = array.findIndex(p => 
                      `${p.penalty_amount}_${p.applied_date}` === currentKey
                    );
                    return index === firstOccurrenceIndex;
                  })
                  .map((item, index) => {
                    const minutes = item.violation_details?.late_minutes || 0;
                    const displayDate = item.display_date || (item.applied_date ? new Date(item.applied_date).toLocaleDateString('id-ID') : 'No Date');
                    return (
                      <div key={index} className="text-xs text-gray-600 flex justify-between">
                        <span>Keterlambatan - {displayDate} ({minutes} menit)</span>
                        <span>{formatCurrency(item.penalty_amount)}</span>
                      </div>
                    );
                  })
                }
              </div>
            </CardContent>
          </Card>

          {/* Net Pay */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
                Take-Home Pay
                {isOctaVialdi}
              </div>
              <div className="text-xl font-bold text-indigo-600">
                {formatCurrency(calculationData.netPay)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tax Details */}
        {(taxData.length > 0 || calculationData.pph21Result) && <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Detail Pajak PPh 21
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">PPh 21 Bulanan</span>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(calculationData.pph21Result.monthlyTax || taxData.reduce((sum, item) => sum + item.calculated_amount, 0))}
                  </span>
                </div>
                
                {calculationData.pph21Result && <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-orange-700 mb-3">Rincian Perhitungan Lengkap:</div>
                    
                    {/* Penghasilan Bruto */}
                    <div className="bg-white p-3 rounded border mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-2">📊 Penghasilan Bruto</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Gaji Pokok/Bulan:</span>
                          <span>{formatCurrency(calculationData.basicSalary)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Tunjangan/Bulan:</span>
                          <span>{formatCurrency(calculationData.totalAllowances)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-medium">
                          <span>Gaji Bruto/Bulan:</span>
                          <span>{formatCurrency(calculationData.grossPay)}</span>
                        </div>
                        <div className="flex justify-between text-blue-600 font-medium">
                          <span>Gaji Bruto Tahunan:</span>
                          <span>{formatCurrency(calculationData.pph21Result.annualGross)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pengurang Penghasilan */}
                    <div className="bg-white p-3 rounded border mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-2">➖ Pengurang Penghasilan</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Biaya Jabatan (5%, maks 6jt):</span>
                          <span>-{formatCurrency(calculationData.pph21Result.professionalAllowance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>BPJS Kesehatan (Tahunan):</span>
                          <span>-{formatCurrency(calculationData.pph21Result.bpjsKesehatanEmployee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>BPJS Pensiun (Tahunan):</span>
                          <span>-{formatCurrency(calculationData.pph21Result.bpjsPensiunEmployee)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-medium text-green-700">
                          <span>Penghasilan Neto/Bulan:</span>
                          <span>{formatCurrency(calculationData.pph21Result.netIncomeBeforeTax / 12)}</span>
                        </div>
                      </div>
                    </div>

                    {/* PTKP */}
                    <div className="bg-white p-3 rounded border mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-2">👥 Penghasilan Tidak Kena Pajak (PTKP)</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Status PTKP:</span>
                          <span className="font-medium">{calculationData.ptkpStatus}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Nilai PTKP:</span>
                          <span>-{formatCurrency(calculationData.pph21Result.ptkpAmount)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-medium text-orange-600">
                          <span>PKP (Penghasilan Kena Pajak):</span>
                          <span>{formatCurrency(calculationData.pph21Result.pkpAmount)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tarif Progresif */}
                    {calculationData.pph21Result.taxBreakdown.length > 0 && <div className="bg-white p-3 rounded border">
                        <div className="text-xs font-medium text-gray-700 mb-2">📈 Tarif Progresif PPh 21</div>
                        <div className="space-y-2">
                          {calculationData.pph21Result.taxBreakdown.map((bracket, index) => (
                            <div key={index} className="border border-gray-200 p-2 rounded">
                              <div className="flex justify-between text-sm font-medium">
                                <span>Bracket {index + 1}: {bracket.rate}%</span>
                                <span className="text-orange-600">{formatCurrency(bracket.tax)}</span>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                <div>Range: {bracket.bracket}</div>
                                <div>PKP dalam bracket: {formatCurrency(bracket.amount)}</div>
                              </div>
                            </div>
                          ))}
                          <div className="border-t-2 border-orange-300 pt-2 mt-2">
                            <div className="flex justify-between font-bold text-orange-700">
                              <span>Total PPh 21 Tahunan:</span>
                              <span>{formatCurrency(calculationData.pph21Result.annualTax)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-orange-800 text-lg">
                              <span>PPh 21 Bulanan:</span>
                              <span>{formatCurrency(calculationData.pph21Result.monthlyTax)}</span>
                            </div>
                          </div>
                        </div>
                      </div>}
                  </div>}
              </div>
            </CardContent>
          </Card>}


        {/* Notes */}
        {selectedEmployee.notes && <Card>
            <CardHeader>
              <CardTitle>Catatan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{selectedEmployee.notes}</p>
            </CardContent>
          </Card>}
      </div>
    </div>;
};
