import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Separator } from '@/features/ui/separator';
import { Badge } from '@/features/ui/badge';
import { Calculator, TrendingUp, BookOpen, AlertTriangle, ShoppingCart, Save, FileSpreadsheet, FileText } from 'lucide-react';
import { PriceCalculatorTutorial } from './PriceCalculatorTutorial';
import { PricingCalculationResult, PricingCalculationInput } from '../types/pricingTypes';
import { formatRupiah, formatNumber } from '../utils/pricingUtils';
import { usePricingCalculations } from '../hooks/usePricingCalculations';
import { SaveTemplateModal } from './SaveTemplateModal';

interface PricingToolsSidebarProps {
  calculationResults?: PricingCalculationResult | null;
  calculationInput?: PricingCalculationInput;
  currentStep?: number;
  finalSellingPrice?: number;
  marketingCostPerUnit?: number;
  channelFeePercent?: number;
  baseTotalCostPerUnit?: number;
}

export const PricingToolsSidebar = ({ 
  calculationResults, 
  calculationInput,
  currentStep = 1,
  finalSellingPrice,
  marketingCostPerUnit,
  channelFeePercent,
  baseTotalCostPerUnit
}: PricingToolsSidebarProps) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [calculationName, setCalculationName] = useState('');
  const { saveCalculation, isSaving } = usePricingCalculations();

  // Calculate profit per unit and profit margin when marketing results are available
  const calculateFinalProfit = () => {
    // Check if marketing results are available
    // Marketing Results is considered available only if:
    // 1. marketingCostPerUnit > 0 (has valid marketing cost)
    // 2. finalSellingPrice is significantly different from recommendedSellingPrice (more than 1% difference)
    const hasMarketingResults = finalSellingPrice && finalSellingPrice > 0 && 
        marketingCostPerUnit !== undefined && marketingCostPerUnit > 0 && 
        channelFeePercent !== undefined && baseTotalCostPerUnit !== undefined &&
        calculationResults && 
        Math.abs(finalSellingPrice - calculationResults.summary.recommendedSellingPrice) > (calculationResults.summary.recommendedSellingPrice * 0.01);
    
    if (hasMarketingResults) {
      // Calculate final total cost per unit (base + marketing)
      const finalTotalCostPerUnit = baseTotalCostPerUnit + marketingCostPerUnit;
      
      // Calculate channel fee per unit
      const channelFeePerUnit = (finalSellingPrice * channelFeePercent) / 100;
      
      // Calculate final net profit per unit
      const finalNetProfitPerUnit = finalSellingPrice - finalTotalCostPerUnit - channelFeePerUnit;
      
      // Calculate final profit margin percent
      const finalProfitMarginPercent = finalSellingPrice > 0 
        ? (finalNetProfitPerUnit / finalSellingPrice) * 100 
        : 0;
      
      return {
        profitPerUnit: finalNetProfitPerUnit,
        profitMarginPercent: finalProfitMarginPercent,
      };
    }
    return null;
  };

  const finalProfit = calculateFinalProfit();

  const handleSaveCalculation = async () => {
    if (!calculationResults || !calculationInput || !calculationName.trim()) {
      return;
    }

    try {
      await saveCalculation({
        calculationName: calculationName.trim(),
        productId: null,
        input: calculationInput,
        result: calculationResults,
      });
      setSaveDialogOpen(false);
      setCalculationName('');
    } catch {
      // Error shown via mutation onError toast
    }
  };

  const handleExportToExcel = () => {
    if (!calculationResults) return;
    
    // Create CSV/Excel content
    const rows = [
      ['Pricing Calculation Report'],
      [],
      ['Recommended Selling Price', formatRupiah(calculationResults.summary.recommendedSellingPrice)],
      ['Profit Margin', `${calculationResults.profitMarginPercent.toFixed(2)}%`],
      ['Profit per Unit', formatRupiah(calculationResults.profitPerUnit)],
      [],
      ['Break-Even Analysis'],
      ['Units Required', calculationResults.breakEven.unitsRequired === Infinity ? '∞' : calculationResults.breakEven.unitsRequired.toString()],
      ['Revenue Required', formatRupiah(calculationResults.breakEven.revenueRequired)],
      [],
      ['Channel Pricing'],
    ];

    // Add channel pricing
    calculationResults.channelPricing.forEach(channel => {
      rows.push([channel.channelName, formatRupiah(channel.sellingPrice), `${channel.profitMargin.toFixed(2)}%`]);
    });

    // Convert to CSV
    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pricing-calculation-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportToPDF = () => {
    if (!calculationResults) return;
    
    // Create printable HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pricing Calculation Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #2563eb; }
            h2 { color: #1e40af; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Pricing Calculation Report</h1>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString('id-ID')}</p>
          
          <h2>Summary</h2>
          <table>
            <tr><th>Recommended Selling Price</th><td>${formatRupiah(calculationResults.summary.recommendedSellingPrice)}</td></tr>
            <tr><th>Profit Margin</th><td>${calculationResults.profitMarginPercent.toFixed(2)}%</td></tr>
            <tr><th>Profit per Unit</th><td>${formatRupiah(calculationResults.profitPerUnit)}</td></tr>
          </table>
          
          <h2>Break-Even Analysis</h2>
          <table>
            <tr><th>Units Required</th><td>${calculationResults.breakEven.unitsRequired === Infinity ? '∞' : calculationResults.breakEven.unitsRequired}</td></tr>
            <tr><th>Revenue Required</th><td>${formatRupiah(calculationResults.breakEven.revenueRequired)}</td></tr>
          </table>
          
          <h2>Channel Pricing</h2>
          <table>
            <tr><th>Channel</th><th>Price</th><th>Margin</th></tr>
            ${calculationResults.channelPricing.map(ch => 
              `<tr><td>${ch.channelName}</td><td>${formatRupiah(ch.sellingPrice)}</td><td>${ch.profitMargin.toFixed(2)}%</td></tr>`
            ).join('')}
          </table>
        </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="h-full flex flex-col min-h-0 space-y-2">
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
                {/* Recommended Price */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-center">
                    <p className="text-sm text-blue-600 font-medium">
                      {finalProfit ? 'Final Selling Price' : 'Recommended Selling Price'}
                    </p>
                    {finalProfit && finalSellingPrice && finalSellingPrice > 0 && calculationResults ? (
                      <>
                        <div className="mt-2 flex items-center justify-center gap-3">
                          <div className="text-center">
                            <p className="text-xs text-blue-500">From</p>
                            <p className="text-lg font-semibold text-blue-700">
                              {formatRupiah(calculationResults.summary.recommendedSellingPrice)}
                            </p>
                          </div>
                          <div className="text-blue-400 text-xl">→</div>
                          <div className="text-center">
                            <p className="text-xs text-blue-500">To</p>
                            <p className="text-2xl font-bold text-blue-700">
                              {formatRupiah(finalSellingPrice)}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-2xl font-bold text-blue-700">
                        {formatRupiah(calculationResults.summary.recommendedSellingPrice)}
                      </p>
                    )}
                    {calculationResults.summary.recommendedChannel && (
                      <p className="text-xs text-blue-600 mt-1">
                        Best on: {calculationResults.summary.recommendedChannel}
                      </p>
                    )}
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-green-600 font-medium">Profit per Unit</p>
                    <p className="text-lg font-bold text-green-700">
                      {formatRupiah(
                        finalProfit 
                          ? finalProfit.profitPerUnit 
                          : calculationResults.profitPerUnit
                      )}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-purple-600 font-medium">Profit Margin</p>
                    <p className="text-lg font-bold text-purple-700">
                      {(
                        finalProfit 
                          ? finalProfit.profitMarginPercent 
                          : calculationResults.profitMarginPercent
                      ).toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Warnings */}
                {calculationResults.warnings.lowMargin && (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-orange-700">
                        {calculationResults.warnings.lowMarginMessage}
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Channel Pricing */}
                {calculationResults.channelPricing.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Pricing by Channel:
                    </h4>
                    <div className="space-y-2">
                      {calculationResults.channelPricing.map((channel) => (
                        <div
                          key={channel.channelId}
                          className="p-2 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">{channel.channelName}</span>
                            <span className="font-bold text-sm">
                              {formatRupiah(channel.sellingPrice)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-600">
                            <span>Net Profit: {formatRupiah(channel.netProfit)}</span>
                            <Badge
                              variant={
                                channel.profitMargin >= 20
                                  ? 'default'
                                  : channel.profitMargin >= 10
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className="text-xs"
                            >
                              {channel.profitMargin.toFixed(1)}% margin
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Break-Even Units (to Sell):</span>
                    <span className="font-medium">
                      {calculationResults.breakEven.unitsRequired === Infinity
                        ? '∞'
                        : formatNumber(calculationResults.breakEven.unitsRequired)}
                    </span>
                  </div>
                  {calculationResults.targetProfit && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Target Units (to Sell):</span>
                      <span className="font-medium">
                        {calculationResults.targetProfit.unitsRequired === Infinity
                          ? '∞'
                          : formatNumber(calculationResults.targetProfit.unitsRequired)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calculator className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm">Complete the form and click calculate to see results</p>
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
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => setSaveDialogOpen(true)}
              disabled={!calculationResults}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Calculation
            </Button>
            <SaveTemplateModal 
              calculationInput={calculationInput || null}
              disabled={!calculationInput}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={handleExportToExcel}
              disabled={!calculationResults}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={handleExportToPDF}
              disabled={!calculationResults}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export to PDF
            </Button>
          </CardContent>
        </Card>

        {/* Save Calculation Dialog */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Calculation</DialogTitle>
              <DialogDescription>
                Give a name to save this calculation for future reference.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="calculation-name">Calculation Name</Label>
                <Input
                  id="calculation-name"
                  placeholder="e.g., Product A - Q1 2024"
                  value={calculationName}
                  onChange={(e) => setCalculationName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveCalculation}
                disabled={!calculationName.trim() || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tutorial Section - single scroll container for sidebar content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain">
          <PriceCalculatorTutorial />
        </div>
      </div>
    </div>
  );
};

