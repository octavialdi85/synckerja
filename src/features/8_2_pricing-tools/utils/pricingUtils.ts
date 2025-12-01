// Format rupiah dengan titik sebagai ribuan separator (1.000.000)
export const formatRupiah = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0';
  }
  return `Rp ${amount.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

// Format number dengan titik sebagai ribuan separator
export const formatNumber = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0';
  }
  return amount.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// Format number dengan decimal places
export const formatNumberWithDecimal = (amount: number, decimals: number = 2): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0';
  }
  return amount.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// Parse rupiah string ke number
export const parseRupiah = (value: string): number => {
  if (!value) return 0;
  return parseFloat(value.replace(/[^\d.]/g, '')) || 0;
};

// Calculate selling price berdasarkan markup
export const calculateSellingPriceByMarkup = (
  cost: number,
  markupPercent: number
): number => {
  if (isNaN(cost) || isNaN(markupPercent)) return 0;
  return cost * (1 + markupPercent / 100);
};

// Calculate selling price berdasarkan margin
export const calculateSellingPriceByMargin = (
  cost: number,
  marginPercent: number
): number => {
  if (isNaN(cost) || isNaN(marginPercent)) return 0;
  if (marginPercent >= 100) return Infinity;
  return cost / (1 - marginPercent / 100);
};

// Calculate selling price berdasarkan fixed profit
export const calculateSellingPriceByFixedProfit = (
  cost: number,
  fixedProfit: number
): number => {
  if (isNaN(cost) || isNaN(fixedProfit)) return 0;
  return cost + fixedProfit;
};

// Calculate profit margin percentage
export const calculateProfitMargin = (
  sellingPrice: number,
  cost: number
): number => {
  if (isNaN(sellingPrice) || isNaN(cost) || sellingPrice === 0) return 0;
  return ((sellingPrice - cost) / sellingPrice) * 100;
};

// Calculate markup percentage
export const calculateMarkup = (sellingPrice: number, cost: number): number => {
  if (isNaN(sellingPrice) || isNaN(cost) || cost === 0) return 0;
  return ((sellingPrice - cost) / cost) * 100;
};

// Calculate target units to sell untuk break-even
export const calculateBreakEvenUnits = (
  totalExpenses: number,
  profitPerUnit: number
): number => {
  if (isNaN(totalExpenses) || isNaN(profitPerUnit) || profitPerUnit <= 0) {
    return Infinity;
  }
  return Math.ceil(totalExpenses / profitPerUnit);
};

// Calculate target units to sell untuk target profit
export const calculateTargetProfitUnits = (
  totalExpenses: number,
  targetProfitAmount: number,
  profitPerUnit: number
): number => {
  if (
    isNaN(totalExpenses) ||
    isNaN(targetProfitAmount) ||
    isNaN(profitPerUnit) ||
    profitPerUnit <= 0
  ) {
    return Infinity;
  }
  return Math.ceil((totalExpenses + targetProfitAmount) / profitPerUnit);
};

// Calculate target revenue
export const calculateTargetRevenue = (
  targetUnits: number,
  sellingPrice: number
): number => {
  if (isNaN(targetUnits) || isNaN(sellingPrice)) return 0;
  return targetUnits * sellingPrice;
};

// Calculate production cost per unit
export const calculateProductionCostPerUnit = (
  totalProductionCost: number,
  productionUnits: number
): number => {
  if (isNaN(totalProductionCost) || isNaN(productionUnits) || productionUnits <= 0) {
    return 0;
  }
  return totalProductionCost / productionUnits;
};

// Calculate operational cost per unit
export const calculateOperationalCostPerUnit = (
  totalOperationalCost: number,
  productionUnits: number
): number => {
  if (isNaN(totalOperationalCost) || isNaN(productionUnits) || productionUnits <= 0) {
    return 0;
  }
  return totalOperationalCost / productionUnits;
};

// Calculate channel fee amount
export const calculateChannelFee = (
  sellingPrice: number,
  feePercent: number
): number => {
  if (isNaN(sellingPrice) || isNaN(feePercent)) return 0;
  return (sellingPrice * feePercent) / 100;
};

// Calculate net profit after channel fee
export const calculateNetProfitAfterFee = (
  sellingPrice: number,
  cost: number,
  feePercent: number
): number => {
  if (isNaN(sellingPrice) || isNaN(cost) || isNaN(feePercent)) return 0;
  const fee = calculateChannelFee(sellingPrice, feePercent);
  return sellingPrice - cost - fee;
};

// Calculate profit margin after channel fee
export const calculateProfitMarginAfterFee = (
  sellingPrice: number,
  cost: number,
  feePercent: number
): number => {
  if (isNaN(sellingPrice) || sellingPrice === 0) return 0;
  const netProfit = calculateNetProfitAfterFee(sellingPrice, cost, feePercent);
  return calculateProfitMargin(sellingPrice, sellingPrice - netProfit);
};

// Validate minimum margin threshold
export const validateMinimumMargin = (
  margin: number,
  minimumMargin: number
): { isValid: boolean; warning?: string } => {
  if (isNaN(margin) || isNaN(minimumMargin)) {
    return { isValid: false, warning: 'Invalid margin values' };
  }
  
  if (margin < minimumMargin) {
    return {
      isValid: false,
      warning: `Profit margin (${margin.toFixed(2)}%) is below minimum threshold (${minimumMargin}%). Consider adjusting pricing or costs.`,
    };
  }
  
  return { isValid: true };
};


