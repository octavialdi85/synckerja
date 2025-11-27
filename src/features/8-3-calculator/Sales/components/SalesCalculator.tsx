import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';
import { SalesTemplateManager } from './SalesTemplateManager';
import { SalesKPISettings } from '../../../8-3-CampaignCalculator/types/kpi-templates';

// Utility functions (same as EngagementCalculator)
const normalizeCurrencyValue = (value: string) => value.replace(/[^\d]/g, '');

const formatCurrencyDisplay = (value: string) => {
  if (!value) return '';
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return '';
  return new Intl.NumberFormat('id-ID').format(numericValue);
};

const currencyStringToNumber = (value: string) => {
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? 0 : numericValue;
};

const normalizePercentageValue = (value: string) => {
  if (!value) return '';
  return value.replace(/[^0-9,.\-]/g, '');
};

const percentageStringToNumber = (value: string) => {
  const normalized = value.replace(',', '.');
  const numericValue = Number(normalized);
  return Number.isNaN(numericValue) ? 0 : numericValue;
};

const normalizeFloatValue = (value: string) => value.replace(/[^0-9,.\-]/g, '');

const floatStringToNumber = (value: string) => {
  const normalized = value.replace(',', '.');
  const numericValue = Number(normalized);
  return Number.isNaN(numericValue) ? 0 : numericValue;
};

const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

const formatCurrency = (num: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);

const formatDecimal = (num: number, decimals: number = 2) => num.toFixed(decimals);

interface PercentageInputFieldProps {
  id: string;
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
}

const PercentageInputField = ({
  id,
  value,
  placeholder,
  onValueChange
}: PercentageInputFieldProps) => (
  <div className="relative">
    <Input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onValueChange(normalizePercentageValue(e.target.value))}
      className="mt-1 pr-10"
      placeholder={placeholder}
    />
    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">%</span>
  </div>
);

interface SalesCalculatorProps {
  initialSettings?: SalesKPISettings;
  onSettingsChange?: (settings: SalesKPISettings) => void;
}

const SalesCalculator = ({
  initialSettings = {},
  onSettingsChange
}: SalesCalculatorProps) => {
  const { t } = useAppTranslation();

  // Basic Marketing KPIs
  const [budget, setBudget] = useState<string>(normalizeCurrencyValue(initialSettings.budget || ''));
  const [cpc, setCpc] = useState<string>(normalizeCurrencyValue(initialSettings.cpc || ''));
  const [landingPageCtr, setLandingPageCtr] = useState<string>(normalizePercentageValue(initialSettings.landingPageCtr || ''));
  
  // Sales Funnel Conversion Rates
  const [productViewRate, setProductViewRate] = useState<string>(normalizePercentageValue(initialSettings.productViewRate || ''));
  const [addToCartRate, setAddToCartRate] = useState<string>(normalizePercentageValue(initialSettings.addToCartRate || ''));
  const [checkoutRate, setCheckoutRate] = useState<string>(normalizePercentageValue(initialSettings.checkoutRate || ''));
  const [paymentSuccessRate, setPaymentSuccessRate] = useState<string>(normalizePercentageValue(initialSettings.paymentSuccessRate || ''));
  
  // Product & Revenue KPIs
  const [productPrice, setProductPrice] = useState<string>(normalizeCurrencyValue(initialSettings.productPrice || ''));
  const [avgOrderValue, setAvgOrderValue] = useState<string>(normalizeCurrencyValue(initialSettings.avgOrderValue || ''));
  const [profitMargin, setProfitMargin] = useState<string>(normalizePercentageValue(initialSettings.profitMargin || ''));
  
  // Advanced Metrics
  const [repeatPurchaseRate, setRepeatPurchaseRate] = useState<string>(normalizePercentageValue(initialSettings.repeatPurchaseRate || ''));
  const [upsellRate, setUpsellRate] = useState<string>(normalizePercentageValue(initialSettings.upsellRate || ''));
  const [seasonalMultiplier, setSeasonalMultiplier] = useState<string>(normalizeFloatValue(initialSettings.seasonalMultiplier || '1'));

  // Use ref to track if update is from user input or from props
  const isSyncingFromPropsRef = useRef(false);
  const prevInitialSettingsRef = useRef<string>(JSON.stringify(initialSettings));

  const [results, setResults] = useState({
    clicks: 0,
    productViews: 0,
    addToCarts: 0,
    checkoutStarted: 0,
    successfulOrders: 0,
    totalRevenue: 0,
    grossProfit: 0,
    netProfit: 0,
    costPerClick: 0,
    costPerView: 0,
    costPerCart: 0,
    costPerOrder: 0,
    customerAcquisitionCost: 0,
    returnOnAdSpend: 0,
    customerLifetimeValue: 0,
    clvToCacRatio: 0,
    breakEvenOrders: 0,
    monthlyRevenue: 0
  });

  // Sync state with initialSettings when template is loaded
  useEffect(() => {
    const currentSettingsStr = JSON.stringify({
      budget: initialSettings.budget || '',
      cpc: initialSettings.cpc || '',
      landingPageCtr: initialSettings.landingPageCtr || '',
      productViewRate: initialSettings.productViewRate || '',
      addToCartRate: initialSettings.addToCartRate || '',
      checkoutRate: initialSettings.checkoutRate || '',
      paymentSuccessRate: initialSettings.paymentSuccessRate || '',
      productPrice: initialSettings.productPrice || '',
      avgOrderValue: initialSettings.avgOrderValue || '',
      profitMargin: initialSettings.profitMargin || '',
      repeatPurchaseRate: initialSettings.repeatPurchaseRate || '',
      upsellRate: initialSettings.upsellRate || '',
      seasonalMultiplier: initialSettings.seasonalMultiplier || '1'
    });
    
    // Only sync if initialSettings actually changed (template was loaded)
    if (currentSettingsStr !== prevInitialSettingsRef.current) {
      prevInitialSettingsRef.current = currentSettingsStr;
      
      isSyncingFromPropsRef.current = true;
      
      setBudget(normalizeCurrencyValue(initialSettings.budget || ''));
      setCpc(normalizeCurrencyValue(initialSettings.cpc || ''));
      setLandingPageCtr(normalizePercentageValue(initialSettings.landingPageCtr || ''));
      setProductViewRate(normalizePercentageValue(initialSettings.productViewRate || ''));
      setAddToCartRate(normalizePercentageValue(initialSettings.addToCartRate || ''));
      setCheckoutRate(normalizePercentageValue(initialSettings.checkoutRate || ''));
      setPaymentSuccessRate(normalizePercentageValue(initialSettings.paymentSuccessRate || ''));
      setProductPrice(normalizeCurrencyValue(initialSettings.productPrice || ''));
      setAvgOrderValue(normalizeCurrencyValue(initialSettings.avgOrderValue || ''));
      setProfitMargin(normalizePercentageValue(initialSettings.profitMargin || ''));
      setRepeatPurchaseRate(normalizePercentageValue(initialSettings.repeatPurchaseRate || ''));
      setUpsellRate(normalizePercentageValue(initialSettings.upsellRate || ''));
      setSeasonalMultiplier(normalizeFloatValue(initialSettings.seasonalMultiplier || '1'));
      
      // Reset flag after state updates complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isSyncingFromPropsRef.current = false;
        });
      });
    }
  }, [
    initialSettings.budget,
    initialSettings.cpc,
    initialSettings.landingPageCtr,
    initialSettings.productViewRate,
    initialSettings.addToCartRate,
    initialSettings.checkoutRate,
    initialSettings.paymentSuccessRate,
    initialSettings.productPrice,
    initialSettings.avgOrderValue,
    initialSettings.profitMargin,
    initialSettings.repeatPurchaseRate,
    initialSettings.upsellRate,
    initialSettings.seasonalMultiplier
  ]);

  // Helper function to notify parent of settings change (only when user makes changes)
  const notifySettingsChange = useCallback((updatedSettings: SalesKPISettings) => {
    if (!isSyncingFromPropsRef.current && onSettingsChange) {
      onSettingsChange(updatedSettings);
    }
  }, [onSettingsChange]);

  // Handlers that update state and notify parent
  const handleBudgetChange = (value: string) => {
    setBudget(value);
    notifySettingsChange({
      budget: value,
      cpc,
      landingPageCtr,
      productViewRate,
      addToCartRate,
      checkoutRate,
      paymentSuccessRate,
      productPrice,
      avgOrderValue,
      profitMargin,
      repeatPurchaseRate,
      upsellRate,
      seasonalMultiplier
    });
  };

  const handleCpcChange = (value: string) => {
    setCpc(value);
    notifySettingsChange({
      budget,
      cpc: value,
      landingPageCtr,
      productViewRate,
      addToCartRate,
      checkoutRate,
      paymentSuccessRate,
      productPrice,
      avgOrderValue,
      profitMargin,
      repeatPurchaseRate,
      upsellRate,
      seasonalMultiplier
    });
  };

  const handleLandingPageCtrChange = (value: string) => {
    setLandingPageCtr(value);
    notifySettingsChange({
      budget,
      cpc,
      landingPageCtr: value,
      productViewRate,
      addToCartRate,
      checkoutRate,
      paymentSuccessRate,
      productPrice,
      avgOrderValue,
      profitMargin,
      repeatPurchaseRate,
      upsellRate,
      seasonalMultiplier
    });
  };

  const handleProductViewRateChange = (value: string) => {
    setProductViewRate(value);
    notifySettingsChange({
      budget,
      cpc,
      landingPageCtr,
      productViewRate: value,
      addToCartRate,
      checkoutRate,
      paymentSuccessRate,
      productPrice,
      avgOrderValue,
      profitMargin,
      repeatPurchaseRate,
      upsellRate,
      seasonalMultiplier
    });
  };

  const handleAddToCartRateChange = (value: string) => {
    setAddToCartRate(value);
    notifySettingsChange({
      budget,
      cpc,
      landingPageCtr,
      productViewRate,
      addToCartRate: value,
      checkoutRate,
      paymentSuccessRate,
      productPrice,
      avgOrderValue,
      profitMargin,
      repeatPurchaseRate,
      upsellRate,
      seasonalMultiplier
    });
  };

  const handleCheckoutRateChange = (value: string) => {
    setCheckoutRate(value);
    notifySettingsChange({
      budget,
      cpc,
      landingPageCtr,
      productViewRate,
      addToCartRate,
      checkoutRate: value,
      paymentSuccessRate,
      productPrice,
      avgOrderValue,
      profitMargin,
      repeatPurchaseRate,
      upsellRate,
      seasonalMultiplier
    });
  };

  const handlePaymentSuccessRateChange = (value: string) => {
    setPaymentSuccessRate(value);
    notifySettingsChange({
      budget,
      cpc,
      landingPageCtr,
      productViewRate,
      addToCartRate,
      checkoutRate,
      paymentSuccessRate: value,
      productPrice,
      avgOrderValue,
      profitMargin,
      repeatPurchaseRate,
      upsellRate,
      seasonalMultiplier
    });
  };

  const handleProductPriceChange = (value: string) => {
    setProductPrice(value);
    notifySettingsChange({
      budget,
      cpc,
      landingPageCtr,
      productViewRate,
      addToCartRate,
      checkoutRate,
      paymentSuccessRate,
      productPrice: value,
      avgOrderValue,
      profitMargin,
      repeatPurchaseRate,
      upsellRate,
      seasonalMultiplier
    });
  };

  const handleAvgOrderValueChange = (value: string) => {
    setAvgOrderValue(value);
    notifySettingsChange({
      budget,
      cpc,
      landingPageCtr,
      productViewRate,
      addToCartRate,
      checkoutRate,
      paymentSuccessRate,
      productPrice,
      avgOrderValue: value,
      profitMargin,
      repeatPurchaseRate,
      upsellRate,
      seasonalMultiplier
    });
  };

  const handleProfitMarginChange = (value: string) => {
    setProfitMargin(value);
    notifySettingsChange({
      budget,
      cpc,
      landingPageCtr,
      productViewRate,
      addToCartRate,
      checkoutRate,
      paymentSuccessRate,
      productPrice,
      avgOrderValue,
      profitMargin: value,
      repeatPurchaseRate,
      upsellRate,
      seasonalMultiplier
    });
  };

  const handleRepeatPurchaseRateChange = (value: string) => {
    setRepeatPurchaseRate(value);
    notifySettingsChange({
      budget,
      cpc,
      landingPageCtr,
      productViewRate,
      addToCartRate,
      checkoutRate,
      paymentSuccessRate,
      productPrice,
      avgOrderValue,
      profitMargin,
      repeatPurchaseRate: value,
      upsellRate,
      seasonalMultiplier
    });
  };

  const handleUpsellRateChange = (value: string) => {
    setUpsellRate(value);
    notifySettingsChange({
      budget,
      cpc,
      landingPageCtr,
      productViewRate,
      addToCartRate,
      checkoutRate,
      paymentSuccessRate,
      productPrice,
      avgOrderValue,
      profitMargin,
      repeatPurchaseRate,
      upsellRate: value,
      seasonalMultiplier
    });
  };

  const handleSeasonalMultiplierChange = (value: string) => {
    setSeasonalMultiplier(value);
    notifySettingsChange({
      budget,
      cpc,
      landingPageCtr,
      productViewRate,
      addToCartRate,
      checkoutRate,
      paymentSuccessRate,
      productPrice,
      avgOrderValue,
      profitMargin,
      repeatPurchaseRate,
      upsellRate,
      seasonalMultiplier: value
    });
  };

  useEffect(() => {
    calculateResults();
  }, [budget, cpc, landingPageCtr, productViewRate, addToCartRate, checkoutRate, 
      paymentSuccessRate, productPrice, avgOrderValue, profitMargin, repeatPurchaseRate, 
      upsellRate, seasonalMultiplier]);

  const calculateResults = () => {
    const budgetNum = currencyStringToNumber(budget);
    const cpcNum = currencyStringToNumber(cpc) || 1;
    const landingPageCtrNum = percentageStringToNumber(landingPageCtr);
    const productViewRateNum = percentageStringToNumber(productViewRate);
    const addToCartRateNum = percentageStringToNumber(addToCartRate);
    const checkoutRateNum = percentageStringToNumber(checkoutRate);
    const paymentSuccessRateNum = percentageStringToNumber(paymentSuccessRate);
    const productPriceNum = currencyStringToNumber(productPrice);
    const avgOrderValueNum = currencyStringToNumber(avgOrderValue);
    const profitMarginNum = percentageStringToNumber(profitMargin);
    const repeatPurchaseRateNum = percentageStringToNumber(repeatPurchaseRate);
    const upsellRateNum = percentageStringToNumber(upsellRate);
    const seasonalMultiplierNum = floatStringToNumber(seasonalMultiplier) || 1;

    // Calculate sales funnel
    const clicks = Math.floor(budgetNum / cpcNum);
    const productViews = Math.floor(clicks * (productViewRateNum / 100));
    const addToCarts = Math.floor(productViews * (addToCartRateNum / 100));
    const checkoutStarted = Math.floor(addToCarts * (checkoutRateNum / 100));
    const successfulOrders = Math.floor(checkoutStarted * (paymentSuccessRateNum / 100) * seasonalMultiplierNum);
    
    // Calculate revenue
    const totalRevenue = successfulOrders * avgOrderValueNum;
    const grossProfit = totalRevenue * (profitMarginNum / 100);
    const netProfit = grossProfit - budgetNum;
    
    // Calculate costs
    const costPerClick = clicks > 0 ? budgetNum / clicks : 0;
    const costPerView = productViews > 0 ? budgetNum / productViews : 0;
    const costPerCart = addToCarts > 0 ? budgetNum / addToCarts : 0;
    const costPerOrder = successfulOrders > 0 ? budgetNum / successfulOrders : 0;
    const customerAcquisitionCost = costPerOrder;
    
    // Calculate business metrics
    const returnOnAdSpend = budgetNum > 0 ? totalRevenue / budgetNum : 0;
    const customerLifetimeValue = avgOrderValueNum * (1 + (repeatPurchaseRateNum / 100) * 2.5) * (1 + (upsellRateNum / 100));
    const clvToCacRatio = customerAcquisitionCost > 0 ? customerLifetimeValue / customerAcquisitionCost : 0;
    const breakEvenOrders = grossProfit > 0 ? Math.ceil(budgetNum / (avgOrderValueNum * (profitMarginNum / 100))) : 0;
    const monthlyRevenue = totalRevenue * seasonalMultiplierNum;

    setResults({
      clicks,
      productViews,
      addToCarts,
      checkoutStarted,
      successfulOrders,
      totalRevenue,
      grossProfit,
      netProfit,
      costPerClick,
      costPerView,
      costPerCart,
      costPerOrder,
      customerAcquisitionCost,
      returnOnAdSpend,
      customerLifetimeValue,
      clvToCacRatio,
      breakEvenOrders,
      monthlyRevenue
    });
  };

  const handleResetSales = () => {
    setBudget('');
    setCpc('');
    setLandingPageCtr('');
    setProductViewRate('');
    setAddToCartRate('');
    setCheckoutRate('');
    setPaymentSuccessRate('');
    setProductPrice('');
    setAvgOrderValue('');
    setProfitMargin('');
    setRepeatPurchaseRate('');
    setUpsellRate('');
    setSeasonalMultiplier('1');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('pages.calculator.sales.title', 'Sales Campaign Calculator')}
        </h2>
        <div className="flex items-center gap-2">
          <SalesTemplateManager
            currentSettings={{
              budget,
              cpc,
              landingPageCtr,
              productViewRate,
              addToCartRate,
              checkoutRate,
              paymentSuccessRate,
              productPrice,
              avgOrderValue,
              profitMargin,
              repeatPurchaseRate,
              upsellRate,
              seasonalMultiplier
            }}
            onLoadTemplate={(settings) => {
              isSyncingFromPropsRef.current = true;
              setBudget(normalizeCurrencyValue(settings.budget));
              setCpc(normalizeCurrencyValue(settings.cpc));
              setLandingPageCtr(normalizePercentageValue(settings.landingPageCtr));
              setProductViewRate(normalizePercentageValue(settings.productViewRate));
              setAddToCartRate(normalizePercentageValue(settings.addToCartRate));
              setCheckoutRate(normalizePercentageValue(settings.checkoutRate));
              setPaymentSuccessRate(normalizePercentageValue(settings.paymentSuccessRate));
              setProductPrice(normalizeCurrencyValue(settings.productPrice));
              setAvgOrderValue(normalizeCurrencyValue(settings.avgOrderValue));
              setProfitMargin(normalizePercentageValue(settings.profitMargin));
              setRepeatPurchaseRate(normalizePercentageValue(settings.repeatPurchaseRate));
              setUpsellRate(normalizePercentageValue(settings.upsellRate));
              setSeasonalMultiplier(normalizeFloatValue(settings.seasonalMultiplier || '1'));
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  isSyncingFromPropsRef.current = false;
                });
              });
            }}
          />
          <Button variant="outline" size="sm" onClick={handleResetSales}>
            {t('pages.calculator.sales.reset', 'Reset Sales')}
          </Button>
        </div>
      </div>

      {/* Header with Estimated Result */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">
          {t('pages.calculator.sales.resultEstimation', 'Sales Campaign Result Estimation')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">
              {t('pages.calculator.sales.estimatedOrders', 'Estimated Orders')}
            </h3>
            <div className="text-4xl font-bold text-blue-600">{formatNumber(results.successfulOrders)}</div>
          </div>
          <div className="bg-green-50 border-2 border-dashed border-green-300 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">
              {t('pages.calculator.sales.totalRevenue', 'Total Revenue')}
            </h3>
            <div className="text-4xl font-bold text-green-600">{formatCurrency(results.totalRevenue)}</div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatDecimal(results.returnOnAdSpend)}x</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {t('pages.calculator.sales.costPerOrder', 'Cost Per Order')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(results.costPerOrder)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">CLV/CAC Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatDecimal(results.clvToCacRatio)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {t('pages.calculator.sales.netProfit', 'Net Profit')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(results.netProfit)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">
            {t('pages.calculator.sales.tabs.basic', 'Basic Settings')}
          </TabsTrigger>
          <TabsTrigger value="advanced">
            {t('pages.calculator.sales.tabs.advanced', 'Advanced Metrics')}
          </TabsTrigger>
          <TabsTrigger value="analysis">
            {t('pages.calculator.sales.tabs.analysis', 'Analysis')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Marketing KPIs */}
            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {t('pages.calculator.sales.marketingKPI', 'Marketing KPIs')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="budget">
                    {t('pages.calculator.sales.budget', 'Budget (Rp)')}
                  </Label>
                  <Input
                    id="budget"
                    type="text"
                    value={formatCurrencyDisplay(budget)}
                    onChange={(e) => handleBudgetChange(normalizeCurrencyValue(e.target.value))}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="cpc">
                    {t('pages.calculator.sales.cpc', 'Cost per Click (Rp)')}
                  </Label>
                  <Input
                    id="cpc"
                    type="text"
                    value={formatCurrencyDisplay(cpc)}
                    onChange={(e) => handleCpcChange(normalizeCurrencyValue(e.target.value))}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="ctr">
                    {t('pages.calculator.sales.landingPageCtr', 'Landing Page CTR (%)')}
                  </Label>
                  <PercentageInputField
                    id="ctr"
                    value={landingPageCtr}
                    onValueChange={handleLandingPageCtrChange}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sales Funnel Conversion Rates */}
            <Card className="bg-red-50">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {t('pages.calculator.sales.salesFunnel', 'Sales Funnel Conversion Rates')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="productView">
                    {t('pages.calculator.sales.productViewRate', 'Landing to Product View (%)')}
                  </Label>
                  <PercentageInputField
                    id="productView"
                    value={productViewRate}
                    onValueChange={handleProductViewRateChange}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="addCart">
                    {t('pages.calculator.sales.addToCartRate', 'Product View to Add Cart (%)')}
                  </Label>
                  <PercentageInputField
                    id="addCart"
                    value={addToCartRate}
                    onValueChange={handleAddToCartRateChange}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="checkout">
                    {t('pages.calculator.sales.checkoutRate', 'Cart to Checkout (%)')}
                  </Label>
                  <PercentageInputField
                    id="checkout"
                    value={checkoutRate}
                    onValueChange={handleCheckoutRateChange}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="payment">
                    {t('pages.calculator.sales.paymentSuccessRate', 'Payment Success Rate (%)')}
                  </Label>
                  <PercentageInputField
                    id="payment"
                    value={paymentSuccessRate}
                    onValueChange={handlePaymentSuccessRateChange}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product & Revenue */}
            <Card className="bg-green-50">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {t('pages.calculator.sales.productRevenue', 'Product & Revenue')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="productPrice">
                    {t('pages.calculator.sales.productPrice', 'Product Price (Rp)')}
                  </Label>
                  <Input
                    id="productPrice"
                    type="text"
                    value={formatCurrencyDisplay(productPrice)}
                    onChange={(e) => handleProductPriceChange(normalizeCurrencyValue(e.target.value))}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="aov">
                    {t('pages.calculator.sales.avgOrderValue', 'Average Order Value (Rp)')}
                  </Label>
                  <Input
                    id="aov"
                    type="text"
                    value={formatCurrencyDisplay(avgOrderValue)}
                    onChange={(e) => handleAvgOrderValueChange(normalizeCurrencyValue(e.target.value))}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="margin">
                    {t('pages.calculator.sales.profitMargin', 'Profit Margin (%)')}
                  </Label>
                  <PercentageInputField
                    id="margin"
                    value={profitMargin}
                    onValueChange={handleProfitMarginChange}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="seasonal">
                    {t('pages.calculator.sales.seasonalMultiplier', 'Seasonal Multiplier')}
                  </Label>
                  <Input
                    id="seasonal"
                    type="text"
                    value={seasonalMultiplier}
                    onChange={(e) => handleSeasonalMultiplierChange(normalizeFloatValue(e.target.value))}
                    className="mt-1"
                    placeholder="1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-purple-50">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {t('pages.calculator.sales.customerBehavior', 'Customer Behavior')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="repeat">
                    {t('pages.calculator.sales.repeatPurchaseRate', 'Repeat Purchase Rate (%)')}
                  </Label>
                  <PercentageInputField
                    id="repeat"
                    value={repeatPurchaseRate}
                    onValueChange={handleRepeatPurchaseRateChange}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="upsell">
                    {t('pages.calculator.sales.upsellRate', 'Upselling/Cross-selling Rate (%)')}
                  </Label>
                  <PercentageInputField
                    id="upsell"
                    value={upsellRate}
                    onValueChange={handleUpsellRateChange}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {t('pages.calculator.sales.advancedMetrics', 'Advanced Metrics')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-white rounded border">
                  <div className="text-sm font-medium">
                    {t('pages.calculator.sales.customerLifetimeValue', 'Customer Lifetime Value')}
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(results.customerLifetimeValue)}</div>
                </div>
                <div className="p-3 bg-white rounded border">
                  <div className="text-sm font-medium">
                    {t('pages.calculator.sales.breakEvenOrders', 'Break-even Orders')}
                  </div>
                  <div className="text-xl font-bold">{formatNumber(results.breakEvenOrders)}</div>
                </div>
                <div className="p-3 bg-white rounded border">
                  <div className="text-sm font-medium">
                    {t('pages.calculator.sales.monthlyRevenue', 'Monthly Revenue Projection')}
                  </div>
                  <div className="text-xl font-bold">{formatCurrency(results.monthlyRevenue)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          {/* Sales Funnel Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t('pages.calculator.sales.salesFunnelAnalysis', 'Sales Funnel Analysis')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-blue-500 mr-2">🎯</span>
                    <span>
                      {applyVariables(t('pages.calculator.sales.analysis.clicks', 'Your ads will generate {{clicks}} clicks from the current budget'), {
                        clicks: formatNumber(results.clicks)
                      })}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-500 mr-2">👀</span>
                    <span>
                      {applyVariables(t('pages.calculator.sales.analysis.productViews', 'Expected product page views: {{views}} visitors'), {
                        views: formatNumber(results.productViews)
                      })}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-500 mr-2">🛒</span>
                    <span>
                      {applyVariables(t('pages.calculator.sales.analysis.addToCarts', 'Visitors who will add products to cart: {{carts}} people'), {
                        carts: formatNumber(results.addToCarts)
                      })}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-500 mr-2">💳</span>
                    <span>
                      {applyVariables(t('pages.calculator.sales.analysis.checkoutStarted', 'Customers who will start checkout: {{checkouts}} people'), {
                        checkouts: formatNumber(results.checkoutStarted)
                      })}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    <span>
                      {applyVariables(t('pages.calculator.sales.analysis.successfulOrders', 'Successful orders: {{orders}} orders'), {
                        orders: formatNumber(results.successfulOrders)
                      })}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">💰</span>
                    <span>
                      {applyVariables(t('pages.calculator.sales.analysis.totalRevenue', 'Total revenue generated: {{revenue}}'), {
                        revenue: formatCurrency(results.totalRevenue)
                      })}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 border-l pl-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">📱</span>
                    <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                      {formatNumber(results.clicks)} {'>'} CLICKS
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">👁️</span>
                    <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                      {formatNumber(results.productViews)} {'>'} PRODUCT VIEWS
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">🛒</span>
                    <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                      {formatNumber(results.addToCarts)} {'>'} ADD TO CART
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">💳</span>
                    <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                      {formatNumber(results.checkoutStarted)} {'>'} CHECKOUT
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">✅</span>
                    <div className="bg-green-100 px-3 py-1 rounded text-sm font-medium">
                      {formatNumber(results.successfulOrders)} {'>'} ORDERS
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">💰</span>
                    <div className="bg-green-200 px-3 py-1 rounded text-sm font-medium">
                      {formatCurrency(results.totalRevenue)} {'>'} REVENUE
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="bg-blue-50 mt-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t('pages.calculator.sales.optimizationRecommendations', 'Optimization Recommendations')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-1">💡</span>
                  <span>
                    <strong>{t('pages.calculator.sales.recommendations.productPage', 'Product Page Optimization:')}</strong>{' '}
                    {t('pages.calculator.sales.recommendations.productPageDesc', 'Improve product images, descriptions, and social proof to increase conversion rate')}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-1">💡</span>
                  <span>
                    <strong>{t('pages.calculator.sales.recommendations.cartAbandonment', 'Cart Abandonment:')}</strong>{' '}
                    {t('pages.calculator.sales.recommendations.cartAbandonmentDesc', 'Implement email retargeting and exit-intent popups to recover abandoned carts')}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-1">💡</span>
                  <span>
                    <strong>{t('pages.calculator.sales.recommendations.checkoutOptimization', 'Checkout Optimization:')}</strong>{' '}
                    {t('pages.calculator.sales.recommendations.checkoutOptimizationDesc', 'Simplify checkout process and offer multiple payment options to reduce drop-offs')}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-1">💡</span>
                  <span>
                    <strong>{t('pages.calculator.sales.recommendations.upsellingStrategy', 'Upselling Strategy:')}</strong>{' '}
                    {t('pages.calculator.sales.recommendations.upsellingStrategyDesc', 'Implement product recommendations and bundle offers to increase average order value')}
                  </span>
                </div>
                {results.clvToCacRatio < 3 && (
                  <div className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">⚠️</span>
                    <span>
                      <strong>{t('pages.calculator.sales.recommendations.warning', 'Warning:')}</strong>{' '}
                      {t('pages.calculator.sales.recommendations.clvCacWarning', 'Your CLV/CAC ratio is below 3:1. Consider improving customer retention or reducing acquisition costs')}
                    </span>
                  </div>
                )}
                {results.returnOnAdSpend < 2 && (
                  <div className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">⚠️</span>
                    <span>
                      <strong>{t('pages.calculator.sales.recommendations.warning', 'Warning:')}</strong>{' '}
                      {t('pages.calculator.sales.recommendations.roasWarning', 'Your ROAS is below 2x. Consider optimizing your campaigns or improving conversion rates')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesCalculator;

