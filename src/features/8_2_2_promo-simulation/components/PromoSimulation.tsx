
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Button } from '@/features/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Badge } from '@/features/ui/badge';
import { Separator } from '@/features/ui/separator';
import { Percent, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

export const PromoSimulation = () => {
  const [simulationResults, setSimulationResults] = useState<any>(null);

  const runSimulation = () => {
    // Mock simulation for demo
    const mockResults = {
      originalPrice: 150000,
      discountedPrice: 120000,
      originalProfit: 50000,
      newProfit: 20000,
      profitReduction: 60,
      breakEvenUnits: 25,
      recommendedDiscount: 15
    };
    setSimulationResults(mockResults);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Input Section */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Percent className="h-5 w-5 text-red-600" />
              Promotion Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base-price" className="text-sm font-medium">Base Selling Price</Label>
                <Input 
                  id="base-price" 
                  type="number" 
                  placeholder="150000" 
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="production-cost" className="text-sm font-medium">Production Cost</Label>
                <Input 
                  id="production-cost" 
                  type="number" 
                  placeholder="100000" 
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="discount-type" className="text-sm font-medium">Discount Type</Label>
                <Select>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="bogo">Buy One Get One</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="discount-value" className="text-sm font-medium">Discount Value</Label>
                <Input 
                  id="discount-value" 
                  type="number" 
                  placeholder="20" 
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="promo-duration" className="text-sm font-medium">Duration (days)</Label>
                <Input 
                  id="promo-duration" 
                  type="number" 
                  placeholder="7" 
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Sales Channel Impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium">Online Marketplace</span>
                  <Badge variant="outline">15% fees</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Commission (10%):</span>
                    <span className="text-red-600">-Rp 12,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Payment fee (3%):</span>
                    <span className="text-red-600">-Rp 3,600</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Ad spend (2%):</span>
                    <span className="text-red-600">-Rp 2,400</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Net after fees:</span>
                    <span>Rp 102,000</span>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium">Offline Store</span>
                  <Badge variant="outline">5% fees</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Store rental (3%):</span>
                    <span className="text-red-600">-Rp 3,600</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Staff cost (2%):</span>
                    <span className="text-red-600">-Rp 2,400</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Net after fees:</span>
                    <span>Rp 114,000</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Volume Projections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="current-volume" className="text-sm font-medium">Current Daily Sales</Label>
                <Input 
                  id="current-volume" 
                  type="number" 
                  placeholder="10" 
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="expected-increase" className="text-sm font-medium">Expected Increase (%)</Label>
                <Input 
                  id="expected-increase" 
                  type="number" 
                  placeholder="50" 
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={runSimulation} className="w-full">
                  Run Simulation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Simulation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {simulationResults ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-blue-600 font-medium">Original Price</p>
                    <p className="text-lg font-bold text-blue-700">
                      Rp {simulationResults.originalPrice.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-red-600 font-medium">Promo Price</p>
                    <p className="text-lg font-bold text-red-700">
                      Rp {simulationResults.discountedPrice.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Original Profit/Unit:</span>
                    <span className="font-medium text-green-600">
                      Rp {simulationResults.originalProfit.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">New Profit/Unit:</span>
                    <span className="font-medium text-red-600">
                      Rp {simulationResults.newProfit.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Profit Reduction:</span>
                    <Badge variant="destructive">
                      -{simulationResults.profitReduction}%
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Break-even Analysis</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Need to sell <strong>{simulationResults.breakEvenUnits} units</strong> to maintain total profit
                  </p>
                </div>

                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Recommendation</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Optimal discount: <strong>{simulationResults.recommendedDiscount}%</strong> for maximum revenue
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Percent className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm">Set up promotion details and run simulation</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Channel Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {simulationResults && (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                  <span className="text-sm font-medium">Online Net Profit:</span>
                  <span className="font-bold text-blue-700">Rp 2,000</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span className="text-sm font-medium">Offline Net Profit:</span>
                  <span className="font-bold text-green-700">Rp 14,000</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  * After deducting all fees and costs
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
