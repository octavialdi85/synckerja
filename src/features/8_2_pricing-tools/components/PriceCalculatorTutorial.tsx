import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { Separator } from '@/features/ui/separator';
import { ScrollArea } from '@/features/ui/scroll-area';
import { 
  BookOpen, 
  Calculator, 
  DollarSign, 
  Package, 
  Target, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export const PriceCalculatorTutorial = () => {
  const { t } = useAppTranslation();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-blue-600" />
          {t('pricingTools.tutorial.title', 'Tutorial Penggunaan Price Calculator')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 pr-4">
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>{t('pricingTools.tutorial.objective', 'Tujuan:')}</strong> {t('pricingTools.tutorial.objective.description', 'Membantu Anda menghitung harga jual yang optimal berdasarkan biaya produksi dan margin keuntungan yang diinginkan.')}
              </p>
            </div>

            {/* Step 1 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4 text-purple-600" />
                  {t('pricingTools.tutorial.step1.title', 'Langkah 1: Informasi Produk')}
                  <Badge variant="outline" className="text-xs">{t('pricingTools.tutorial.step1.required', 'Wajib')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p><strong>{t('pricingTools.tutorial.step1.description', 'Isi data produk:')}</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>{t('pricingTools.tutorial.step1.productName', 'Nama produk (contoh: "Kopi Arabica Premium")')}</li>
                    <li>{t('pricingTools.tutorial.step1.category', 'Kategori (Food & Beverage, Manufacturing, atau Service)')}</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">{t('pricingTools.tutorial.step1.tip', 'Tips:')}</p>
                      <p className="text-yellow-700">
                        {t('pricingTools.tutorial.step1.tip.description', 'Kategori mempengaruhi perhitungan margin yang disarankan untuk industri tersebut.')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  {t('pricingTools.tutorial.step2.title', 'Langkah 2: Rincian Biaya Produksi')}
                  <Badge variant="outline" className="text-xs">{t('pricingTools.tutorial.step1.required', 'Wajib')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p><strong>{t('pricingTools.tutorial.step2.description', 'Masukkan semua komponen biaya:')}</strong></p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <p className="font-medium text-gray-800 mb-1">{t('pricingTools.tutorial.step2.rawMaterials', 'Bahan Baku')}</p>
                      <p className="text-xs text-gray-600">{t('pricingTools.tutorial.step2.rawMaterials.example', 'Contoh: Kopi Arabica = Rp 75,000')}</p>
                    </div>
                    
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <p className="font-medium text-gray-800 mb-1">{t('pricingTools.tutorial.step2.laborCost', 'Biaya Tenaga Kerja')}</p>
                      <p className="text-xs text-gray-600">{t('pricingTools.tutorial.step2.laborCost.example', 'Contoh: Barista 2 jam = Rp 15,000')}</p>
                    </div>
                    
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <p className="font-medium text-gray-800 mb-1">{t('pricingTools.tutorial.step2.overhead', 'Overhead')}</p>
                      <p className="text-xs text-gray-600">{t('pricingTools.tutorial.step2.overhead.example', 'Contoh: Listrik, sewa = Rp 5,000')}</p>
                    </div>
                    
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <p className="font-medium text-gray-800 mb-1">{t('pricingTools.tutorial.step2.marketingCost', 'Marketing')}</p>
                      <p className="text-xs text-gray-600">{t('pricingTools.tutorial.step2.marketingCost.example', 'Contoh: Promosi = Rp 2,000')}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Total Biaya Produksi:</span>
                    <span className="text-sm font-bold text-green-900">Rp 100,000</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    {t('pricingTools.tutorial.step2.totalNote', 'Sistem akan otomatis menghitung total dari semua komponen biaya')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-4 w-4 text-purple-600" />
                  {t('pricingTools.tutorial.step3.title', 'Langkah 3: Metode Perhitungan')}
                  <Badge variant="outline" className="text-xs">{t('pricingTools.tutorial.step3.optional', 'Pilih Salah Satu')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-3">
                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-gray-800 mb-2">{t('pricingTools.tutorial.step3.method1.title', '1. Markup Percentage')}</p>
                    <p className="text-xs text-gray-600 mb-2">
                      {t('pricingTools.tutorial.step3.method1.description', 'Menambahkan persentase keuntungan dari biaya produksi')}
                    </p>
                    <div className="bg-blue-50 p-2 rounded text-xs">
                      <p><strong>{t('pricingTools.tutorial.step3.method1.example', 'Contoh: Markup 50%')}</strong></p>
                      <p>{t('pricingTools.tutorial.step3.method1.formula', 'Harga Jual = Rp 100,000 + (50% × Rp 100,000) = Rp 150,000')}</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-gray-800 mb-2">{t('pricingTools.tutorial.step3.method2.title', '2. Profit Margin')}</p>
                    <p className="text-xs text-gray-600 mb-2">
                      {t('pricingTools.tutorial.step3.method2.description', 'Menentukan persentase keuntungan dari harga jual')}
                    </p>
                    <div className="bg-blue-50 p-2 rounded text-xs">
                      <p><strong>{t('pricingTools.tutorial.step3.method2.example', 'Contoh: Margin 33%')}</strong></p>
                      <p>{t('pricingTools.tutorial.step3.method2.formula', 'Harga Jual = Rp 100,000 ÷ (100% - 33%) = Rp 149,254')}</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-gray-800 mb-2">{t('pricingTools.tutorial.step3.method3.title', '3. Fixed Profit Amount')}</p>
                    <p className="text-xs text-gray-600 mb-2">
                      {t('pricingTools.tutorial.step3.method3.description', 'Menambahkan nilai keuntungan tetap')}
                    </p>
                    <div className="bg-blue-50 p-2 rounded text-xs">
                      <p><strong>{t('pricingTools.tutorial.step3.method3.example', 'Contoh: Profit Rp 50,000')}</strong></p>
                      <p>{t('pricingTools.tutorial.step3.method3.formula', 'Harga Jual = Rp 100,000 + Rp 50,000 = Rp 150,000')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-orange-600" />
                  {t('pricingTools.tutorial.step4.title', 'Langkah 4: Channel Penjualan')}
                  <Badge variant="outline" className="text-xs">{t('pricingTools.tutorial.step4.optional', 'Opsional')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p><strong>{t('pricingTools.tutorial.step4.description', 'Pilih saluran penjualan untuk penyesuaian harga:')}</strong></p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    <div className="border rounded-lg p-3 bg-orange-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">{t('pricingTools.tutorial.step4.online', 'Online Marketplace')}</span>
                        <Badge className="text-xs bg-red-100 text-red-800">{t('pricingTools.tutorial.step4.online.fee', 'Fee 15%')}</Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        {t('pricingTools.tutorial.step4.online.description', 'Termasuk komisi platform, fee pembayaran, dan biaya iklan')}
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-3 bg-green-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">{t('pricingTools.tutorial.step4.offline', 'Toko Offline')}</span>
                        <Badge className="text-xs bg-green-100 text-green-800">{t('pricingTools.tutorial.step4.offline.fee', 'Fee 5%')}</Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        {t('pricingTools.tutorial.step4.offline.description', 'Termasuk sewa toko dan biaya staff')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 5 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  {t('pricingTools.tutorial.step5.title', 'Langkah 5: Analisis Hasil')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-3">
                  <p><strong>{t('pricingTools.tutorial.step5.description', 'Setelah klik "Calculate Pricing", Anda akan mendapat:')}</strong></p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricingTools.tutorial.step5.result1', 'Harga jual yang disarankan')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricingTools.tutorial.step5.result2', 'Jumlah keuntungan dalam rupiah')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricingTools.tutorial.step5.result3', 'Persentase margin keuntungan')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{t('pricingTools.tutorial.step5.result4', 'Harga per channel penjualan')}</span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">{t('pricingTools.tutorial.step5.note', 'Catatan Penting:')}</p>
                      <ul className="list-disc list-inside text-amber-700 mt-1 space-y-1">
                        <li>{t('pricingTools.tutorial.step5.note1', 'Selalu riset harga kompetitor sebelum menentukan harga final')}</li>
                        <li>{t('pricingTools.tutorial.step5.note2', 'Pertimbangkan daya beli target market')}</li>
                        <li>{t('pricingTools.tutorial.step5.note3', 'Lakukan test pricing untuk produk baru')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('pricingTools.tutorial.quickActions.title', 'Fitur Tambahan')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <p><strong>{t('pricingTools.tutorial.quickActions.description', 'Setelah perhitungan selesai, Anda dapat:')}</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>{t('pricingTools.tutorial.quickActions.save', 'Menyimpan hasil perhitungan untuk referensi')}</li>
                    <li>{t('pricingTools.tutorial.quickActions.export', 'Export ke Excel untuk analisis lebih lanjut')}</li>
                    <li>{t('pricingTools.tutorial.quickActions.share', 'Share hasil dengan tim atau stakeholder')}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
