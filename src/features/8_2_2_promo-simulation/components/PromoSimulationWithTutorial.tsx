import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Button } from '@/features/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Badge } from '@/features/ui/badge';
import { Separator } from '@/features/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { ScrollArea } from '@/features/ui/scroll-area';
import { Percent, TrendingDown, AlertTriangle, CheckCircle, BookOpen, Calculator, Target, TrendingUp } from 'lucide-react';

export const PromoSimulationWithTutorial = () => {
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

  const renderTutorial = () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-5 w-5 text-blue-600" />
          Tutorial Simulasi Promosi
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px] px-6">
          <div className="space-y-6 pb-6">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Tujuan:</strong> Membantu Anda mensimulasikan dampak promosi terhadap keuntungan 
                dan menentukan strategi diskon yang optimal.
              </p>
            </div>

            {/* Step 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <h3 className="font-semibold text-base">Atur Detail Promosi</h3>
              </div>
              <div className="ml-8 space-y-2">
                <p className="text-sm text-gray-600">
                  Mulai dengan memasukkan informasi dasar produk Anda:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li><strong>Harga Jual Dasar:</strong> Harga produk regular Anda (contoh: Rp 150,000)</li>
                  <li><strong>Biaya Produksi:</strong> Biaya untuk membuat produk (contoh: Rp 100,000)</li>
                </ul>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>Tips:</strong> Pastikan biaya produksi mencakup semua bahan, tenaga kerja, dan overhead untuk perhitungan yang akurat.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <h3 className="font-semibold text-base">Pilih Jenis Diskon</h3>
              </div>
              <div className="ml-8 space-y-2">
                <p className="text-sm text-gray-600">
                  Pilih jenis promosi yang ingin Anda jalankan:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Calculator className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Diskon Persentase</p>
                      <p className="text-xs text-gray-500">Kurangi harga dengan persentase (contoh: diskon 20%)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calculator className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Potongan Nominal</p>
                      <p className="text-xs text-gray-500">Kurangi harga dengan jumlah tetap (contoh: potongan Rp 30,000)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calculator className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Beli Satu Dapat Satu (BOGO)</p>
                      <p className="text-xs text-gray-500">Promosi khusus dengan menawarkan item tambahan</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <h3 className="font-semibold text-base">Konfigurasi Saluran Penjualan</h3>
              </div>
              <div className="ml-8 space-y-2">
                <p className="text-sm text-gray-600">
                  Tinjau bagaimana saluran penjualan yang berbeda mempengaruhi margin keuntungan:
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">Marketplace Online</span>
                      <Badge variant="outline" className="text-xs">Fee Tinggi</Badge>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Komisi: 10% dari harga jual</li>
                      <li>• Fee pembayaran: 3% dari harga jual</li>
                      <li>• Biaya iklan: 2% dari harga jual</li>
                      <li>• <strong>Total fee: 15%</strong></li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">Toko Offline</span>
                      <Badge variant="outline" className="text-xs">Fee Rendah</Badge>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Sewa toko: 3% dari harga jual</li>
                      <li>• Biaya staff: 2% dari harga jual</li>
                      <li>• <strong>Total fee: 5%</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                <h3 className="font-semibold text-base">Proyeksi Volume Penjualan</h3>
              </div>
              <div className="ml-8 space-y-2">
                <p className="text-sm text-gray-600">
                  Perkirakan bagaimana promosi akan mempengaruhi penjualan Anda:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li><strong>Penjualan Harian Saat Ini:</strong> Rata-rata penjualan per hari tanpa promosi</li>
                  <li><strong>Peningkatan yang Diharapkan:</strong> Persentase peningkatan volume penjualan karena promosi</li>
                </ul>
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    <strong>Penting:</strong> Diskon yang lebih tinggi biasanya menghasilkan peningkatan volume yang lebih tinggi, tetapi realistis dengan proyeksi Anda.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</div>
                <h3 className="font-semibold text-base">Jalankan Simulasi & Analisis Hasil</h3>
              </div>
              <div className="ml-8 space-y-2">
                <p className="text-sm text-gray-600">
                  Klik "Run Simulation" untuk melihat analisis detail:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Analisis Keuntungan</p>
                      <p className="text-xs text-gray-500">Bandingkan keuntungan original vs. diskon per unit</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Analisis Break-even</p>
                      <p className="text-xs text-gray-500">Berapa unit yang perlu dijual untuk mempertahankan total keuntungan</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Perbandingan Channel</p>
                      <p className="text-xs text-gray-500">Lihat saluran penjualan mana yang lebih menguntungkan</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Best Practices */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
                <h3 className="font-semibold text-base">Praktik Terbaik</h3>
              </div>
              <div className="ml-8 space-y-2">
                <div className="space-y-3">
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <h4 className="font-medium text-sm text-green-800 mb-1">Yang Harus Dilakukan</h4>
                    <ul className="text-xs text-green-700 space-y-1">
                      <li>• Uji promosi kecil terlebih dahulu sebelum kampanye besar</li>
                      <li>• Pertimbangkan tren musiman dalam proyeksi volume</li>
                      <li>• Pantau hasil aktual vs. proyeksi</li>
                      <li>• Faktorkan biaya inventori dan penyimpanan</li>
                    </ul>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <h4 className="font-medium text-sm text-red-800 mb-1">Yang Tidak Boleh Dilakukan</h4>
                    <ul className="text-xs text-red-700 space-y-1">
                      <li>• Jangan diskon di bawah titik break-even</li>
                      <li>• Hindari proyeksi volume yang terlalu optimis</li>
                      <li>• Jangan abaikan biaya tersembunyi (ongkir, packaging, dll.)</li>
                      <li>• Jangan terlalu sering promosi (menurunkan nilai brand)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Scenario */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">💡</div>
                <h3 className="font-semibold text-base">Contoh Skenario</h3>
              </div>
              <div className="ml-8">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-sm text-purple-800 mb-2">Toko Fashion: Promosi Diskon 20%</h4>
                  <div className="text-xs text-purple-700 space-y-1">
                    <p><strong>Produk:</strong> Kaos, harga jual Rp 150,000, biaya produksi Rp 100,000</p>
                    <p><strong>Promosi:</strong> Diskon 20% (harga menjadi Rp 120,000)</p>
                    <p><strong>Penjualan saat ini:</strong> 10 unit/hari, ekspektasi peningkatan 50% (15 unit/hari)</p>
                    <p><strong>Channel:</strong> Marketplace online (fee 15%)</p>
                  </div>
                  <Separator className="my-2" />
                  <div className="text-xs text-purple-700 space-y-1">
                    <p><strong>Hasil:</strong> Keuntungan original Rp 50k/unit → Keuntungan baru Rp 20k/unit</p>
                    <p><strong>Break-even:</strong> Butuh 25 unit untuk mempertahankan total keuntungan harian</p>
                    <p><strong>Rekomendasi:</strong> Pertimbangkan diskon 15% untuk margin yang lebih baik</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      {/* Input Section */}
      <div className="lg:col-span-2 space-y-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-5 w-5 text-red-600" />
              Promotion Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sales Channel Impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Volume Projections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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

      {/* Results Section with Tabs */}
      <div className="space-y-2">
        <Tabs defaultValue="results" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="results">Simulation Results</TabsTrigger>
            <TabsTrigger value="tutorial">Tutorial</TabsTrigger>
          </TabsList>
          
          <TabsContent value="results" className="space-y-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
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
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Channel Comparison</CardTitle>
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
          </TabsContent>
          
          <TabsContent value="tutorial">
            {renderTutorial()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
