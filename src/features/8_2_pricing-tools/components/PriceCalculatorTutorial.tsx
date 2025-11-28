
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

export const PriceCalculatorTutorial = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-blue-600" />
          Tutorial Penggunaan Price Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 pr-4">
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Tujuan:</strong> Membantu Anda menghitung harga jual yang optimal 
                berdasarkan biaya produksi dan margin keuntungan yang diinginkan.
              </p>
            </div>

            {/* Step 1 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4 text-purple-600" />
                  Langkah 1: Informasi Produk
                  <Badge variant="outline" className="text-xs">Wajib</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p><strong>Isi data produk:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Nama produk (contoh: "Kopi Arabica Premium")</li>
                    <li>Kategori (Food & Beverage, Manufacturing, atau Service)</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">Tips:</p>
                      <p className="text-yellow-700">
                        Kategori mempengaruhi perhitungan margin yang disarankan untuk industri tersebut.
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
                  Langkah 2: Rincian Biaya Produksi
                  <Badge variant="outline" className="text-xs">Wajib</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p><strong>Masukkan semua komponen biaya:</strong></p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <p className="font-medium text-gray-800 mb-1">Bahan Baku</p>
                      <p className="text-xs text-gray-600">Contoh: Kopi Arabica = Rp 75,000</p>
                    </div>
                    
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <p className="font-medium text-gray-800 mb-1">Biaya Tenaga Kerja</p>
                      <p className="text-xs text-gray-600">Contoh: Barista 2 jam = Rp 15,000</p>
                    </div>
                    
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <p className="font-medium text-gray-800 mb-1">Overhead</p>
                      <p className="text-xs text-gray-600">Contoh: Listrik, sewa = Rp 5,000</p>
                    </div>
                    
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <p className="font-medium text-gray-800 mb-1">Biaya Admin</p>
                      <p className="text-xs text-gray-600">Contoh: Packaging = Rp 3,000</p>
                    </div>
                    
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <p className="font-medium text-gray-800 mb-1">Marketing</p>
                      <p className="text-xs text-gray-600">Contoh: Promosi = Rp 2,000</p>
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
                    Sistem akan otomatis menghitung total dari semua komponen biaya
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-4 w-4 text-purple-600" />
                  Langkah 3: Metode Perhitungan
                  <Badge variant="outline" className="text-xs">Pilih Salah Satu</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-3">
                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-gray-800 mb-2">1. Markup Percentage</p>
                    <p className="text-xs text-gray-600 mb-2">
                      Menambahkan persentase keuntungan dari biaya produksi
                    </p>
                    <div className="bg-blue-50 p-2 rounded text-xs">
                      <p><strong>Contoh:</strong> Markup 50%</p>
                      <p>Harga Jual = Rp 100,000 + (50% × Rp 100,000) = Rp 150,000</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-gray-800 mb-2">2. Profit Margin</p>
                    <p className="text-xs text-gray-600 mb-2">
                      Menentukan persentase keuntungan dari harga jual
                    </p>
                    <div className="bg-blue-50 p-2 rounded text-xs">
                      <p><strong>Contoh:</strong> Margin 33%</p>
                      <p>Harga Jual = Rp 100,000 ÷ (100% - 33%) = Rp 149,254</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-gray-800 mb-2">3. Fixed Profit Amount</p>
                    <p className="text-xs text-gray-600 mb-2">
                      Menambahkan nilai keuntungan tetap
                    </p>
                    <div className="bg-blue-50 p-2 rounded text-xs">
                      <p><strong>Contoh:</strong> Profit Rp 50,000</p>
                      <p>Harga Jual = Rp 100,000 + Rp 50,000 = Rp 150,000</p>
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
                  Langkah 4: Channel Penjualan
                  <Badge variant="outline" className="text-xs">Opsional</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p><strong>Pilih saluran penjualan untuk penyesuaian harga:</strong></p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    <div className="border rounded-lg p-3 bg-orange-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">Online Marketplace</span>
                        <Badge className="text-xs bg-red-100 text-red-800">Fee 15%</Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Termasuk komisi platform, fee pembayaran, dan biaya iklan
                      </p>
                    </div>
                    
                    <div className="border rounded-lg p-3 bg-green-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">Toko Offline</span>
                        <Badge className="text-xs bg-green-100 text-green-800">Fee 5%</Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Termasuk sewa toko dan biaya staff
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
                  Langkah 5: Analisis Hasil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-3">
                  <p><strong>Setelah klik "Calculate Pricing", Anda akan mendapat:</strong></p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Harga jual yang disarankan</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Jumlah keuntungan dalam rupiah</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Persentase margin keuntungan</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Harga per channel penjualan</span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Catatan Penting:</p>
                      <ul className="list-disc list-inside text-amber-700 mt-1 space-y-1">
                        <li>Selalu riset harga kompetitor sebelum menentukan harga final</li>
                        <li>Pertimbangkan daya beli target market</li>
                        <li>Lakukan test pricing untuk produk baru</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Fitur Tambahan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <p><strong>Setelah perhitungan selesai, Anda dapat:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Menyimpan hasil perhitungan untuk referensi</li>
                    <li>Export ke Excel untuk analisis lebih lanjut</li>
                    <li>Share hasil dengan tim atau stakeholder</li>
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
