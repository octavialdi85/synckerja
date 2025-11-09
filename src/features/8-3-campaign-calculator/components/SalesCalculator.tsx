
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';

const SalesCalculator = () => {
  // Basic Marketing KPIs
  const [budget, setBudget] = useState<string>('');
  const [cpc, setCpc] = useState<string>('');
  const [landingPageCtr, setLandingPageCtr] = useState<string>('');
  
  // Sales Funnel Conversion Rates
  const [productViewRate, setProductViewRate] = useState<string>('');
  const [addToCartRate, setAddToCartRate] = useState<string>('');
  const [checkoutRate, setCheckoutRate] = useState<string>('');
  const [paymentSuccessRate, setPaymentSuccessRate] = useState<string>('');
  
  // Product & Revenue KPIs
  const [productPrice, setProductPrice] = useState<string>('');
  const [avgOrderValue, setAvgOrderValue] = useState<string>('');
  const [profitMargin, setProfitMargin] = useState<string>('');
  
  // Advanced Metrics
  const [repeatPurchaseRate, setRepeatPurchaseRate] = useState<string>('');
  const [upsellRate, setUpsellRate] = useState<string>('');
  const [seasonalMultiplier, setSeasonalMultiplier] = useState<string>('');
  
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

  useEffect(() => {
    calculateResults();
  }, [budget, cpc, landingPageCtr, productViewRate, addToCartRate, checkoutRate, 
      paymentSuccessRate, productPrice, avgOrderValue, profitMargin, repeatPurchaseRate, 
      upsellRate, seasonalMultiplier]);

  const calculateResults = () => {
    const budgetNum = parseFloat(budget.replace(/[^\d]/g, '')) || 0;
    const cpcNum = parseFloat(cpc.replace(/[^\d]/g, '')) || 1;
    const landingPageCtrNum = parseFloat(landingPageCtr) || 0;
    const productViewRateNum = parseFloat(productViewRate) || 0;
    const addToCartRateNum = parseFloat(addToCartRate) || 0;
    const checkoutRateNum = parseFloat(checkoutRate) || 0;
    const paymentSuccessRateNum = parseFloat(paymentSuccessRate) || 0;
    const productPriceNum = parseFloat(productPrice.replace(/[^\d]/g, '')) || 0;
    const avgOrderValueNum = parseFloat(avgOrderValue.replace(/[^\d]/g, '')) || 0;
    const profitMarginNum = parseFloat(profitMargin) || 0;
    const repeatPurchaseRateNum = parseFloat(repeatPurchaseRate) || 0;
    const upsellRateNum = parseFloat(upsellRate) || 0;
    const seasonalMultiplierNum = parseFloat(seasonalMultiplier) || 1;

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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDecimal = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      {/* Header with Estimated Result */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Sales Campaign Result Estimation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Estimated Orders</h3>
            <div className="text-4xl font-bold text-blue-600">{formatNumber(results.successfulOrders)}</div>
          </div>
          <div className="bg-green-50 border-2 border-dashed border-green-300 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
            <div className="text-4xl font-bold text-green-600">{formatCurrency(results.totalRevenue)}</div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg text-center">
          <div className="text-sm font-medium mb-2">ROAS</div>
          <div className="text-lg font-bold">{formatDecimal(results.returnOnAdSpend)}x</div>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg text-center">
          <div className="text-sm font-medium mb-2">Cost Per Order</div>
          <div className="text-lg font-bold">{formatCurrency(results.costPerOrder)}</div>
        </div>
        <div className="bg-green-100 p-4 rounded-lg text-center">
          <div className="text-sm font-medium mb-2">CLV/CAC Ratio</div>
          <div className="text-lg font-bold">{formatDecimal(results.clvToCacRatio)}</div>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg text-center">
          <div className="text-sm font-medium mb-2">Net Profit</div>
          <div className="text-lg font-bold">{formatCurrency(results.netProfit)}</div>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Metrics</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Marketing KPIs */}
            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle>Marketing KPIs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="budget">Budget (Rp)</Label>
                  <Input
                    id="budget"
                    type="text"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="cpc">Cost per Click (Rp)</Label>
                  <Input
                    id="cpc"
                    type="text"
                    value={cpc}
                    onChange={(e) => setCpc(e.target.value)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="ctr">Landing Page CTR (%)</Label>
                  <Input
                    id="ctr"
                    type="text"
                    value={landingPageCtr}
                    onChange={(e) => setLandingPageCtr(e.target.value)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sales Funnel Conversion Rates */}
            <Card className="bg-red-50">
              <CardHeader>
                <CardTitle>Sales Funnel Conversion Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="productView">Landing to Product View (%)</Label>
                  <Input
                    id="productView"
                    type="text"
                    value={productViewRate}
                    onChange={(e) => setProductViewRate(e.target.value)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="addCart">Product View to Add Cart (%)</Label>
                  <Input
                    id="addCart"
                    type="text"
                    value={addToCartRate}
                    onChange={(e) => setAddToCartRate(e.target.value)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="checkout">Cart to Checkout (%)</Label>
                  <Input
                    id="checkout"
                    type="text"
                    value={checkoutRate}
                    onChange={(e) => setCheckoutRate(e.target.value)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="payment">Payment Success Rate (%)</Label>
                  <Input
                    id="payment"
                    type="text"
                    value={paymentSuccessRate}
                    onChange={(e) => setPaymentSuccessRate(e.target.value)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product & Revenue */}
            <Card className="bg-green-50">
              <CardHeader>
                <CardTitle>Product & Revenue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="productPrice">Product Price (Rp)</Label>
                  <Input
                    id="productPrice"
                    type="text"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="aov">Average Order Value (Rp)</Label>
                  <Input
                    id="aov"
                    type="text"
                    value={avgOrderValue}
                    onChange={(e) => setAvgOrderValue(e.target.value)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="margin">Profit Margin (%)</Label>
                  <Input
                    id="margin"
                    type="text"
                    value={profitMargin}
                    onChange={(e) => setProfitMargin(e.target.value)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="seasonal">Seasonal Multiplier</Label>
                  <Input
                    id="seasonal"
                    type="text"
                    value={seasonalMultiplier}
                    onChange={(e) => setSeasonalMultiplier(e.target.value)}
                    className="mt-1"
                    placeholder="0"
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
                <CardTitle>Customer Behavior</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="repeat">Repeat Purchase Rate (%)</Label>
                  <Input
                    id="repeat"
                    type="text"
                    value={repeatPurchaseRate}
                    onChange={(e) => setRepeatPurchaseRate(e.target.value)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="upsell">Upselling/Cross-selling Rate (%)</Label>
                  <Input
                    id="upsell"
                    type="text"
                    value={upsellRate}
                    onChange={(e) => setUpsellRate(e.target.value)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50">
              <CardHeader>
                <CardTitle>Advanced Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-white rounded border">
                  <div className="text-sm font-medium">Customer Lifetime Value</div>
                  <div className="text-xl font-bold">{formatCurrency(results.customerLifetimeValue)}</div>
                </div>
                <div className="p-3 bg-white rounded border">
                  <div className="text-sm font-medium">Break-even Orders</div>
                  <div className="text-xl font-bold">{formatNumber(results.breakEvenOrders)}</div>
                </div>
                <div className="p-3 bg-white rounded border">
                  <div className="text-sm font-medium">Monthly Revenue Projection</div>
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
              <CardTitle>Sales Funnel Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-blue-500 mr-2">🎯</span>
                    <span>Your ads will generate {formatNumber(results.clicks)} clicks from the current budget</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-500 mr-2">👀</span>
                    <span>Expected product page views: {formatNumber(results.productViews)} visitors</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-500 mr-2">🛒</span>
                    <span>Visitors who will add products to cart: {formatNumber(results.addToCarts)} people</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-500 mr-2">💳</span>
                    <span>Customers who will start checkout: {formatNumber(results.checkoutStarted)} people</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    <span>Successful orders: {formatNumber(results.successfulOrders)} orders</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">💰</span>
                    <span>Total revenue generated: {formatCurrency(results.totalRevenue)}</span>
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
              <CardTitle>Optimization Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-1">💡</span>
                  <span><strong>Product Page Optimization:</strong> Improve product images, descriptions, and social proof to increase conversion rate</span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-1">💡</span>
                  <span><strong>Cart Abandonment:</strong> Implement email retargeting and exit-intent popups to recover abandoned carts</span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-1">💡</span>
                  <span><strong>Checkout Optimization:</strong> Simplify checkout process and offer multiple payment options to reduce drop-offs</span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-1">💡</span>
                  <span><strong>Upselling Strategy:</strong> Implement product recommendations and bundle offers to increase average order value</span>
                </div>
                {results.clvToCacRatio < 3 && (
                  <div className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">⚠️</span>
                    <span><strong>Warning:</strong> Your CLV/CAC ratio is below 3:1. Consider improving customer retention or reducing acquisition costs</span>
                  </div>
                )}
                {results.returnOnAdSpend < 2 && (
                  <div className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">⚠️</span>
                    <span><strong>Warning:</strong> Your ROAS is below 2x. Consider optimizing your campaigns or improving conversion rates</span>
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
