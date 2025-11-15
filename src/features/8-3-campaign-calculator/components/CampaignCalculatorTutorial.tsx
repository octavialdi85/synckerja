import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { Separator } from '@/features/ui/separator';
import { ScrollArea } from '@/features/ui/scroll-area';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
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
  const { t } = useAppTranslation();
  const renderServicesTutorial = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>{t('pages.campaignCalculator.tutorial.objective', 'Objective:')}</strong> {t('pages.campaignCalculator.tutorial.services.objective', 'Calculate campaign performance for service businesses focusing on consultation and services.')}
        </p>
      </div>

      {/* Step 1 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-green-600" />
            {t('pages.campaignCalculator.tutorial.services.step1.title', 'Step 1: Basic Settings')}
            <Badge variant="outline" className="text-xs">{t('pages.campaignCalculator.tutorial.services.step1.required', 'Required')}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>{t('pages.campaignCalculator.tutorial.services.step1.description', 'Fill in basic marketing data:')}</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>{t('pages.campaignCalculator.tutorial.services.step1.budget', 'Budget (Rp): Total campaign budget')}</li>
              <li>{t('pages.campaignCalculator.tutorial.services.step1.cpm', 'CPM (Rp): Cost per 1000 impressions')}</li>
              <li>{t('pages.campaignCalculator.tutorial.services.step1.ctr', 'CTR Link (%): Click percentage from impressions')}</li>
              <li>{t('pages.campaignCalculator.tutorial.services.step1.visit', '% Ads Click To Visit: Percentage that visits landing page')}</li>
              <li>{t('pages.campaignCalculator.tutorial.services.step1.whatsapp', 'WhatsApp Click (%): Conversion to WhatsApp')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Step 2 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-purple-600" />
            {t('pages.campaignCalculator.tutorial.services.step2.title', 'Step 2: Service Metrics')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>{t('pages.campaignCalculator.tutorial.services.step2.description', 'Configure service-specific metrics:')}</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>{t('pages.campaignCalculator.tutorial.services.step2.booking', 'Consultation Booking Rate: % who book consultation')}</li>
              <li>{t('pages.campaignCalculator.tutorial.services.step2.contract', 'Consultation to Contract: % who become contracts')}</li>
              <li>{t('pages.campaignCalculator.tutorial.services.step2.package', 'Service Package Value: Service package value')}</li>
              <li>{t('pages.campaignCalculator.tutorial.services.step2.profit', 'Profit Margin: Profit margin (%)')}</li>
              <li>{t('pages.campaignCalculator.tutorial.services.step2.retention', 'Client Retention Rate: % clients who return')}</li>
              <li>{t('pages.campaignCalculator.tutorial.services.step2.referral', 'Referral Rate: % clients who refer')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Template Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="h-4 w-4 text-orange-600" />
            {t('pages.campaignCalculator.tutorial.services.template.title', 'Save & Load Template')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <div className="flex items-start gap-2">
              <Save className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">{t('pages.campaignCalculator.tutorial.services.template.save', 'Save Template')}</p>
                <p className="text-xs text-gray-500">{t('pages.campaignCalculator.tutorial.services.template.saveDescription', 'Save current settings as a template for later use')}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Upload className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">{t('pages.campaignCalculator.tutorial.services.template.load', 'Load Template')}</p>
                <p className="text-xs text-gray-500">{t('pages.campaignCalculator.tutorial.services.template.loadDescription', 'Load a previously saved template')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">{t('pages.campaignCalculator.tutorial.services.template.tips', 'Template Tips:')}</p>
                <p className="text-yellow-700">
                  {t('pages.campaignCalculator.tutorial.services.template.tipsDescription', 'Create templates for different industries or client types to speed up calculations in the future.')}
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
            {t('pages.campaignCalculator.tutorial.services.bestPractices.title', 'Best Practices - Services')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <h4 className="font-medium text-sm text-green-800 mb-1">{t('pages.campaignCalculator.tutorial.services.bestPractices.dos', 'What to Do')}</h4>
            <ul className="text-xs text-green-700 space-y-1">
              <li>{t('pages.campaignCalculator.tutorial.services.bestPractices.track', '• Track consultation attendance rate (usually 85%)')}</li>
              <li>{t('pages.campaignCalculator.tutorial.services.bestPractices.optimize', '• Optimize consultation to contract rate')}</li>
              <li>{t('pages.campaignCalculator.tutorial.services.bestPractices.focus', '• Focus on client lifetime value')}</li>
              <li>{t('pages.campaignCalculator.tutorial.services.bestPractices.referral', '• Implement a good referral program')}</li>
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
          <strong>{t('pages.campaignCalculator.tutorial.objective', 'Objective:')}</strong> {t('pages.campaignCalculator.tutorial.sales.objective', 'Calculate campaign performance for product sales businesses focusing on e-commerce funnel.')}
        </p>
      </div>

      {/* Step 1 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-green-600" />
            {t('pages.campaignCalculator.tutorial.sales.step1.title', 'Step 1: Marketing KPIs')}
            <Badge variant="outline" className="text-xs">{t('pages.campaignCalculator.tutorial.sales.step1.required', 'Required')}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>{t('pages.campaignCalculator.tutorial.sales.step1.description', 'Setup basic marketing metrics:')}</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>{t('pages.campaignCalculator.tutorial.sales.step1.budget', 'Budget (Rp): Total campaign budget')}</li>
              <li>{t('pages.campaignCalculator.tutorial.sales.step1.cpc', 'Cost per Click (Rp): Cost per ad click')}</li>
              <li>{t('pages.campaignCalculator.tutorial.sales.step1.ctr', 'Landing Page CTR (%): Landing page conversion rate')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Step 2 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-purple-600" />
            {t('pages.campaignCalculator.tutorial.sales.step2.title', 'Step 2: Sales Funnel')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>{t('pages.campaignCalculator.tutorial.sales.step2.description', 'Configure sales funnel conversion rates:')}</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>{t('pages.campaignCalculator.tutorial.sales.step2.view', 'Landing to Product View (%): Conversion to product page')}</li>
              <li>{t('pages.campaignCalculator.tutorial.sales.step2.cart', 'Product View to Add Cart (%): Add to cart rate')}</li>
              <li>{t('pages.campaignCalculator.tutorial.sales.step2.checkout', 'Cart to Checkout (%): Checkout initiation rate')}</li>
              <li>{t('pages.campaignCalculator.tutorial.sales.step2.payment', 'Payment Success Rate (%): Successful payment rate')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Step 3 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-blue-600" />
            {t('pages.campaignCalculator.tutorial.sales.step3.title', 'Step 3: Product & Revenue')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>{t('pages.campaignCalculator.tutorial.sales.step3.description', 'Setup product and revenue metrics:')}</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>{t('pages.campaignCalculator.tutorial.sales.step3.price', 'Product Price (Rp): Price per product')}</li>
              <li>{t('pages.campaignCalculator.tutorial.sales.step3.order', 'Average Order Value (Rp): Average order value')}</li>
              <li>{t('pages.campaignCalculator.tutorial.sales.step3.profit', 'Profit Margin (%): Profit margin')}</li>
              <li>{t('pages.campaignCalculator.tutorial.sales.step3.seasonal', 'Seasonal Multiplier: Seasonal factor (1.0 = normal)')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-orange-600" />
            {t('pages.campaignCalculator.tutorial.sales.advanced.title', 'Advanced Metrics')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>{t('pages.campaignCalculator.tutorial.sales.advanced.description', 'Customer behavior advanced metrics:')}</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>{t('pages.campaignCalculator.tutorial.sales.advanced.repeat', 'Repeat Purchase Rate (%): % customers who buy again')}</li>
              <li>{t('pages.campaignCalculator.tutorial.sales.advanced.upsell', 'Upselling/Cross-selling Rate (%): % upsell success')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Template Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="h-4 w-4 text-orange-600" />
            {t('pages.campaignCalculator.tutorial.sales.template.title', 'Save & Load Template')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <div className="flex items-start gap-2">
              <Save className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">{t('pages.campaignCalculator.tutorial.sales.template.save', 'Save Template')}</p>
                <p className="text-xs text-gray-500">{t('pages.campaignCalculator.tutorial.sales.template.saveDescription', 'Save current settings as a template for later use')}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Upload className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">{t('pages.campaignCalculator.tutorial.sales.template.load', 'Load Template')}</p>
                <p className="text-xs text-gray-500">{t('pages.campaignCalculator.tutorial.sales.template.loadDescription', 'Load a previously saved template')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">{t('pages.campaignCalculator.tutorial.sales.template.tips', 'Template Tips:')}</p>
                <p className="text-yellow-700">
                  {t('pages.campaignCalculator.tutorial.sales.template.tipsDescription', 'Create templates for different product categories or seasonal campaigns.')}
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
            {t('pages.campaignCalculator.tutorial.sales.bestPractices.title', 'Best Practices - Sales')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <h4 className="font-medium text-sm text-green-800 mb-1">{t('pages.campaignCalculator.tutorial.sales.bestPractices.dos', 'What to Do')}</h4>
            <ul className="text-xs text-green-700 space-y-1">
              <li>{t('pages.campaignCalculator.tutorial.sales.bestPractices.monitor', '• Monitor ROAS (Return on Ad Spend) minimum 3x')}</li>
              <li>{t('pages.campaignCalculator.tutorial.sales.bestPractices.optimize', '• Optimize cart abandonment rate')}</li>
              <li>{t('pages.campaignCalculator.tutorial.sales.bestPractices.focus', '• Focus on customer lifetime value')}</li>
              <li>{t('pages.campaignCalculator.tutorial.sales.bestPractices.test', '• Test different seasonal multipliers')}</li>
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
          {t('pages.campaignCalculator.tutorial.title', 'Campaign Calculator Tutorial')}
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
