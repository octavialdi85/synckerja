
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Button } from '@/features/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Separator } from '@/features/ui/separator';
import { Badge } from '@/features/ui/badge';
import { Calculator, Package } from 'lucide-react';
import { DynamicCostBreakdown } from './DynamicCostBreakdown';

interface PriceCalculatorProps {
  onCalculate?: (results: any) => void;
}

export const PriceCalculator = ({ onCalculate }: PriceCalculatorProps) => {
  const [calculationMethod, setCalculationMethod] = useState('markup');

  const calculatePrice = () => {
    // Mock calculation for demo
    const mockResults = {
      sellingPrice: 150000,
      profit: 50000,
      profitMargin: 33.33,
      markup: 50
    };
    if (onCalculate) {
      onCalculate(mockResults);
    }
  };

  return (
    <div className="space-y-2">
        {/* Product Information Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-blue-600" />
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product-name" className="text-sm font-medium">Product Name</Label>
                <Input id="product-name" placeholder="Enter product name" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="product-category" className="text-sm font-medium">Category</Label>
                <Select>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Food & Beverage</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Cost Breakdown Card */}
        <DynamicCostBreakdown />

        {/* Pricing Method Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-5 w-5 text-purple-600" />
              Pricing Method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Calculation Method</Label>
                <Select value={calculationMethod} onValueChange={setCalculationMethod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markup">Markup Percentage</SelectItem>
                    <SelectItem value="margin">Profit Margin</SelectItem>
                    <SelectItem value="fixed">Fixed Profit Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price-calculator-value" className="text-sm font-medium">
                  {calculationMethod === 'markup' ? 'Markup %' : 
                   calculationMethod === 'margin' ? 'Margin %' : 'Profit Amount'}
                </Label>
                <Input 
                  id="price-calculator-value"
                  name="priceValue"
                  type="number" 
                  placeholder={calculationMethod === 'fixed' ? '0' : '0'} 
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium mb-2 block">Sales Channels</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">Online Marketplace</span>
                    <Badge variant="secondary">15% fee</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Commission:</span>
                      <span>10%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment fee:</span>
                      <span>3%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ad spend:</span>
                      <span>2%</span>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">Offline Store</span>
                    <Badge variant="secondary">5% fee</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Store rental:</span>
                      <span>3%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Staff cost:</span>
                      <span>2%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={calculatePrice} className="w-full" size="lg">
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Pricing
            </Button>
          </CardContent>
        </Card>
    </div>
  );
};
