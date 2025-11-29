import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { AlertTriangle, TrendingUp, Target, DollarSign, Package } from 'lucide-react';
import { Separator } from '@/features/ui/separator';
import { PricingCalculationResult, TimePeriod } from '../types/pricingTypes';
import { formatRupiah, formatNumber } from '../utils/pricingUtils';

interface TargetCalculationResultsProps {
  results: PricingCalculationResult;
  timePeriod: TimePeriod;
}

export const TargetCalculationResults = ({ results, timePeriod }: TargetCalculationResultsProps) => {
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

      {/* Break-Even Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-blue-600" />
            Break-Even Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* BREAKDOWN TOTAL EXPENSES UNTUK BREAK-EVEN */}
          {breakEven.totalExpenses !== undefined && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-3 space-y-2">
              <h5 className="text-sm font-semibold text-blue-800 mb-2">Breakdown Total Expenses:</h5>
              
              {breakEven.productionCost !== undefined && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700">• Biaya Produksi:</span>
                  <span className="font-semibold text-blue-800">
                    {formatRupiah(breakEven.productionCost)}
                  </span>
                </div>
              )}
              
              {breakEven.operationalCost !== undefined && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700">• Biaya Operasional:</span>
                  <span className="font-semibold text-blue-800">
                    {formatRupiah(breakEven.operationalCost)}
                  </span>
                </div>
              )}
              
              {breakEven.channelFee !== undefined && breakEven.channelFee > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700">• Biaya Sales Channel Fee:</span>
                  <span className="font-semibold text-blue-800">
                    {formatRupiah(breakEven.channelFee)}
                    {breakEven.revenueRequired > 0 && (
                      <span className="text-xs text-blue-600 ml-2">
                        ({((breakEven.channelFee / breakEven.revenueRequired) * 100).toFixed(2)}% dari Revenue Required)
                      </span>
                    )}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2 border-t-2 border-blue-300">
                <span className="text-sm font-semibold text-blue-800">Total Expenses:</span>
                <span className="text-base font-bold text-blue-800">
                  {formatRupiah(breakEven.totalExpenses)}
                </span>
              </div>
              
              <p className="text-xs text-blue-600 mt-1">
                Total Expenses = Biaya Produksi + Biaya Operasional + Biaya Sales Channel Fee
              </p>
              
              {/* BREAKDOWN PERHITUNGAN */}
              {breakEven.netProfitPerUnit !== undefined && breakEven.netProfitPerUnit > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <p className="text-xs text-blue-700 font-semibold mb-2">Perhitungan Break-Even:</p>
                  <div className="space-y-1 text-xs text-blue-600 bg-blue-100 p-2 rounded">
                    <p>• Net Profit per Unit (setelah channel fee): {formatRupiah(breakEven.netProfitPerUnit)}</p>
                    <p>• Break-Even Units = Total Expenses ÷ Net Profit per Unit</p>
                    <p>• Break-Even Units = {formatRupiah(breakEven.totalExpenses || 0)} ÷ {formatRupiah(breakEven.netProfitPerUnit)} = {formatNumber(breakEven.unitsRequired)} unit</p>
                    <p>• Break-Even Revenue = {formatNumber(breakEven.unitsRequired)} × {formatRupiah(summary.recommendedSellingPrice)} = {formatRupiah(breakEven.revenueRequired)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Units Required to Sell</span>
              </div>
              <p className="text-2xl font-bold text-blue-800">
                {breakEven.unitsRequired === Infinity ? '∞' : formatNumber(breakEven.unitsRequired)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {timePeriod === 'monthly' ? 'units (dalam 1 bulan)' : 'units'}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Revenue Required</span>
              </div>
              <p className="text-2xl font-bold text-green-800">
                {breakEven.revenueRequired === Infinity ? '∞' : formatRupiah(breakEven.revenueRequired)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {timePeriod === 'monthly' ? 'target untuk 1 bulan' : 'target untuk 1 tahun'}
              </p>
            </div>
          </div>

          {timePeriod === 'monthly' && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Target Penjualan:</strong> {formatNumber(breakEven.unitsRequired)} unit harus dijual dalam 1 bulan untuk mencapai break-even dengan expenses bulanan saat ini.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Profit Analysis */}
      {targetProfit && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Target Profit Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Breakdown: Total Cost dan Target Profit */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-3 space-y-3">
              <h5 className="text-sm font-semibold text-purple-800 mb-2">Breakdown Total Biaya:</h5>
              
              {/* Breakdown Production Cost */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-purple-700">• Biaya Produksi:</span>
                <span className="font-semibold text-purple-800">
                  {formatRupiah(targetProfit.productionCost)}
                </span>
              </div>
              
              {/* Breakdown Operational Cost */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-purple-700">• Biaya Operasional:</span>
                <span className="font-semibold text-purple-800">
                  {formatRupiah(targetProfit.operationalCost)}
                </span>
              </div>
              
              {/* Breakdown Channel Fee */}
              {targetProfit.channelFee > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-purple-700">• Biaya Sales Channel Fee:</span>
                  <span className="font-semibold text-purple-800">
                    {formatRupiah(targetProfit.channelFee)}
                    {targetProfit.revenueRequired > 0 && (
                      <span className="text-xs text-purple-600 ml-2">
                        ({((targetProfit.channelFee / targetProfit.revenueRequired) * 100).toFixed(2)}% dari Revenue Required)
                      </span>
                    )}
                  </span>
                </div>
              )}
              
              {/* Total Cost */}
              <div className="flex justify-between items-center pt-2 border-t-2 border-purple-300">
                <span className="text-sm font-semibold text-purple-800">Total Biaya:</span>
                <span className="text-base font-bold text-purple-800">
                  {formatRupiah(targetProfit.totalCost)}
                </span>
              </div>
              
              <p className="text-xs text-purple-600 mt-1">
                Total Biaya = Biaya Produksi + Biaya Operasional + Biaya Sales Channel Fee
              </p>
              
              {/* Target Profit Amount */}
              <div className="flex justify-between items-center pt-2 border-t border-purple-300">
                <span className="text-sm font-medium text-purple-700">Target Profit Amount:</span>
                <span className="text-lg font-bold text-purple-800">
                  {formatRupiah(targetProfit.targetProfitAmount)}
                </span>
              </div>
              
              {/* Formula */}
              <p className="text-xs text-purple-600 mt-2 bg-purple-100 p-2 rounded">
                <strong>Rumus:</strong> Total Biaya × Target Profit % = Target Profit Amount
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Units Required to Sell</span>
                </div>
                <p className="text-2xl font-bold text-purple-800">
                  {targetProfit.unitsRequired === Infinity ? '∞' : formatNumber(targetProfit.unitsRequired)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {timePeriod === 'monthly' ? 'units (dalam 1 bulan)' : 'units'}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Revenue Required</span>
                </div>
                <p className="text-2xl font-bold text-purple-800">
                  {targetProfit.revenueRequired === Infinity ? '∞' : formatRupiah(targetProfit.revenueRequired)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {timePeriod === 'monthly' ? 'target untuk 1 bulan' : 'target untuk 1 tahun'}
                </p>
              </div>
            </div>

            {timePeriod === 'monthly' && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>Target Penjualan:</strong> {formatNumber(targetProfit.unitsRequired)} unit harus dijual dalam 1 bulan untuk mencapai target profit dengan expenses bulanan saat ini.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Breakdown Total Expenses */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
            <h5 className="text-sm font-semibold text-gray-800 mb-2">Breakdown Total Expenses:</h5>
            
            {(() => {
              // Calculate breakdown from results
              const prodCost = summary.productionCostPerUnit * (breakEven.unitsRequired || 0);
              const operCost = summary.operationalCostPerUnit > 0 
                ? summary.operationalCostPerUnit * (breakEven.unitsRequired || 0)
                : (breakEven.operationalCost || 0);
              const channelFee = summary.breakEvenChannelFee || breakEven.channelFee || 0;
              
              return (
                <>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-gray-700">• Biaya Produksi:</span>
                    <span className="font-semibold text-gray-800">
                      {formatRupiah(prodCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-gray-700">• Biaya Operasional:</span>
                    <span className="font-semibold text-gray-800">
                      {formatRupiah(operCost)}
                    </span>
                  </div>
                  {channelFee > 0 && (
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-gray-700">• Biaya Sales Channel Fee:</span>
                      <span className="font-semibold text-gray-800">
                        {formatRupiah(channelFee)}
                        {summary.channelFeePercentage !== undefined && (
                          <span className="text-xs text-gray-600 ml-2">
                            ({summary.channelFeePercentage.toFixed(2)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-semibold text-gray-800">Total Expenses:</span>
                    <span className="text-base font-bold text-gray-900">
                      {formatRupiah(summary.totalExpenses)}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>

          <Separator />

          {/* Cost per Unit */}
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Production Cost per Unit:</span>
              <span className="font-semibold">{formatRupiah(summary.productionCostPerUnit)}</span>
            </div>
            {summary.operationalCostPerUnit > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Operational Cost per Unit:</span>
                <span className="font-semibold">{formatRupiah(summary.operationalCostPerUnit)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-700">Total Cost per Unit:</span>
              <span className="font-bold text-lg">{formatRupiah(results.totalCostPerUnit)}</span>
            </div>
          </div>

          {/* Net Profit per Unit */}
          {summary.netProfitPerUnit !== undefined && (
            <>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Net Profit per Unit (setelah channel fee):</span>
                <span className="font-semibold text-green-700">{formatRupiah(summary.netProfitPerUnit)}</span>
              </div>
            </>
          )}

          {/* Recommended Selling Price */}
          <Separator />
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-700">Recommended Selling Price:</span>
              <span className="text-lg font-bold text-blue-800">
                {formatRupiah(summary.recommendedSellingPrice)}
              </span>
            </div>
            {summary.recommendedChannel && (
              <p className="text-xs text-blue-600 mt-1">
                Best margin on: <strong>{summary.recommendedChannel}</strong>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

