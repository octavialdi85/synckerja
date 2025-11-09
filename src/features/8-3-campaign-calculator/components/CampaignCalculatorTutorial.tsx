import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { Separator } from '@/features/ui/separator';
import { ScrollArea } from '@/features/ui/scroll-area';
import { 
  BookOpen, 
  Calculator, 
  DollarSign, 
  Users, 
  Target, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Save,
  Upload
} from 'lucide-react';

interface CampaignCalculatorTutorialProps {
  currentTab: string;
}

export const CampaignCalculatorTutorial: React.FC<CampaignCalculatorTutorialProps> = ({ currentTab }) => {
  const renderServicesTutorial = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Tujuan:</strong> Menghitung performa kampanye untuk bisnis jasa dengan fokus pada konsultasi dan layanan.
        </p>
      </div>

      {/* Step 1 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-green-600" />
            Langkah 1: Basic Settings
            <Badge variant="outline" className="text-xs">Wajib</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Isi data marketing dasar:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>Budget (Rp): Total anggaran kampanye</li>
              <li>CPM (Rp): Cost per 1000 impressions</li>
              <li>CTR Link (%): Persentase klik dari impressions</li>
              <li>% Ads Click To Visit: Berapa persen yang mengunjungi landing page</li>
              <li>WhatsApp Click (%): Konversi ke WhatsApp</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Step 2 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-purple-600" />
            Langkah 2: Service Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Konfigurasi metrik khusus layanan jasa:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>Consultation Booking Rate: % yang book konsultasi</li>
              <li>Consultation to Contract: % yang jadi kontrak</li>
              <li>Service Package Value: Nilai paket layanan</li>
              <li>Profit Margin: Margin keuntungan (%)</li>
              <li>Client Retention Rate: % klien yang balik</li>
              <li>Referral Rate: % klien yang mereferensikan</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Template Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="h-4 w-4 text-orange-600" />
            Save & Load Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <div className="flex items-start gap-2">
              <Save className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Save Template</p>
                <p className="text-xs text-gray-500">Simpan setting saat ini sebagai template untuk digunakan nanti</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Upload className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Load Template</p>
                <p className="text-xs text-gray-500">Muat template yang sudah disimpan sebelumnya</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Tips Template:</p>
                <p className="text-yellow-700">
                  Buat template untuk different industry atau client type untuk mempercepat kalkulasi di masa depan.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Best Practices - Services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <h4 className="font-medium text-sm text-green-800 mb-1">Yang Harus Dilakukan</h4>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• Track consultation attendance rate (biasanya 85%)</li>
              <li>• Optimalkan consultation to contract rate</li>
              <li>• Focus pada client lifetime value</li>
              <li>• Implement referral program yang baik</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSalesTutorial = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Tujuan:</strong> Menghitung performa kampanye untuk bisnis penjualan produk dengan fokus pada e-commerce funnel.
        </p>
      </div>

      {/* Step 1 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-green-600" />
            Langkah 1: Marketing KPIs
            <Badge variant="outline" className="text-xs">Wajib</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Setup basic marketing metrics:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>Budget (Rp): Total budget kampanye</li>
              <li>Cost per Click (Rp): Biaya per klik iklan</li>
              <li>Landing Page CTR (%): Conversion rate landing page</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Step 2 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-purple-600" />
            Langkah 2: Sales Funnel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Konfigurasi sales funnel conversion rates:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>Landing to Product View (%): Konversi ke halaman produk</li>
              <li>Product View to Add Cart (%): Add to cart rate</li>
              <li>Cart to Checkout (%): Checkout initiation rate</li>
              <li>Payment Success Rate (%): Successful payment rate</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Step 3 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-blue-600" />
            Langkah 3: Product & Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Setup product dan revenue metrics:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>Product Price (Rp): Harga per produk</li>
              <li>Average Order Value (Rp): Rata-rata nilai pesanan</li>
              <li>Profit Margin (%): Margin keuntungan</li>
              <li>Seasonal Multiplier: Faktor musiman (1.0 = normal)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-orange-600" />
            Advanced Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Customer behavior advanced metrics:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>Repeat Purchase Rate (%): % customer yang beli lagi</li>
              <li>Upselling/Cross-selling Rate (%): % upsell success</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Template Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="h-4 w-4 text-orange-600" />
            Save & Load Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <div className="flex items-start gap-2">
              <Save className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Save Template</p>
                <p className="text-xs text-gray-500">Simpan setting saat ini sebagai template untuk digunakan nanti</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Upload className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Load Template</p>
                <p className="text-xs text-gray-500">Muat template yang sudah disimpan sebelumnya</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Tips Template:</p>
                <p className="text-yellow-700">
                  Buat template untuk different product category atau seasonal campaign.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Best Practices - Sales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <h4 className="font-medium text-sm text-green-800 mb-1">Yang Harus Dilakukan</h4>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• Monitor ROAS (Return on Ad Spend) minimal 3x</li>
              <li>• Optimalkan cart abandonment rate</li>
              <li>• Focus pada customer lifetime value</li>
              <li>• Test different seasonal multipliers</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-blue-600" />
          Tutorial Campaign Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full px-6">
          <div className="space-y-6 pb-6">
            {currentTab === 'services' ? renderServicesTutorial() : renderSalesTutorial()}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
