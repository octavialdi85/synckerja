import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { RadioGroup, RadioGroupItem } from '@/features/ui/radio-group';
import { Checkbox } from '@/features/ui/checkbox';
import { Separator } from '@/features/ui/separator';
import { Calculator, Download, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import {
  BPJS_KESEHATAN_MAX_SALARY,
  BPJS_PENSIUN_MAX_SALARY,
  PTKP_RATES,
  calculatePPh21,
  formatCurrency,
  parseCurrency,
} from '../utils/pph21Calculator';

interface CalculationResult {
  annualGross: number;
  professionalAllowance: number;
  bpjsKesehatan: number;
  bpjsPensiun: number;
  bpjsKesehatanCompany: number;
  bpjsPensiunCompany: number;
  netIncome: number;
  ptkp: number;
  pkp: number;
  annualTax: number;
  monthlyTax: number;
  takeHomePay: number;
  totalCompanyCost: number;
  taxBreakdown: Array<{
    bracket: string;
    amount: number;
    tax: number;
    rate: number;
  }>;
}

export const PPh21Calculator = () => {
  const [mode, setMode] = useState<'gross-to-net' | 'net-to-gross'>('gross-to-net');
  const [salary, setSalary] = useState<string>('12500000');
  const [ptkpStatus, setPtkpStatus] = useState<string>('TK/0');
  const [customPtkp, setCustomPtkp] = useState<string>('');
  const [bpjsKesehatan, setBpjsKesehatan] = useState(true);
  const [bpjsPensiun, setBpjsPensiun] = useState(true);
  const [nonTaxableAllowance, setNonTaxableAllowance] = useState<string>('0');
  const [salaryIncrease, setSalaryIncrease] = useState<string>('10');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [increaseResult, setIncreaseResult] = useState<CalculationResult | null>(null);

  const calculateTax = useCallback((grossSalary: number): CalculationResult => {
    const calc = calculatePPh21({
      monthlyGross: grossSalary,
      ptkpStatus: ptkpStatus === 'custom' ? undefined : ptkpStatus,
      customPtkpAmount: ptkpStatus === 'custom' ? parseCurrency(customPtkp) : undefined,
      includeBpjsKesehatan: bpjsKesehatan,
      includeBpjsPensiun: bpjsPensiun,
      nonTaxableAllowance: parseCurrency(nonTaxableAllowance),
    });

    return {
      annualGross: calc.annualGross,
      professionalAllowance: calc.professionalAllowance,
      bpjsKesehatan: calc.bpjsKesehatan,
      bpjsPensiun: calc.bpjsPensiun,
      bpjsKesehatanCompany: calc.bpjsKesehatanCompany,
      bpjsPensiunCompany: calc.bpjsPensiunCompany,
      netIncome: calc.netIncome,
      ptkp: calc.ptkp,
      pkp: calc.pkp,
      annualTax: calc.annualTax,
      monthlyTax: calc.monthlyTax,
      takeHomePay: calc.takeHomePay,
      totalCompanyCost: calc.totalCompanyCost,
      taxBreakdown: calc.taxBreakdown,
    };
  }, [ptkpStatus, customPtkp, bpjsKesehatan, bpjsPensiun, nonTaxableAllowance]);

  // Reverse calculation: from take-home pay to gross salary using Newton-Raphson method
  const calculateGrossFromTakeHome = (targetTakeHome: number): number => {
    let grossEstimate = targetTakeHome * 1.2; // Initial estimate
    const tolerance = 10; // Tolerance in Rupiah
    const maxIterations = 50;
    
    for (let i = 0; i < maxIterations; i++) {
      const result = calculateTax(grossEstimate);
      const currentTakeHome = result.takeHomePay;
      const error = currentTakeHome - targetTakeHome;
      
      if (Math.abs(error) < tolerance) {
        return grossEstimate;
      }
      
      // Calculate derivative (small change in gross vs change in take-home)
      const delta = grossEstimate * 0.001; // 0.1% change
      const resultDelta = calculateTax(grossEstimate + delta);
      const takeHomeDelta = resultDelta.takeHomePay;
      const derivative = (takeHomeDelta - currentTakeHome) / delta;
      
      // Newton-Raphson update
      if (Math.abs(derivative) > 0.001) {
        grossEstimate = grossEstimate - error / derivative;
      } else {
        // Fallback to binary search if derivative is too small
        if (error > 0) {
          grossEstimate *= 0.95;
        } else {
          grossEstimate *= 1.05;
        }
      }
      
      // Ensure grossEstimate stays positive
      grossEstimate = Math.max(grossEstimate, targetTakeHome * 0.5);
    }
    
    return grossEstimate;
  };

  const handleCalculate = () => {
    const inputAmount = parseCurrency(salary);
    if (inputAmount <= 0) {
      toast.error('Mohon masukkan nilai yang valid');
      return;
    }

    if (ptkpStatus === 'custom' && parseCurrency(customPtkp) <= 0) {
      toast.error('Mohon masukkan PTKP custom yang valid');
      return;
    }

    let grossSalary: number;
    
    if (mode === 'net-to-gross') {
      // Reverse calculation: find gross salary from target take-home pay
      grossSalary = calculateGrossFromTakeHome(inputAmount);
    } else {
      // Direct calculation: gross salary is the input
      grossSalary = inputAmount;
    }

    const calculation = calculateTax(grossSalary);
    setResult(calculation);

    // Calculate with salary increase
    const increaseAmount = parseFloat(salaryIncrease) || 0;
    if (increaseAmount > 0) {
      const increasedSalary = grossSalary * (1 + increaseAmount / 100);
      const increaseCalculation = calculateTax(increasedSalary);
      setIncreaseResult(increaseCalculation);
    } else {
      setIncreaseResult(null);
    }

    toast.success('Perhitungan berhasil!');
  };

  const exportToPDF = () => {
    toast.info('Fitur export PDF akan segera tersedia');
  };

  const exportToExcel = () => {
    toast.info('Fitur export Excel akan segera tersedia');
  };

  return (
    <div className="max-w-6xl mx-auto p-2 space-y-2">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">Kalkulator PPh 21 Indonesia</h1>
        <p className="text-muted-foreground text-sm">Hitung pajak penghasilan berdasarkan UU PPh Pasal 17 dan PER-16/PJ/2016</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Input Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-5 w-5" />
              Parameter Perhitungan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Mode Selection */}
            <div>
              <Label className="text-base font-semibold">1. Pilih Mode Perhitungan</Label>
              <RadioGroup value={mode} onValueChange={(value) => setMode(value as any)} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gross-to-net" id="gross-to-net" />
                  <Label htmlFor="gross-to-net">Gaji Bruto → Take-Home Pay</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="net-to-gross" id="net-to-gross" />
                  <Label htmlFor="net-to-gross">Take-Home Pay → Gaji Bruto</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Salary Input */}
            <div>
              <Label className="text-base font-semibold">
                2. {mode === 'gross-to-net' ? 'Gaji Bruto per Bulan' : 'Take-Home Pay per Bulan'}
              </Label>
              <Input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="Rp 12.500.000"
                className="mt-2"
              />
            </div>

            <Separator />

            {/* PTKP Status */}
            <div>
              <Label className="text-base font-semibold">3. Status PTKP</Label>
              <RadioGroup value={ptkpStatus} onValueChange={setPtkpStatus} className="mt-2 grid grid-cols-2 gap-2">
                {Object.entries(PTKP_RATES).map(([status, amount]) => (
                  <div key={status} className="flex items-center space-x-2">
                    <RadioGroupItem value={status} id={status} />
                    <Label htmlFor={status} className="text-sm">
                      {status} ({formatCurrency(amount)})
                    </Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2 col-span-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">Custom</Label>
                  {ptkpStatus === 'custom' && (
                    <Input
                      type="text"
                      value={customPtkp}
                      onChange={(e) => setCustomPtkp(e.target.value)}
                      placeholder="Rp 54.000.000"
                      className="ml-2 flex-1"
                    />
                  )}
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* BPJS Options */}
            <div>
              <Label className="text-base font-semibold">4. Potongan BPJS</Label>
              <div className="mt-2 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="bpjs-kesehatan" 
                    checked={bpjsKesehatan}
                    onCheckedChange={(checked) => setBpjsKesehatan(checked === true)}
                  />
                  <Label htmlFor="bpjs-kesehatan">
                    BPJS Kesehatan (Employee: 2%, Company: 3%)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="bpjs-pensiun" 
                    checked={bpjsPensiun}
                    onCheckedChange={(checked) => setBpjsPensiun(checked === true)}
                  />
                  <Label htmlFor="bpjs-pensiun">
                    BPJS Pensiun (Employee: 1%, Company: 2%)
                  </Label>
                </div>
                
                {/* BPJS Info - Otomatis */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <Label className="text-sm font-medium text-blue-700 mb-2 block">ℹ️ Perhitungan BPJS Otomatis:</Label>
                   <div className="text-xs text-blue-600 space-y-1">
                     <p>• Jika gaji ≤ Rp {formatCurrency(BPJS_KESEHATAN_MAX_SALARY)}: BPJS Kesehatan = 2% × gaji</p>
                     <p>• Jika gaji {`>`} Rp {formatCurrency(BPJS_KESEHATAN_MAX_SALARY)}: BPJS Kesehatan = 2% × Rp {formatCurrency(BPJS_KESEHATAN_MAX_SALARY)}</p>
                     <p>• Jika gaji ≤ Rp {formatCurrency(BPJS_PENSIUN_MAX_SALARY)}: BPJS Pensiun = 1% × gaji</p>
                     <p>• Jika gaji {`>`} Rp {formatCurrency(BPJS_PENSIUN_MAX_SALARY)}: BPJS Pensiun = 1% × Rp {formatCurrency(BPJS_PENSIUN_MAX_SALARY)}</p>
                   </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Non-taxable Allowance */}
            <div>
              <Label className="text-base font-semibold">5. Tunjangan Tidak Kena Pajak (Opsional)</Label>
              <Input
                type="text"
                value={nonTaxableAllowance}
                onChange={(e) => setNonTaxableAllowance(e.target.value)}
                placeholder="Rp 0"
                className="mt-2"
              />
            </div>

            <Separator />

            {/* Salary Increase Simulation */}
            <div>
              <Label className="text-base font-semibold">6. Simulasi Kenaikan Gaji (%)</Label>
              <Input
                type="number"
                value={salaryIncrease}
                onChange={(e) => setSalaryIncrease(e.target.value)}
                placeholder="10"
                className="mt-2"
              />
            </div>

            <Button onClick={handleCalculate} className="w-full" size="lg">
              <Calculator className="h-4 w-4 mr-2" />
              Hitung PPh 21
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                Hasil Perhitungan
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToPDF}>
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel}>
                  <Download className="h-4 w-4 mr-1" />
                  Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">✅ Rincian Perhitungan</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Gaji setahun:</span>
                    <span className="font-medium">{formatCurrency(result.annualGross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Biaya jabatan (5%):</span>
                    <span className="font-medium">{formatCurrency(result.professionalAllowance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BPJS Kesehatan:</span>
                    <span className="font-medium">{formatCurrency(result.bpjsKesehatan)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BPJS Pensiun:</span>
                    <span className="font-medium">{formatCurrency(result.bpjsPensiun)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Penghasilan neto:</span>
                    <span className="font-medium">{formatCurrency(result.netIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PTKP:</span>
                    <span className="font-medium">{formatCurrency(result.ptkp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PKP:</span>
                    <span className="font-medium">{formatCurrency(result.pkp)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>PPh 21 setahun:</span>
                    <span className="text-red-600">{formatCurrency(result.annualTax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>PPh 21 per bulan:</span>
                    <span className="text-red-600">{formatCurrency(result.monthlyTax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Take-home pay/bulan:</span>
                    <span className="text-green-600">{formatCurrency(result.takeHomePay)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total biaya perusahaan/bulan:</span>
                    <span className="text-blue-600">{formatCurrency(result.totalCompanyCost)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    (Gaji bruto + BPJS Kesehatan {formatCurrency(result.bpjsKesehatanCompany/12)}/bln + BPJS Pensiun {formatCurrency(result.bpjsPensiunCompany/12)}/bln)
                  </div>
                </div>
              </div>

              {/* Tax Bracket Breakdown Table */}
              {result.pkp > 0 && (
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-4 text-base">Gunakan tarif progresif PPh 21 (berdasarkan Pasal 17 UU PPh):</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white rounded-lg shadow-sm overflow-hidden">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="text-left py-3 px-4 font-semibold">Lapisan Penghasilan</th>
                          <th className="text-center py-3 px-4 font-semibold w-24">Tarif</th>
                          <th className="text-right py-3 px-4 font-semibold">Pajak per Lapisan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.taxBreakdown.map((breakdown, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">
                              {breakdown.bracket}
                            </td>
                            <td className="text-center py-3 px-4 font-semibold text-blue-600">
                              {breakdown.rate.toFixed(0)}%
                            </td>
                            <td className="text-right py-3 px-4">
                              <div className="flex flex-col items-end">
                                <div className="text-sm text-gray-600 mb-1">
                                  {breakdown.rate.toFixed(0)}% × {formatCurrency(breakdown.amount)} =
                                </div>
                                <div className="text-red-600 font-bold text-base">
                                  {formatCurrency(breakdown.tax)}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-100 border-t-2 border-blue-600">
                          <td className="py-4 px-4 text-blue-800 font-bold">Total PPh 21 Tahunan</td>
                          <td className="text-center py-4 px-4 font-bold">-</td>
                          <td className="text-right py-4 px-4">
                            <div className="text-red-600 font-bold text-lg">
                              {formatCurrency(result.annualTax)}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Salary Increase Simulation */}
              {increaseResult && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Simulasi Kenaikan Gaji {salaryIncrease}%
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Gaji baru per bulan:</span>
                      <span className="font-medium">{formatCurrency(increaseResult.annualGross / 12)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PPh 21 baru per bulan:</span>
                      <span className="font-medium text-red-600">{formatCurrency(increaseResult.monthlyTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Take-home pay baru:</span>
                      <span className="font-medium text-green-600">{formatCurrency(increaseResult.takeHomePay)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Selisih PPh 21:</span>
                      <span className="text-red-600">
                        +{formatCurrency(increaseResult.monthlyTax - result.monthlyTax)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Selisih take-home:</span>
                      <span className="text-green-600">
                        +{formatCurrency(increaseResult.takeHomePay - result.takeHomePay)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Information */}
      <Card>
        <CardContent className="pt-3">
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Referensi:</strong> UU PPh Pasal 17 dan PER-16/PJ/2016</p>
            <p><strong>Catatan:</strong> Perhitungan ini adalah simulasi dan tidak menggantikan konsultasi dengan konsultan pajak profesional.</p>
            <p><strong>Peringatan:</strong> Pastikan input valid dan sesuai dengan ketentuan perpajakan yang berlaku.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
