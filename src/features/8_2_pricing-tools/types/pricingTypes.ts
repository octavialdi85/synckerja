export type TimePeriod = 'monthly' | 'yearly';
export type CostAllocationMethod = 'per-unit' | 'fixed-cost';
export type CalculationMethod = 'markup' | 'margin' | 'fixed';

export interface BusinessExpenseItem {
  id: string;
  category: string;
  name: string;
  amount: number;
  month?: number; // 1-12 untuk bulan spesifik, 0 atau null untuk semua bulan
}

export interface BusinessExpenseCategory {
  id: string;
  name: string;
  isCustom: boolean;
  color: string;
}

export interface SalesChannel {
  id: string;
  name: string;
  type: 'online' | 'offline';
  commissionPercent: number;
  paymentFeePercent?: number;
  adSpendPercent?: number;
  otherFeePercent?: number;
  totalFeePercent: number; // Total semua fee
  isActive: boolean;
  isDefault?: boolean; // Untuk default channels (Tokopedia, Shopee, dll)
}

export interface CostBreakdownItem {
  id: string;
  name: string;
  amount: number; // Rate per hour (akan dihitung dari monthlySalary atau vendorRatePerHour jika diisi)
  timePeriod?: 'hourly' | 'daily' | 'monthly';
  quantity?: number; // Hours per unit (backup calculation method)
  isForTotalBatch?: boolean; // Jika true, quantity adalah untuk total batch (dibagi production units). Jika false, quantity adalah per unit.
  
  // Fields untuk perhitungan dari gaji bulanan
  monthlySalary?: number; // Gaji bulanan karyawan
  workingDaysPerMonth?: number; // Hari kerja per bulan (default: 22)
  workingHoursPerDay?: number; // Jam kerja per hari (default: 8)
  hoursPerUnit?: number; // Jam kerja yang dibutuhkan untuk 1 unit produksi
  
  // Fields untuk perhitungan dari vendor/robot/mesin
  vendorRate?: number; // Rate untuk vendor/robot/mesin
  vendorTimePeriod?: 'hourly' | 'daily' | 'monthly'; // Periode waktu untuk rate vendor
  unitsPerTimePeriod?: number; // Jumlah unit yang bisa dihasilkan dalam periode waktu tersebut
  
  // Field untuk manual calculation override
  manualCostPerUnit?: number; // Cost per unit langsung (override Rate × Quantity jika diisi)
  
  // Fields untuk shipping flat rate
  flatRate?: number; // Flat rate untuk shipping (total cost untuk batch)
  flatRateUnits?: number; // Jumlah unit yang diantar dengan flat rate tersebut
  
  // Fields untuk marketing ROAS
  marketingSpend?: number; // Marketing spend bulanan
  targetROAS?: number; // Target ROAS (mis. 3 berarti 3:1)
  estimatedUnitsSold?: number; // Estimasi units sold (auto-calculated, read-only)
  estimatedSellingPrice?: number; // Estimated selling price (auto-calculated, read-only) = Production Cost (tanpa margin)
  expectedRevenue?: number; // Expected revenue (auto-calculated dari ROAS)
  marketingCalculationMethod?: 'roas' | 'flat-rate' | 'manual'; // Method untuk marketing
}

export interface CostCategory {
  id: string;
  title: string;
  items: CostBreakdownItem[];
  color: string;
  isLaborCategory?: boolean;
}

export interface PricingCalculationInput {
  // Product Info
  productName: string;
  category: string;
  
  // Production Costs (dari DynamicCostBreakdown) - WITHOUT Marketing Cost
  costBreakdown?: CostCategory[]; // Full structure untuk populate DynamicCostBreakdown
  productionCostPerUnit: number; // Cost per unit dari cost breakdown (tanpa marketing)
  
  // Operational Expenses
  operationalExpenses: BusinessExpenseItem[];
  totalOperationalExpenses: number;
  costAllocationMethod: CostAllocationMethod; // 'per-unit' atau 'fixed-cost'
  timePeriod: TimePeriod; // 'monthly' atau 'yearly'
  
  // Pricing Method
  calculationMethod: CalculationMethod;
  markupPercent?: number;
  marginPercent?: number;
  fixedProfit?: number;
  
  // Sales Channels
  salesChannels: SalesChannel[];
  selectedChannels: string[]; // Channel IDs yang dipilih
  
  // Target Profit
  targetProfitPercent?: number;
  
  // Minimum Margin Threshold
  minimumMarginPercent: number;
  
  // Marketing Costs (NEW - after Pricing Settings)
  marketingSpend?: number; // Marketing spend bulanan
  targetROAS?: number; // Target ROAS (mis. 3 berarti 3:1)
  marketingCostPerUnit?: number; // Calculated marketing cost per unit
  baseSellingPrice?: number; // Selling price sebelum marketing (from Step 5)
}

export interface ChannelPricingResult {
  channelId: string;
  channelName: string;
  sellingPrice: number;
  fees: number;
  netProfit: number;
  profitMargin: number;
  costPerUnit: number;
}

export interface BreakEvenAnalysis {
  unitsRequired: number;
  revenueRequired: number;
  monthsToBreakEven?: number; // Jika monthly, estimasi bulan
  // Breakdown fields
  totalExpenses?: number; // Total expenses yang perlu ditutup (Production + Operational + Channel Fee + Marketing)
  productionCost?: number; // Breakdown untuk break-even units
  operationalCost?: number; // Breakdown untuk break-even units
  channelFee?: number; // Breakdown untuk break-even units
  marketingCost?: number; // Breakdown untuk break-even units (NEW)
  netProfitPerUnit?: number; // Net profit per unit setelah channel fee
}

export interface TargetProfitAnalysis {
  totalCost: number; // Total biaya (production + operational + channel fee + marketing) yang digunakan untuk menghitung target profit
  productionCost: number; // Breakdown: Biaya produksi
  operationalCost: number; // Breakdown: Biaya operasional
  channelFee: number; // Breakdown: Biaya sales channel fee
  marketingCost?: number; // Breakdown: Biaya marketing (NEW)
  targetProfitAmount: number;
  unitsRequired: number;
  revenueRequired: number;
  monthsToTarget?: number; // Jika monthly, estimasi bulan
}

export interface PricingCalculationWarnings {
  lowMargin: boolean;
  lowMarginMessage?: string;
  unrealisticTarget?: string;
  invalidInputs?: string[];
}

export interface PricingCalculationResult {
  // Base Calculation
  baseSellingPrice: number;
  totalCostPerUnit: number; // Production + Operational (jika per-unit) - WITHOUT marketing
  profitPerUnit: number;
  profitMarginPercent: number;
  markupPercent: number;
  
  // Channel Pricing
  channelPricing: ChannelPricingResult[];
  
  // Break-Even Analysis (PRELIMINARY - without marketing if isPreliminary = true)
  breakEven: BreakEvenAnalysis;
  
  // Target Profit Analysis (PRELIMINARY - without marketing if isPreliminary = true)
  targetProfit: TargetProfitAnalysis | null;
  
  // Warnings
  warnings: PricingCalculationWarnings;
  
  // Summary
  summary: {
    totalExpenses: number; // Production + Operational + Channel Fee (without marketing)
    recommendedSellingPrice: number; // Base selling price (before marketing)
    recommendedChannel?: string;
    productionCostPerUnit: number;
    operationalCostPerUnit: number;
    breakEvenChannelFee?: number; // Channel fee untuk break-even
    netProfitPerUnit?: number; // Net profit per unit setelah channel fee
    channelFeePercentage?: number; // Persentase channel fee
  };
  
  // NEW: Preliminary vs Final Analysis
  isPreliminary?: boolean; // true = preliminary (without marketing), false = final (with marketing)
  preliminaryResults?: {
    baseSellingPrice: number;
    totalCostPerUnit: number;
    breakEven: BreakEvenAnalysis;
    targetProfit: TargetProfitAnalysis | null;
  };
  
  // NEW: Marketing Analysis (only if marketing is added)
  marketing?: {
    marketingSpend: number;
    targetROAS: number;
    expectedRevenue: number;
    estimatedUnitsSold: number;
    marketingCostPerUnit: number;
    baseSellingPrice: number; // Selling price sebelum marketing
    finalSellingPrice: number; // Selling price setelah marketing
    finalTotalCostPerUnit: number; // Total cost dengan marketing
    finalBreakEven: BreakEvenAnalysis;
    finalTargetProfit: TargetProfitAnalysis | null;
  };
}

