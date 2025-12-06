import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { AlertTriangle, TrendingUp, Target, DollarSign, Package } from 'lucide-react';
import { Separator } from '@/features/ui/separator';
import { PricingCalculationResult, TimePeriod } from '../types/pricingTypes';
import { formatRupiah, formatNumber, MarketingRecommendation } from '../utils/pricingUtils';

interface TargetCalculationResultsProps {
  results: PricingCalculationResult;
  timePeriod: TimePeriod;
  breakEvenRecommendation?: MarketingRecommendation | null;
  targetProfitRecommendation?: MarketingRecommendation | null;
  targetROAS?: number;
  isPreliminary?: boolean;
  currentStep?: number;
  targetProfitPercent?: number;
}

export const TargetCalculationResults = ({ 
  results, 
  timePeriod,
  breakEvenRecommendation,
  targetProfitRecommendation,
  targetROAS,
  isPreliminary = false,
  currentStep = 1,
  targetProfitPercent,
}: TargetCalculationResultsProps) => {
  const { breakEven, targetProfit, warnings, summary } = results;

  return (
    <div className="space-y-4">
      {/* Warnings */}
      {warnings.lowMargin && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-orange-800 mb-1">Low Margin Warning</p>
                <p className="text-sm text-orange-700">{warnings.lowMarginMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {warnings.unrealisticTarget && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800 mb-1">Unrealistic Target</p>
                <p className="text-sm text-red-700">{warnings.unrealisticTarget}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Break-Even Analysis - Simplified */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-blue-600" />
            Break-Even Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-700 mb-1">Units Required</div>
              <p className="text-xl font-bold text-blue-800">
                {breakEven.unitsRequired === Infinity ? '∞' : formatNumber(breakEven.unitsRequired)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {timePeriod === 'monthly' ? 'unit/bulan' : 'unit/tahun'}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-xs text-green-700 mb-1">Revenue Required</div>
              <p className="text-xl font-bold text-green-800">
                {breakEven.revenueRequired === Infinity ? '∞' : formatRupiah(breakEven.revenueRequired)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {timePeriod === 'monthly' ? 'target/bulan' : 'target/tahun'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Profit Analysis - Simplified */}
      {targetProfit && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Target Profit Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-xs text-purple-700 mb-1">Units Required</div>
                <p className="text-xl font-bold text-purple-800">
                  {targetProfit.unitsRequired === Infinity ? '∞' : formatNumber(targetProfit.unitsRequired)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {timePeriod === 'monthly' ? 'unit/bulan' : 'unit/tahun'}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-xs text-purple-700 mb-1">Revenue Required</div>
                <p className="text-xl font-bold text-purple-800">
                  {targetProfit.revenueRequired === Infinity ? '∞' : formatRupiah(targetProfit.revenueRequired)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {timePeriod === 'monthly' ? 'target/bulan' : 'target/tahun'}
                </p>
                {/* Breakdown Detail - Simplified */}
                {targetProfitPercent && targetProfitPercent > 0 && (
                  <div className="mt-3 pt-3 border-t border-purple-200 space-y-1">
                    <div className="text-xs text-gray-600">
                      Breakdown:
                    </div>
                    <div className="text-xs text-gray-500 pl-2 space-y-0.5">
                      <div>Production Cost: {formatRupiah(targetProfit.productionCost)}</div>
                      <div>+ Operational Cost: {formatRupiah(targetProfit.operationalCost)}</div>
                      {targetProfit.channelFee > 0 && (
                        <div>+ Channel Fee: {formatRupiah(targetProfit.channelFee)}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 pl-2 pt-1">
                      + Target Profit ({targetProfitPercent}%): {formatRupiah(targetProfit.targetProfitAmount)}
                    </div>
                    <div className="text-xs text-purple-700 font-medium pt-1">
                      = Revenue Required: {formatRupiah(targetProfit.revenueRequired)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary - Simplified - Hide on step 6 (Final Summary) */}
      {currentStep !== 6 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Total Cost per Unit:</span>
              <span className="font-bold text-lg">{formatRupiah(results.totalCostPerUnit)}</span>
            </div>

            {summary.netProfitPerUnit !== undefined && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Net Profit per Unit:</span>
                <span className="font-semibold text-green-700">{formatRupiah(summary.netProfitPerUnit)}</span>
              </div>
            )}

            <Separator />

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-700">Selling Price:</span>
                <span className="text-lg font-bold text-blue-800">
                  {formatRupiah(summary.recommendedSellingPrice)}
                </span>
              </div>
              {summary.recommendedChannel && (
                <p className="text-xs text-blue-600 mt-1">
                  Best margin: <strong>{summary.recommendedChannel}</strong>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

