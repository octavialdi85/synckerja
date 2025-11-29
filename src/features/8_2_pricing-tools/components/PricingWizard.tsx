import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent } from '@/features/ui/card';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Button } from '@/features/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { RadioGroup, RadioGroupItem } from '@/features/ui/radio-group';
import { Separator } from '@/features/ui/separator';
import { Package, Calculator, Check, ChevronRight } from 'lucide-react';
import { Badge } from '@/features/ui/badge';
import { DynamicCostBreakdown } from './DynamicCostBreakdown';
import { BusinessExpensesForm } from './BusinessExpensesForm';
import { SalesChannelManager } from './SalesChannelManager';
import { TargetCalculationResults } from './TargetCalculationResults';
import {
  PricingCalculationInput,
  PricingCalculationResult,
  BusinessExpenseItem,
  SalesChannel,
  TimePeriod,
  CostAllocationMethod,
  CalculationMethod,
  CostCategory,
} from '../types/pricingTypes';
import { calculatePricing } from '../utils/pricingCalculationEngine';
import { formatRupiah } from '../utils/pricingUtils';
import { SavedCalculation } from '../hooks/usePricingCalculations';
import { LoadTemplateModal } from './LoadTemplateModal';

interface PricingWizardProps {
  onCalculate?: (results: PricingCalculationResult, input: PricingCalculationInput) => void;
}

export interface PricingWizardRef {
  loadCalculation: (calculation: SavedCalculation) => void;
  resetForm: () => void;
}

const STEPS = [
  { id: 1, name: 'Product', label: 'Product Info' },
  { id: 2, name: 'Costs', label: 'Production Costs' },
  { id: 3, name: 'Expenses', label: 'Business Expenses' },
  { id: 4, name: 'Channels', label: 'Sales Channels' },
  { id: 5, name: 'Pricing', label: 'Pricing Settings' },
];

export const PricingWizard = forwardRef<PricingWizardRef, PricingWizardProps>(
  ({ onCalculate }, ref) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [calculationResult, setCalculationResult] = useState<PricingCalculationResult | null>(null);
  const [loadKey, setLoadKey] = useState<string>(''); // Key untuk force re-render komponen child

  // Form state
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  
  // Production costs (from DynamicCostBreakdown) - sekarang cost per unit
  const [productionCostPerUnit, setProductionCostPerUnit] = useState<number>(0);
  const [initialCostBreakdown, setInitialCostBreakdown] = useState<CostCategory[] | undefined>();
  const [costBreakdown, setCostBreakdown] = useState<CostCategory[] | undefined>();
  
  // Business expenses
  const [operationalExpenses, setOperationalExpenses] = useState<BusinessExpenseItem[]>([]);
  const [totalOperationalExpenses, setTotalOperationalExpenses] = useState<number>(0);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');
  const [costAllocationMethod, setCostAllocationMethod] = useState<CostAllocationMethod>('fixed-cost');
  const [initialExpenses, setInitialExpenses] = useState<BusinessExpenseItem[] | undefined>();
  
  // Sales channels
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [initialChannels, setInitialChannels] = useState<SalesChannel[] | undefined>();
  
  // Pricing settings
  const [calculationMethod, setCalculationMethod] = useState<CalculationMethod>('markup');
  const [markupPercent, setMarkupPercent] = useState<number>(50);
  const [marginPercent, setMarginPercent] = useState<number>(30);
  const [fixedProfit, setFixedProfit] = useState<number>(0);
  const [targetProfitPercent, setTargetProfitPercent] = useState<number>(10);
  const [minimumMarginPercent, setMinimumMarginPercent] = useState<number>(15);

  // Update selected channels when channels change
  useEffect(() => {
    const activeChannels = salesChannels.filter(c => c.isActive).map(c => c.id);
    setSelectedChannels(prev => {
      // Keep selected channels that are still active
      const validSelected = prev.filter(id => activeChannels.includes(id));
      return validSelected.length > 0 ? validSelected : activeChannels;
    });
  }, [salesChannels]);

  const handleProductionCostChange = useCallback((costPerUnit: number) => {
    setProductionCostPerUnit(costPerUnit);
  }, []);

  const handleCostBreakdownChange = useCallback((breakdown: CostCategory[]) => {
    setCostBreakdown(breakdown);
  }, []);

  const handleExpensesChange = useCallback((expenses: BusinessExpenseItem[], total: number) => {
    setOperationalExpenses(expenses);
    setTotalOperationalExpenses(total);
  }, []);

  const handleChannelsChange = useCallback((channels: SalesChannel[]) => {
    setSalesChannels(channels);
  }, []);

  const handleCalculate = () => {
    const input: PricingCalculationInput = {
      productName,
      category,
      costBreakdown: costBreakdown || initialCostBreakdown,
      productionCostPerUnit,
      operationalExpenses,
      totalOperationalExpenses,
      costAllocationMethod,
      timePeriod,
      calculationMethod,
      markupPercent: calculationMethod === 'markup' ? markupPercent : undefined,
      marginPercent: calculationMethod === 'margin' ? marginPercent : undefined,
      fixedProfit: calculationMethod === 'fixed' ? fixedProfit : undefined,
      salesChannels,
      selectedChannels,
      targetProfitPercent,
      minimumMarginPercent,
    };

    const results = calculatePricing(input);
    setCalculationResult(results);
    
    if (onCalculate) {
      onCalculate(results, input);
    }
  };

  const handleReset = () => {
    setProductName('');
    setCategory('');
    setInitialCostBreakdown(undefined);
    setCostBreakdown(undefined);
    setProductionCostPerUnit(0);
    setOperationalExpenses([]);
    setTotalOperationalExpenses(0);
    setInitialExpenses(undefined);
    setInitialChannels(undefined);
    setSalesChannels([]);
    setSelectedChannels([]);
    setCalculationResult(null);
    setLoadKey(''); // Reset load key
    setCurrentStep(1);
  };

  const loadCalculation = useCallback((calculation: SavedCalculation) => {
    const input = calculation.calculation_input;
    
    // Generate unique key untuk force re-render komponen child
    const uniqueKey = `load-${Date.now()}-${calculation.id}`;
    setLoadKey(uniqueKey);
    
    // Load basic product info
    setProductName(input.productName || '');
    setCategory(input.category || '');
    
    // Load production cost breakdown (if available)
    // Filter out admin-cost category (moved to Business Expenses)
    if (input.costBreakdown && input.costBreakdown.length > 0) {
      const filteredCostBreakdown = input.costBreakdown.filter(
        category => category.id !== 'admin-cost'
      );
      setInitialCostBreakdown(filteredCostBreakdown);
      setCostBreakdown(filteredCostBreakdown);
    } else {
      setInitialCostBreakdown(undefined);
      setCostBreakdown(undefined);
    }
    setProductionCostPerUnit(input.productionCostPerUnit || 0);
    
    // Load operational expenses
    if (input.operationalExpenses && input.operationalExpenses.length > 0) {
      setInitialExpenses(input.operationalExpenses);
      setOperationalExpenses(input.operationalExpenses);
    } else {
      setInitialExpenses([]);
      setOperationalExpenses([]);
    }
    setTotalOperationalExpenses(input.totalOperationalExpenses || 0);
    setTimePeriod(input.timePeriod || 'monthly');
    setCostAllocationMethod(input.costAllocationMethod || 'fixed-cost');
    
    // Load sales channels
    if (input.salesChannels && input.salesChannels.length > 0) {
      setInitialChannels(input.salesChannels);
      setSalesChannels(input.salesChannels);
    } else {
      setInitialChannels([]);
      setSalesChannels([]);
    }
    setSelectedChannels(input.selectedChannels || []);
    
    // Load pricing settings
    setCalculationMethod(input.calculationMethod || 'markup');
    if (input.markupPercent !== undefined) setMarkupPercent(input.markupPercent);
    if (input.marginPercent !== undefined) setMarginPercent(input.marginPercent);
    if (input.fixedProfit !== undefined) setFixedProfit(input.fixedProfit);
    setTargetProfitPercent(input.targetProfitPercent || 10);
    setMinimumMarginPercent(input.minimumMarginPercent || 15);
    
    // Load calculation result
    setCalculationResult(calculation.calculation_result);
    
    // Trigger onCalculate if needed
    if (onCalculate) {
      onCalculate(calculation.calculation_result, input);
    }
    
    // Navigate to step 1 to show all loaded data
    setCurrentStep(1);
  }, [onCalculate]);

  const loadTemplate = useCallback((templateData: PricingCalculationInput, templateName?: string) => {
    // Load basic product info
    setProductName(templateData.productName || '');
    setCategory(templateData.category || '');
    
    // Load cost breakdown detail (if available)
    let processedCostBreakdown = templateData.costBreakdown;
    
    // Special handling for "Parfum Import - Template Contoh"
    if (templateName === 'Parfum Import - Template Contoh' && processedCostBreakdown) {
      processedCostBreakdown = processedCostBreakdown.map(category => {
        if (category.isLaborCategory && category.items) {
          return {
            ...category,
            items: category.items.map(item => {
              // Ensure vendor method is used and clear other method fields
              const cleanedItem: any = {
                ...item,
                calculationMethod: 'vendor' as const,
                // Clear all salary method fields
                monthlySalary: undefined,
                workingDaysPerMonth: undefined,
                workingHoursPerDay: undefined,
                hoursPerUnit: undefined,
                // Clear manual method fields (but preserve vendor-related fields)
                amount: undefined,
                quantity: undefined,
                timePeriod: undefined,
                manualCostPerUnit: undefined,
                // Ensure vendor fields are set (preserve existing values or set defaults)
                vendorTimePeriod: item.vendorTimePeriod || 'hourly',
                vendorRate: item.vendorRate,
                unitsPerTimePeriod: item.unitsPerTimePeriod
              };
              return cleanedItem;
            })
          };
        }
        return category;
      });
    }
    
    if (processedCostBreakdown && processedCostBreakdown.length > 0) {
      // Filter out admin-cost category (moved to Business Expenses)
      const filteredCostBreakdown = processedCostBreakdown.filter(
        category => category.id !== 'admin-cost'
      );
      setInitialCostBreakdown(filteredCostBreakdown);
    }
    // Support backward compatibility: jika ada productionCostPerUnit, gunakan itu
    // Jika tidak, coba hitung dari totalProductionCost / productionUnits (legacy data)
    if (templateData.productionCostPerUnit) {
      setProductionCostPerUnit(templateData.productionCostPerUnit);
    } else if ((templateData as any).totalProductionCost && (templateData as any).productionUnits) {
      // Legacy data: hitung production cost per unit dari total / units
      const legacyCostPerUnit = (templateData as any).totalProductionCost / (templateData as any).productionUnits;
      setProductionCostPerUnit(legacyCostPerUnit);
    } else {
      setProductionCostPerUnit(0);
    }
    
    // Load operational expenses
    if (templateData.operationalExpenses && templateData.operationalExpenses.length > 0) {
      setInitialExpenses(templateData.operationalExpenses);
    }
    setOperationalExpenses(templateData.operationalExpenses || []);
    setTotalOperationalExpenses(templateData.totalOperationalExpenses || 0);
    setTimePeriod(templateData.timePeriod || 'monthly');
    setCostAllocationMethod(templateData.costAllocationMethod || 'fixed-cost');
    
    // Load sales channels
    if (templateData.salesChannels && templateData.salesChannels.length > 0) {
      setInitialChannels(templateData.salesChannels);
    }
    setSalesChannels(templateData.salesChannels || []);
    setSelectedChannels(templateData.selectedChannels || []);
    
    // Load pricing settings
    setCalculationMethod(templateData.calculationMethod || 'markup');
    if (templateData.markupPercent !== undefined) setMarkupPercent(templateData.markupPercent);
    if (templateData.marginPercent !== undefined) setMarginPercent(templateData.marginPercent);
    if (templateData.fixedProfit !== undefined) setFixedProfit(templateData.fixedProfit);
    setTargetProfitPercent(templateData.targetProfitPercent || 10);
    setMinimumMarginPercent(templateData.minimumMarginPercent || 15);
    
    // Clear calculation result (template is just starting point)
    setCalculationResult(null);
    
    // Stay on step 1 so user can review and edit
    setCurrentStep(1);
  }, []);

  useImperativeHandle(ref, () => ({
    loadCalculation,
    resetForm: handleReset,
  }), [loadCalculation]);

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return productName.trim() !== '' && category.trim() !== '';
      case 2:
        return productionCostPerUnit > 0;
      case 3:
        return true; // Expenses optional
      case 4:
        return selectedChannels.length > 0;
      case 5:
        if (calculationMethod === 'markup') return markupPercent !== undefined && markupPercent > 0;
        if (calculationMethod === 'margin') return marginPercent !== undefined && marginPercent > 0 && marginPercent < 100;
        if (calculationMethod === 'fixed') return fixedProfit !== undefined && fixedProfit > 0;
        return false;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => goToStep(step.id)}
                  className="flex flex-col items-center flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                  type="button"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                      currentStep === step.id
                        ? 'bg-blue-600 text-white'
                        : currentStep > step.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="space-y-4">
        {/* Step 1: Product Information */}
        {currentStep === 1 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Product Information</h3>
                </div>
                <LoadTemplateModal onLoadTemplate={loadTemplate} />
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product-name" className="text-sm font-medium">
                    Product Name *
                  </Label>
                  <Input
                    id="product-name"
                    placeholder="Enter product name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="product-category" className="text-sm font-medium">
                    Category *
                  </Label>
                  <Input
                    id="product-category"
                    placeholder="Enter product category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Production Costs */}
        {currentStep === 2 && (
          <div>
            <DynamicCostBreakdown 
              onTotalChange={handleProductionCostChange}
              onCostBreakdownChange={handleCostBreakdownChange}
              initialCostCategories={initialCostBreakdown}
              key={`cost-breakdown-${loadKey}-${JSON.stringify(initialCostBreakdown)}`}
            />
          </div>
        )}

        {/* Step 3: Business Expenses */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Time Period</Label>
                      <Select
                        value={timePeriod}
                        onValueChange={(value: TimePeriod) => setTimePeriod(value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Cost Allocation Method</Label>
                      <Select
                        value={costAllocationMethod}
                        onValueChange={(value: CostAllocationMethod) => setCostAllocationMethod(value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per-unit">Per Unit (Distribute to units)</SelectItem>
                          <SelectItem value="fixed-cost">Fixed Cost (Cover from total sales)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <BusinessExpensesForm
              onExpensesChange={handleExpensesChange}
              timePeriod={timePeriod}
              costAllocationMethod={costAllocationMethod}
              initialExpenses={initialExpenses}
              key={`expenses-${loadKey}-${JSON.stringify(initialExpenses)}`}
            />
          </div>
        )}

        {/* Step 4: Sales Channels */}
        {currentStep === 4 && (
          <SalesChannelManager 
            onChannelsChange={handleChannelsChange}
            initialChannels={initialChannels}
            key={`channels-${loadKey}-${JSON.stringify(initialChannels)}`}
          />
        )}

        {/* Step 5: Pricing Settings */}
        {currentStep === 5 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <Calculator className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Pengaturan Harga Jual</h3>
              </div>
              <div className="space-y-6">
                {/* Bagian 1: Tentukan Harga Jual (WAJIB) */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-blue-800">
                      1. Tentukan Harga Jual per Unit
                    </h4>
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                      WAJIB
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-700 mb-4">
                    Pilih metode untuk menghitung harga jual produk Anda. Ini akan menentukan <strong>profit per unit</strong> dan <strong>harga jual akhir</strong> yang akan digunakan di semua channel penjualan.
                  </p>
                  
                  <RadioGroup
                    value={calculationMethod}
                    onValueChange={(value: CalculationMethod) => setCalculationMethod(value)}
                    className="space-y-3"
                  >
                    {/* Opsi 1: Markup */}
                    <div className="flex items-start space-x-3 p-3 border rounded-lg bg-white hover:border-blue-300 transition-colors">
                      <RadioGroupItem value="markup" id="markup" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="markup" className="text-sm font-medium cursor-pointer">
                          Tambah Persentase dari Total Biaya (Markup)
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          Tambahkan persentase tertentu ke total biaya produksi + operasional
                        </p>
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          <strong>Contoh:</strong> Biaya Rp 10.000 + Markup 50% = Harga Jual Rp 15.000
                        </p>
                      </div>
                    </div>

                    {/* Opsi 2: Margin */}
                    <div className="flex items-start space-x-3 p-3 border rounded-lg bg-white hover:border-blue-300 transition-colors">
                      <RadioGroupItem value="margin" id="margin" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="margin" className="text-sm font-medium cursor-pointer">
                          Profit Persentase dari Harga Jual (Margin)
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          Tetapkan berapa persen profit yang diinginkan dari harga jual akhir
                        </p>
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          <strong>Contoh:</strong> Harga Jual Rp 20.000 dengan Margin 30% = Profit Rp 6.000
                        </p>
                      </div>
                    </div>

                    {/* Opsi 3: Fixed Profit */}
                    <div className="flex items-start space-x-3 p-3 border rounded-lg bg-white hover:border-blue-300 transition-colors">
                      <RadioGroupItem value="fixed" id="fixed" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="fixed" className="text-sm font-medium cursor-pointer">
                          Tambah Keuntungan Tetap per Unit
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          Tambahkan jumlah keuntungan tetap (Rp) ke setiap unit yang dijual
                        </p>
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          <strong>Contoh:</strong> Biaya Rp 10.000 + Profit Tetap Rp 5.000 = Harga Jual Rp 15.000
                        </p>
                      </div>
                    </div>
                  </RadioGroup>

                  {/* Input berdasarkan pilihan */}
                  <div className="mt-4 p-4 bg-white border rounded-lg">
                    <Label className="text-sm font-medium">
                      {calculationMethod === 'markup'
                        ? 'Berapa persen yang ingin ditambahkan? (Markup %)'
                        : calculationMethod === 'margin'
                        ? 'Berapa persen profit yang diinginkan? (Margin %)'
                        : 'Berapa keuntungan tetap per unit? (Rp)'}
                    </Label>
                    <Input
                      type="number"
                      placeholder={calculationMethod === 'fixed' ? "5.000" : "50"}
                      value={
                        calculationMethod === 'markup'
                          ? markupPercent
                          : calculationMethod === 'margin'
                          ? marginPercent
                          : fixedProfit
                      }
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        if (calculationMethod === 'markup') setMarkupPercent(value);
                        else if (calculationMethod === 'margin') setMarginPercent(value);
                        else setFixedProfit(value);
                      }}
                      className="mt-2"
                      min="0"
                      step={calculationMethod === 'fixed' ? '1000' : '0.1'}
                      max={calculationMethod === 'margin' ? '99' : undefined}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {calculationMethod === 'markup' && 'Masukkan angka tanpa %. Contoh: 50 berarti 50%'}
                      {calculationMethod === 'margin' && 'Masukkan angka tanpa %. Contoh: 30 berarti 30%'}
                      {calculationMethod === 'fixed' && 'Masukkan jumlah dalam Rupiah. Contoh: 5000'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Bagian 2: Analisis Target Penjualan (OPSIONAL) */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-purple-800">
                      2. Analisis Target Penjualan
                    </h4>
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                      OPSIONAL
                    </Badge>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-yellow-800 font-medium">
                      <strong>⚠️ PENTING:</strong> Bagian ini <strong>TIDAK mengubah harga jual</strong> yang sudah ditentukan di atas. 
                      Ini hanya untuk <strong>analisis</strong> - menghitung berapa unit yang harus dijual untuk mencapai target profit tertentu.
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Target Profit (%) dari Total Biaya
                    </Label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={targetProfitPercent || ''}
                      onChange={(e) => setTargetProfitPercent(parseFloat(e.target.value) || 0)}
                      className="mt-2"
                      min="0"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      <strong>Penjelasan:</strong> Masukkan target profit yang ingin dicapai dari total biaya (produksi + operasional). 
                      Sistem akan menghitung berapa unit yang harus dijual dengan <strong>harga jual yang sudah ditentukan di Bagian 1</strong> untuk mencapai target profit ini.
                    </p>
                    <p className="text-xs text-purple-600 mt-1 font-medium">
                      <strong>Contoh:</strong> Total biaya Rp 1.000.000, Target Profit 10% = Keuntungan target Rp 100.000. 
                      Sistem akan menghitung: dengan harga jual yang sudah ditentukan, berapa unit harus dijual untuk mendapatkan profit Rp 100.000?
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Bagian 3: Peringatan Margin (Opsional) */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="text-sm font-semibold text-orange-800 mb-4">
                    3. Minimum Margin yang Diizinkan (Opsional)
                  </h4>
                  <div>
                    <Label className="text-sm font-medium">
                      Minimum Margin (%)
                    </Label>
                    <Input
                      type="number"
                      placeholder="15"
                      value={minimumMarginPercent || ''}
                      onChange={(e) => setMinimumMarginPercent(parseFloat(e.target.value) || 0)}
                      className="mt-2"
                      min="0"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      <strong>Penjelasan:</strong> Jika margin profit hasil perhitungan lebih rendah dari nilai ini, 
                      sistem akan menampilkan peringatan. Ini membantu memastikan harga jual Anda tetap menguntungkan.
                    </p>
                    <p className="text-xs text-orange-600 mt-1 font-medium">
                      <strong>Contoh:</strong> Set Minimum Margin 15%. Jika hasil perhitungan margin hanya 10%, sistem akan memperingatkan Anda.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCalculate} className="flex-1" size="lg">
                    <Calculator className="mr-2 h-4 w-4" />
                    Hitung Harga Jual
                  </Button>
                  <Button onClick={handleReset} variant="outline" size="lg">
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Calculation Results */}
      {calculationResult && (
        <TargetCalculationResults results={calculationResult} timePeriod={timePeriod} />
      )}

      {/* Navigation Buttons */}
      {!calculationResult && (
        <div className="flex justify-between items-center pt-4">
          <Button
            onClick={prevStep}
            variant="outline"
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          <Button
            onClick={nextStep}
            disabled={currentStep === STEPS.length || !isStepValid(currentStep)}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});

PricingWizard.displayName = 'PricingWizard';

