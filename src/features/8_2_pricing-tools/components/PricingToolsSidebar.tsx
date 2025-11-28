import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Separator } from '@/features/ui/separator';
import { Calculator, TrendingUp, BookOpen } from 'lucide-react';
import { PriceCalculatorTutorial } from './PriceCalculatorTutorial';

interface PricingToolsSidebarProps {
  calculationResults?: {
    sellingPrice?: number;
    profit?: number;
    profitMargin?: number;
    markup?: number;
  } | null;
}

export const PricingToolsSidebar = ({ calculationResults }: PricingToolsSidebarProps) => {
  return (
    <div className="h-full flex flex-col">
      <div className="h-full flex flex-col space-y-2">
        {/* Calculation Results Card */}
        <Card className="flex-shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calculationResults ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-center">
                    <p className="text-sm text-blue-600 font-medium">Recommended Selling Price</p>
                    <p className="text-2xl font-bold text-blue-700">
                      Rp {calculationResults.sellingPrice?.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-green-600 font-medium">Profit Amount</p>
                    <p className="text-lg font-bold text-green-700">
                      Rp {calculationResults.profit?.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-purple-600 font-medium">Profit Margin</p>
                    <p className="text-lg font-bold text-purple-700">
                      {calculationResults.profitMargin}%
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Price by Channel:</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">Online Marketplace</span>
                      <span className="font-medium">Rp 175,000</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">Offline Store</span>
                      <span className="font-medium">Rp 155,000</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calculator className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm">Enter costs and click calculate to see results</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="flex-shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              Save Calculation
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              Export to Excel
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              Share Results
            </Button>
          </CardContent>
        </Card>

        {/* Tutorial Section */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto seamless-scroll">
            <PriceCalculatorTutorial />
          </div>
        </div>
      </div>
    </div>
  );
};

