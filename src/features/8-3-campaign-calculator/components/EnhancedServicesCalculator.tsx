import { useEffect, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/features/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { ServiceKPISettings } from '../types/kpi-templates';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';

const normalizeCurrencyValue = (value: string) => value.replace(/[^\d]/g, '');

const formatCurrencyDisplay = (value: string) => {
  if (!value) return '';
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return '';
  return new Intl.NumberFormat('id-ID').format(numericValue);
};

const currencyStringToNumber = (value: string) => {
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? 0 : numericValue;
};

const normalizePercentageValue = (value: string) => {
  if (!value) return '';
  return value.replace(/[^0-9,.\-]/g, '');
};

const percentageStringToNumber = (value: string) => {
  const normalized = value.replace(',', '.');
  const numericValue = Number(normalized);
  return Number.isNaN(numericValue) ? 0 : numericValue;
};

const normalizeFloatValue = (value: string) => value.replace(/[^0-9,.\-]/g, '');

const floatStringToNumber = (value: string) => {
  const normalized = value.replace(',', '.');
  const numericValue = Number(normalized);
  return Number.isNaN(numericValue) ? 0 : numericValue;
};

const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

const formatCurrency = (num: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);

interface PercentageInputFieldProps {
  id: string;
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
}

const PercentageInputField = ({
  id,
  value,
  placeholder,
  onValueChange
}: PercentageInputFieldProps) => (
  <div className="relative">
    <Input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onValueChange(normalizePercentageValue(e.target.value))}
      className="mt-1 pr-10"
      placeholder={placeholder}
    />
    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">%</span>
  </div>
);

interface EnhancedServicesCalculatorProps {
  initialSettings: ServiceKPISettings;
  onSettingsChange: (settings: ServiceKPISettings) => void;
}

const EnhancedServicesCalculator = ({
  initialSettings,
  onSettingsChange
}: EnhancedServicesCalculatorProps) => {
  const { t } = useAppTranslation();
  // Branding objective
  const [brandingBudget, setBrandingBudget] = useState<string>(normalizeCurrencyValue(initialSettings.brandingBudget || ''));
  const [brandingCpm, setBrandingCpm] = useState<string>(normalizeCurrencyValue(initialSettings.brandingCpm || ''));
  const [brandingFrequency, setBrandingFrequency] = useState<string>(normalizeFloatValue(initialSettings.brandingFrequency || ''));
  const [brandingEngagementRate, setBrandingEngagementRate] = useState<string>(
    normalizePercentageValue(initialSettings.brandingEngagementRate || '')
  );
  const [brandingQualificationRate, setBrandingQualificationRate] = useState<string>('100');

  // Conversion objective
  const [conversionFrequency, setConversionFrequency] = useState<string>(normalizeFloatValue(initialSettings.conversionFrequency || ''));
  const [conversionFrequencyError, setConversionFrequencyError] = useState<string | null>(null);
  const [budget, setBudget] = useState<string>(normalizeCurrencyValue(initialSettings.budget || ''));
  const [cpm, setCpm] = useState<string>(normalizeCurrencyValue(initialSettings.cpm || ''));
  const [ctrLink, setCtrLink] = useState<string>(normalizePercentageValue(initialSettings.ctrLink || ''));
  const [adsClickToVisit, setAdsClickToVisit] = useState<string>(normalizePercentageValue(initialSettings.adsClickToVisit || ''));
  const [whatsappClick, setWhatsappClick] = useState<string>(normalizePercentageValue(initialSettings.whatsappClick || ''));
  const [prospectToClient, setProspectToClient] = useState<string>(normalizePercentageValue(initialSettings.prospectToClient || ''));
  const [reservation, setReservation] = useState<string>(normalizePercentageValue(initialSettings.reservation || ''));
  const [crossSelling, setCrossSelling] = useState<string>(normalizePercentageValue(initialSettings.crossSelling || ''));
  const [servicePackageValue, setServicePackageValue] = useState<string>(normalizeCurrencyValue(initialSettings.servicePackageValue || ''));
  const [serviceProfitMargin, setServiceProfitMargin] = useState<string>(normalizePercentageValue(initialSettings.serviceProfitMargin || ''));
  const [clientRetentionRate, setClientRetentionRate] = useState<string>(normalizePercentageValue(initialSettings.clientRetentionRate || ''));
  const [activeSettingsTab, setActiveSettingsTab] = useState<'basic' | 'advanced' | 'analysis'>('basic');

  // Remarketing bridge
  const [remarketingAudienceSource, setRemarketingAudienceSource] = useState<string>(
    initialSettings.remarketingAudienceSource || 'manual'
  );
  const [remarketingAudience, setRemarketingAudience] = useState<string>(normalizeCurrencyValue(initialSettings.remarketingAudience || ''));

  const [results, setResults] = useState({
    brandingImpressions: 0,
    brandingReach: 0,
    brandingEngagements: 0,
    brandingWarmAudience: 0,
    brandingCostPerEngagement: 0,
    impressions: 0,
    adClicks: 0,
    websiteVisitors: 0,
    leads: 0,
    leadsToPatients: 0,
    realPatients: 0,
    totalClients: 0,
    costPerClick: 0,
    costPerLead: 0,
    costPerClient: 0,
    serviceRevenue: 0,
    serviceProfit: 0,
    servicePackageValue: 0,
    clientLifetimeValue: 0,
    returnOnInvestment: 0,
    estimatedClients: 0,
    activeRemarketingAudience: 0,
    calculatedBudget: 0
  });

  useEffect(() => {
    setBrandingBudget(normalizeCurrencyValue(initialSettings.brandingBudget || ''));
    setBrandingCpm(normalizeCurrencyValue(initialSettings.brandingCpm || ''));
    setBrandingFrequency(normalizeFloatValue(initialSettings.brandingFrequency || ''));
    setBrandingEngagementRate(normalizePercentageValue(initialSettings.brandingEngagementRate || ''));
    setBrandingQualificationRate('100');

    setConversionFrequency(normalizeFloatValue(initialSettings.conversionFrequency || ''));
    setBudget(normalizeCurrencyValue(initialSettings.budget || ''));
    setCpm(normalizeCurrencyValue(initialSettings.cpm || ''));
    setCtrLink(normalizePercentageValue(initialSettings.ctrLink || ''));
    setAdsClickToVisit(normalizePercentageValue(initialSettings.adsClickToVisit || ''));
    setWhatsappClick(normalizePercentageValue(initialSettings.whatsappClick || ''));
    setProspectToClient(normalizePercentageValue(initialSettings.prospectToClient || ''));
    setReservation(normalizePercentageValue(initialSettings.reservation || ''));
    setCrossSelling(normalizePercentageValue(initialSettings.crossSelling || ''));
    setServicePackageValue(normalizeCurrencyValue(initialSettings.servicePackageValue || ''));
    setServiceProfitMargin(normalizePercentageValue(initialSettings.serviceProfitMargin || ''));
    setClientRetentionRate(normalizePercentageValue(initialSettings.clientRetentionRate || ''));
    setRemarketingAudienceSource(initialSettings.remarketingAudienceSource || 'manual');
    setRemarketingAudience(normalizeCurrencyValue(initialSettings.remarketingAudience || ''));
  }, [initialSettings]);

  useEffect(() => {
    onSettingsChange({
      brandingBudget,
      brandingCpm,
      brandingFrequency,
      brandingEngagementRate,
      brandingQualificationRate: '100',
      conversionFrequency,
      budget,
      cpm,
      ctrLink,
      adsClickToVisit,
      whatsappClick,
      prospectToClient,
      reservation,
      crossSelling,
      servicePackageValue,
      serviceProfitMargin,
      clientRetentionRate,
      remarketingAudienceSource,
      remarketingAudience
    });
  }, [
    brandingBudget,
    brandingCpm,
    brandingFrequency,
    brandingEngagementRate,
    brandingQualificationRate,
    conversionFrequency,
    budget,
    cpm,
    ctrLink,
    adsClickToVisit,
    whatsappClick,
    prospectToClient,
    reservation,
    crossSelling,
    servicePackageValue,
    serviceProfitMargin,
    clientRetentionRate,
    remarketingAudienceSource,
    remarketingAudience,
    onSettingsChange
  ]);

  useEffect(() => {
    calculateResults();
  }, [
    brandingBudget,
    brandingCpm,
    brandingFrequency,
    brandingEngagementRate,
    brandingQualificationRate,
    conversionFrequency,
    budget,
    cpm,
    ctrLink,
    adsClickToVisit,
    whatsappClick,
    prospectToClient,
    reservation,
    crossSelling,
    servicePackageValue,
    serviceProfitMargin,
    clientRetentionRate,
    remarketingAudienceSource,
    remarketingAudience
  ]);

  const handleResetBranding = () => {
    setBrandingBudget('');
    setBrandingCpm('');
    setBrandingFrequency('');
    setBrandingEngagementRate('');
    setBrandingQualificationRate('100');
    if (remarketingAudienceSource === 'branding') {
      setRemarketingAudienceSource('manual');
    }
  };

  const handleResetConversion = () => {
    setConversionFrequency('');
    setBudget('');
    setCpm('');
    setCtrLink('');
    setAdsClickToVisit('');
    setWhatsappClick('');
    setProspectToClient('');
    setReservation('');
    setCrossSelling('');
    setServicePackageValue('');
    setServiceProfitMargin('');
    setClientRetentionRate('');
    setRemarketingAudienceSource('manual');
    setRemarketingAudience('');
    setConversionFrequencyError(null);
  };

  useEffect(() => {
    if (remarketingAudienceSource === 'branding' && results.brandingWarmAudience === 0) {
      setConversionFrequencyError(t('pages.campaignCalculator.services.error.noBrandingAudience', 'No audience from Branding campaign. Run Branding campaign first.'));
    } else if (conversionFrequency && floatStringToNumber(conversionFrequency) <= 0) {
      setConversionFrequencyError(t('pages.campaignCalculator.services.error.frequencyRequired', 'Remarketing frequency must be greater than 0.'));
    } else {
      setConversionFrequencyError(null);
    }
  }, [conversionFrequency, remarketingAudienceSource, results.brandingWarmAudience, t]);

  const calculateResults = () => {
    const brandingBudgetNum = currencyStringToNumber(brandingBudget);
    const brandingCpmNum = currencyStringToNumber(brandingCpm) || 1;
    const brandingFrequencyNum = floatStringToNumber(brandingFrequency);
    const safeFrequency = brandingFrequencyNum > 0 ? brandingFrequencyNum : 1;
    const brandingEngagementRateNum = percentageStringToNumber(brandingEngagementRate);
    const brandingQualificationRateNum = percentageStringToNumber(brandingQualificationRate);

    const brandingImpressions = Math.floor((brandingBudgetNum / brandingCpmNum) * 1000);
    const brandingReach = Math.floor(brandingImpressions / safeFrequency);
    const brandingEngagements = Math.floor(brandingReach * (brandingEngagementRateNum / 100));
    const brandingWarmAudience = Math.floor(brandingEngagements * (brandingQualificationRateNum / 100));
    const brandingCostPerEngagement = brandingEngagements > 0 ? brandingBudgetNum / brandingEngagements : 0;

    const conversionFrequencyNum = floatStringToNumber(conversionFrequency);
    const safeConversionFrequency = conversionFrequencyNum > 0 ? conversionFrequencyNum : 1;
    const cpmNum = currencyStringToNumber(cpm) || 1;
    const ctrLinkNum = percentageStringToNumber(ctrLink);
    const adsClickToVisitNum = percentageStringToNumber(adsClickToVisit);
    const whatsappClickNum = percentageStringToNumber(whatsappClick);
    const prospectToClientNum = percentageStringToNumber(prospectToClient);
    const reservationNum = percentageStringToNumber(reservation);
    const crossSellingNum = percentageStringToNumber(crossSelling);
    const servicePackageValueNum = currencyStringToNumber(servicePackageValue);
    const serviceProfitMarginNum = percentageStringToNumber(serviceProfitMargin);
    const clientRetentionRateNum = percentageStringToNumber(clientRetentionRate);

    const remarketingAudienceManualNum = currencyStringToNumber(remarketingAudience);
    const activeRemarketingAudience =
      remarketingAudienceSource === 'branding' ? brandingWarmAudience : remarketingAudienceManualNum;

    const baseImpressions = activeRemarketingAudience > 0 ? Math.floor(activeRemarketingAudience * safeConversionFrequency) : 0;
    const fallbackBudgetNum = currencyStringToNumber(budget);
    const fallbackImpressions = Math.floor((fallbackBudgetNum / cpmNum) * 1000);
    const impressions = baseImpressions > 0 ? baseImpressions : fallbackImpressions;
    const derivedBudgetNum = Math.round((impressions / 1000) * cpmNum);
    const derivedBudgetString = derivedBudgetNum.toString();

    const adClicks = Math.floor(activeRemarketingAudience * (ctrLinkNum / 100));
    const websiteVisitors = Math.floor(adClicks * (adsClickToVisitNum / 100));
    const leads = Math.floor(websiteVisitors * (whatsappClickNum / 100));
    const leadsToPatients = Math.floor(leads * (prospectToClientNum / 100));
    const realPatients = Math.floor(leadsToPatients * (reservationNum / 100));
    const crossSellingMultiplier = crossSellingNum > 0 ? crossSellingNum / 100 : 0;
    const estimatedClients = Math.floor(realPatients * (crossSellingMultiplier > 0 ? crossSellingMultiplier : 1));
    const totalClients = estimatedClients > 0 ? estimatedClients : realPatients;

    const costPerClick = adClicks > 0 ? derivedBudgetNum / adClicks : 0;
    const costPerLead = leads > 0 ? derivedBudgetNum / leads : 0;
    const costPerClient = totalClients > 0 ? derivedBudgetNum / totalClients : 0;
    const serviceRevenue = totalClients * servicePackageValueNum;
    const serviceProfit = serviceRevenue * (serviceProfitMarginNum / 100);
    const clientLifetimeValue = servicePackageValueNum * (1 + (clientRetentionRateNum / 100) * 2.5);
    const returnOnInvestment = derivedBudgetNum > 0 ? ((serviceProfit - derivedBudgetNum) / derivedBudgetNum) * 100 : 0;

    if (budget !== derivedBudgetString) {
      setBudget(derivedBudgetString);
    }

    setResults({
      brandingImpressions,
      brandingReach,
      brandingEngagements,
      brandingWarmAudience,
      brandingCostPerEngagement,
      impressions,
      adClicks,
      websiteVisitors,
      leads,
      leadsToPatients,
      realPatients,
      totalClients,
      costPerClick,
      costPerLead,
      costPerClient,
      serviceRevenue,
      serviceProfit,
      servicePackageValue: servicePackageValueNum,
      clientLifetimeValue,
      returnOnInvestment,
      estimatedClients,
      activeRemarketingAudience,
      calculatedBudget: derivedBudgetNum
    });

    if (remarketingAudienceSource === 'branding' && brandingWarmAudience === 0) {
      setRemarketingAudienceSource('manual');
    }
  };

  const generateDynamicRecommendations = () => {
    const recommendations: Array<{ icon: string; title: string; description: string }> = [];
    const warnings: Array<{ icon: string; title: string; description: string }> = [];

    const brandingEngagementRateNum = percentageStringToNumber(brandingEngagementRate);
    const brandingQualificationRateNum = percentageStringToNumber(brandingQualificationRate);
    const conversionFrequencyNum = floatStringToNumber(conversionFrequency);
    const ctrLinkNum = percentageStringToNumber(ctrLink);
    const adsClickToVisitNum = percentageStringToNumber(adsClickToVisit);
    const whatsappClickNum = percentageStringToNumber(whatsappClick);
    const clientRetentionRateNum = percentageStringToNumber(clientRetentionRate);
    const cpmNum = currencyStringToNumber(cpm);

    if (brandingEngagementRateNum < 3) {
      recommendations.push({
        icon: '✨',
        title: t('pages.campaignCalculator.services.recommendation.brandingContent.title', 'Strengthen Branding Content'),
        description: applyVariables(t('pages.campaignCalculator.services.recommendation.brandingContent.description', 'Engagement rate {{rate}}% is still low. Try varying content formats, use storytelling, or optimize soft CTA.'), { rate: String(brandingEngagementRateNum) })
      });
    }

    if (brandingQualificationRateNum < 25) {
      recommendations.push({
        icon: '🧲',
        title: t('pages.campaignCalculator.services.recommendation.consideration.title', 'Improve Consideration Quality'),
        description: applyVariables(t('pages.campaignCalculator.services.recommendation.consideration.description', 'Only {{rate}}% of engaged audience reach warm stage. Design middle funnel offers (webinar, lead magnet, case studies) to better prepare audience for retargeting.'), { rate: String(brandingQualificationRateNum) })
      });
    }

    if (conversionFrequencyNum > 0 && conversionFrequencyNum < 6) {
      recommendations.push({
        icon: '🔁',
        title: t('pages.campaignCalculator.services.recommendation.frequencyLow.title', 'Increase Remarketing Frequency'),
        description: applyVariables(t('pages.campaignCalculator.services.recommendation.frequencyLow.description', 'Current remarketing frequency is {{frequency}}x. Usually 7-8x exposure is needed for audience to decide to purchase.'), { frequency: conversionFrequencyNum.toFixed(1) })
      });
    } else if (conversionFrequencyNum > 12) {
      recommendations.push({
        icon: '⚡',
        title: t('pages.campaignCalculator.services.recommendation.frequencyHigh.title', 'Optimize Frequency Limit'),
        description: applyVariables(t('pages.campaignCalculator.services.recommendation.frequencyHigh.description', 'Frequency {{frequency}}x may be too high and can cause ad fatigue. Consider frequency limit of 8-10x.'), { frequency: conversionFrequencyNum.toFixed(1) })
      });
    }

    if (ctrLinkNum < 1.5) {
      recommendations.push({
        icon: '🎯',
        title: t('pages.campaignCalculator.services.recommendation.ctr.title', 'Optimize CTR'),
        description: applyVariables(t('pages.campaignCalculator.services.recommendation.ctr.description', 'CTR {{ctr}}% is still below standard. Adjust ad messaging with remarketing segments and test creative copy variations.'), { ctr: String(ctrLinkNum) })
      });
    }

    if (adsClickToVisitNum < 50) {
      recommendations.push({
        icon: '🌐',
        title: t('pages.campaignCalculator.services.recommendation.landing.title', 'Improve Landing Experience'),
        description: applyVariables(t('pages.campaignCalculator.services.recommendation.landing.description', 'Only {{rate}}% of visitors continue to the page. Check loading speed, content relevance, and CTA clarity.'), { rate: String(adsClickToVisitNum) })
      });
    }

    if (whatsappClickNum < 15) {
      recommendations.push({
        icon: '📞',
        title: t('pages.campaignCalculator.services.recommendation.cta.title', 'Strengthen Call-to-Action'),
        description: applyVariables(t('pages.campaignCalculator.services.recommendation.cta.description', 'Visitor to form submit conversion is only {{rate}}%. Add urgency or incentives so audience will fill out the form.'), { rate: String(whatsappClickNum) })
      });
    }

    if (clientRetentionRateNum < 60) {
      recommendations.push({
        icon: '🔄',
        title: t('pages.campaignCalculator.services.recommendation.retention.title', 'Retention Program'),
        description: applyVariables(t('pages.campaignCalculator.services.recommendation.retention.description', 'Retention rate {{rate}}% can be improved with follow-up SOP, loyalty program, or post-service education.'), { rate: String(clientRetentionRateNum) })
      });
    }

    if (cpmNum > 500000) {
      recommendations.push({
        icon: '💰',
        title: t('pages.campaignCalculator.services.recommendation.targeting.title', 'Targeting Audit'),
        description: applyVariables(t('pages.campaignCalculator.services.recommendation.targeting.description', 'CPM ({{cpm}}) is quite high. Test new segmentation or optimize placement to make awareness costs more efficient.'), { cpm: formatCurrency(cpmNum) })
      });
    }

    if (results.returnOnInvestment < 100) {
      warnings.push({
        icon: '⚠️',
        title: t('pages.campaignCalculator.services.warning.roi.title', 'ROI Not Optimal'),
        description: applyVariables(t('pages.campaignCalculator.services.warning.roi.description', 'ROI {{roi}}% is still below break-even point. Consider increasing service package value or cost efficiency in funnel.'), { roi: results.returnOnInvestment.toFixed(1) })
      });
    }

    if (results.costPerClient > results.servicePackageValue * 0.5 && results.servicePackageValue > 0) {
      warnings.push({
        icon: '⚠️',
        title: t('pages.campaignCalculator.services.warning.acquisition.title', 'High Acquisition Cost'),
        description: t('pages.campaignCalculator.services.warning.acquisition.description', 'Cost per client is more than 50% of package value. Recheck conversion ratio at each stage or renegotiate ad costs.')
      });
    }

    if (remarketingAudienceSource === 'branding' && results.brandingWarmAudience === 0) {
      warnings.push({
        icon: '♻️',
        title: t('pages.campaignCalculator.services.warning.noAudience.title', 'Empty Remarketing Audience'),
        description: t('pages.campaignCalculator.services.warning.noAudience.description', 'No engagement from Branding objective. Run awareness/consideration campaign first before conversion.')
      });
    }

    return { recommendations, warnings };
  };

  const { recommendations, warnings } = generateDynamicRecommendations();
  const brandingBudgetValue = currencyStringToNumber(brandingBudget);

  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={['branding', 'conversion']} className="space-y-4">
        <AccordionItem value="branding">
          <AccordionTrigger className="text-left text-lg font-semibold">
            Objective Branding
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleResetBranding}>
                  Reset Branding
                </Button>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Impressions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{formatNumber(results.brandingImpressions)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Reach (Unique)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{formatNumber(results.brandingReach)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Total Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{formatNumber(results.brandingEngagements)}</div>
                    <p className="text-xs text-gray-500 mt-1">{t('pages.campaignCalculator.services.description.engagementCombined', 'Combined likes, comments, shares, views, and other interaction actions.')}</p>
                  </CardContent>
                </Card>
                 <Card>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm font-medium text-gray-500">Cost per Engagement</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-semibold text-emerald-600">{formatCurrency(results.brandingCostPerEngagement)}</div>
                     <p className="text-xs text-gray-500 mt-1">{t('pages.campaignCalculator.services.description.costPerEngagement', 'Average cost for one engagement.')}</p>
                   </CardContent>
                 </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">{t('pages.campaignCalculator.services.label.warmAudience', 'Ready for Remarketing Audience')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-purple-600">{formatNumber(results.brandingWarmAudience)}</div>
                    <p className="text-xs text-gray-500 mt-1">{t('pages.campaignCalculator.services.description.warmAudience', 'Engaged visitors who pass middle funnel.')}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-blue-50">
                  <CardHeader>
                    <CardTitle>Branding KPI</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="branding-budget">Budget Branding (Rp)</Label>
                      <Input
                        id="branding-budget"
                        type="text"
                        value={formatCurrencyDisplay(brandingBudget)}
                        onChange={(e) => setBrandingBudget(normalizeCurrencyValue(e.target.value))}
                        className="mt-1"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="branding-cpm">CPM Branding (Rp)</Label>
                      <Input
                        id="branding-cpm"
                        type="text"
                        value={formatCurrencyDisplay(brandingCpm)}
                        onChange={(e) => setBrandingCpm(normalizeCurrencyValue(e.target.value))}
                        className="mt-1"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="branding-frequency">{t('pages.campaignCalculator.services.label.brandingFrequency', 'Average Frequency')}</Label>
                      <Input
                        id="branding-frequency"
                        type="text"
                        value={brandingFrequency}
                        onChange={(e) => setBrandingFrequency(normalizeFloatValue(e.target.value))}
                        className="mt-1"
                        placeholder="1"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50">
                  <CardHeader>
                    <CardTitle>Engagement & Consideration KPI</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="branding-engagement">Engagement Rate (%)</Label>
                      <PercentageInputField
                        id="branding-engagement"
                        value={brandingEngagementRate}
                        onValueChange={setBrandingEngagementRate}
                        placeholder="3"
                      />
                    </div>
                    <div>
                      <Label htmlFor="branding-qualification">Warm Audience Rate (%)</Label>
                      <Input
                        id="branding-qualification"
                        type="text"
                        value="100"
                        disabled
                        className="mt-1 pr-10 bg-gray-100 text-gray-600"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t('pages.campaignCalculator.services.description.warmAudienceAssumed', 'All engagements are assumed as remarketing audience (100%).')}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('pages.campaignCalculator.services.label.brandingSummary', 'Branding Funnel Summary')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>• {applyVariables(t('pages.campaignCalculator.services.description.brandingInvestment', 'Branding investment: {{amount}}'), { amount: formatCurrency(brandingBudgetValue) })}</p>
                    <p>• {applyVariables(t('pages.campaignCalculator.services.description.brandingImpressions', '{{impressions}} impressions to reach {{reach}} people.'), { impressions: formatNumber(results.brandingImpressions), reach: formatNumber(results.brandingReach) })}</p>
                    <p>• {applyVariables(t('pages.campaignCalculator.services.description.brandingEngagements', '{{engagements}} combined engagements achieved.'), { engagements: formatNumber(results.brandingEngagements) })}</p>
                    <p>• {applyVariables(t('pages.campaignCalculator.services.description.brandingWarmAudience', '{{audience}} audience ready for retargeting.'), { audience: formatNumber(results.brandingWarmAudience) })}</p>
                    <p>• {applyVariables(t('pages.campaignCalculator.services.description.brandingCostPerEngagement', 'Cost per engagement: {{cost}}'), { cost: formatCurrency(results.brandingCostPerEngagement) })}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="conversion">
          <AccordionTrigger className="text-left text-lg font-semibold">Objective Conversion</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="border border-blue-200 bg-blue-50/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700">Conversion Impressions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-blue-600">{formatNumber(results.impressions)}</div>
                    <p className="text-xs text-gray-500 mt-1">{t('pages.campaignCalculator.services.description.remarketingReach', 'Result from remarketing audience × frequency.')}</p>
                  </CardContent>
                </Card>
                <Card className="border border-blue-300 bg-blue-100/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-800">Conversion Budget</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-blue-700">{formatCurrency(results.calculatedBudget)}</div>
                    <p className="text-xs text-gray-500 mt-1">{t('pages.campaignCalculator.services.description.remarketingBudget', 'Automatically calculated from frequency, CPM, and remarketing audience.')}</p>
                  </CardContent>
                </Card>
                <Card className="border border-pink-200 bg-pink-50/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-pink-700">Conversion Leads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-pink-500">{formatNumber(results.leads)}</div>
                    <p className="text-xs text-gray-500 mt-1">Form submit dari funnel remarketing.</p>
                  </CardContent>
                </Card>
                <Card className="border border-purple-200 bg-purple-50/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700">{t('pages.campaignCalculator.services.label.totalClients', 'Total Clients')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-purple-600">{formatNumber(results.totalClients)}</div>
                    <p className="text-xs text-gray-500 mt-1">{t('pages.campaignCalculator.services.description.totalClients', 'Estimated new clients from conversion campaign.')}</p>
                  </CardContent>
                </Card>
                <Card className="border border-emerald-200 bg-emerald-50/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-700">{t('pages.campaignCalculator.services.label.costPerClient', 'Cost per Client')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-emerald-600">{formatCurrency(results.costPerClient)}</div>
                    <p className="text-xs text-gray-500 mt-1">{t('pages.campaignCalculator.services.description.costPerClient', 'Average cost to acquire one client.')}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center justify-between border-b mb-4 pb-1">
                <div className="flex space-x-6">
                  {[
                    { id: 'basic', label: 'Basic Settings' },
                    { id: 'advanced', label: 'Service Metrics' },
                    { id: 'analysis', label: 'Analysis' }
                  ].map((tab) => {
                    const isActive = activeSettingsTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveSettingsTab(tab.id as typeof activeSettingsTab)}
                        className={`py-2 text-sm font-medium border-b-2 transition-colors ${
                          isActive
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={handleResetConversion}>
                  Reset Conversion
                </Button>
              </div>

              {activeSettingsTab === 'basic' && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="bg-blue-50">
                    <CardHeader>
                      <CardTitle>Marketing KPI</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="remarketing-source">{t('pages.campaignCalculator.services.label.remarketingSource', 'Remarketing Audience Source')}</Label>
                        <Select value={remarketingAudienceSource} onValueChange={setRemarketingAudienceSource}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t('pages.campaignCalculator.services.placeholder.selectSource', 'Select source')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">{t('pages.campaignCalculator.services.option.manualInput', 'Manual Input')}</SelectItem>
                            <SelectItem value="branding" disabled={results.brandingWarmAudience === 0}>
                              {applyVariables(t('pages.campaignCalculator.services.option.brandingAudience', 'Branding Audience ({{count}} engagement)'), { count: formatNumber(results.brandingWarmAudience) })}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="remarketingAudience">{t('pages.campaignCalculator.services.label.remarketingAudienceCount', 'Remarketing Audience Count (people)')}</Label>
                        <Input
                          id="remarketingAudience"
                          type="text"
                          value={
                            remarketingAudienceSource === 'branding'
                              ? formatNumber(results.brandingWarmAudience)
                              : formatCurrencyDisplay(remarketingAudience)
                          }
                          onChange={(e) => setRemarketingAudience(normalizeCurrencyValue(e.target.value))}
                          className="mt-1"
                          placeholder="0"
                          disabled={remarketingAudienceSource === 'branding'}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {remarketingAudienceSource === 'branding'
                            ? t('pages.campaignCalculator.services.description.usingBrandingAudience', 'Using total Branding engagement as remarketing audience.')
                            : t('pages.campaignCalculator.services.description.manualAudience', 'Enter estimated remarketing audience if using other database.')}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="conversion-frequency">{t('pages.campaignCalculator.services.label.conversionFrequency', 'Remarketing Frequency')}</Label>
                        <Input
                          id="conversion-frequency"
                          type="text"
                          value={conversionFrequency}
                          onChange={(e) => setConversionFrequency(normalizeFloatValue(e.target.value))}
                          className="mt-1"
                          placeholder="7"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {t('pages.campaignCalculator.services.description.frequencyRecommendation', 'Average number of ad impressions per warm audience. Recommendation 7-8 times to drive decisions.')}
                        </p>
                        {conversionFrequencyError && (
                          <p className="text-xs text-red-500 mt-1">{conversionFrequencyError}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="cpm">CPM (Rp)</Label>
                        <Input
                          id="cpm"
                          type="text"
                          value={formatCurrencyDisplay(cpm)}
                          onChange={(e) => setCpm(normalizeCurrencyValue(e.target.value))}
                          className="mt-1"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="budget">Budget (Rp)</Label>
                        <Input
                          id="budget"
                          type="text"
                          value={formatCurrency(results.calculatedBudget)}
                          disabled
                          className="mt-1 bg-gray-100 text-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {t('pages.campaignCalculator.services.description.autoCalculated', 'Automatically calculated from frequency × remarketing audience × CPM.')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50">
                    <CardHeader>
                      <CardTitle>Conversion Rates</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="ctr">CTR Link (%)</Label>
                        <PercentageInputField
                          id="ctr"
                          value={ctrLink}
                          onValueChange={setCtrLink}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="adsClick">% Ads Click To Visit Page</Label>
                        <PercentageInputField
                          id="adsClick"
                          value={adsClickToVisit}
                          onValueChange={setAdsClickToVisit}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="whatsapp">Visitor yang Submit Form</Label>
                        <PercentageInputField
                          id="whatsapp"
                          value={whatsappClick}
                          onValueChange={setWhatsappClick}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="prospect">Prospek to Client</Label>
                        <PercentageInputField
                          id="prospect"
                          value={prospectToClient}
                          onValueChange={setProspectToClient}
                          placeholder="0"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50">
                    <CardHeader>
                      <CardTitle>Service Package</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="reservationInput">Register / Reservasi (%)</Label>
                        <PercentageInputField
                          id="reservationInput"
                          value={reservation}
                          onValueChange={setReservation}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="crossSellingBasic">Up Selling / Cross Selling (%)</Label>
                        <PercentageInputField
                          id="crossSellingBasic"
                          value={crossSelling}
                          onValueChange={setCrossSelling}
                          placeholder="0"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-3">
                    <CardHeader>
                      <CardTitle>{t('pages.campaignCalculator.services.label.conversionFunnelAnalysis', 'Conversion Funnel Analysis')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <span className="text-blue-500 mr-2">📊</span>
                            <span>{applyVariables(t('pages.campaignCalculator.services.funnel.impressions', 'Impressions: {{count}} impressions'), { count: formatNumber(results.impressions) })}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-blue-500 mr-2">👆</span>
                            <span>{applyVariables(t('pages.campaignCalculator.services.funnel.adClicks', 'Ad clicks: {{count}} people'), { count: formatNumber(results.adClicks) })}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-blue-500 mr-2">🌐</span>
                            <span>{applyVariables(t('pages.campaignCalculator.services.funnel.websiteVisitors', 'Website visitors: {{count}} people'), { count: formatNumber(results.websiteVisitors) })}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-green-500 mr-2">📞</span>
                            <span>{applyVariables(t('pages.campaignCalculator.services.funnel.formSubmit', 'Form submit: {{count}} people'), { count: formatNumber(results.leads) })}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-purple-500 mr-2">🎯</span>
                            <span>{applyVariables(t('pages.campaignCalculator.services.funnel.totalClients', 'Total clients: {{count}} clients'), { count: formatNumber(results.totalClients) })}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-purple-500 mr-2">♻️</span>
                            <span>{applyVariables(t('pages.campaignCalculator.services.funnel.activeRemarketingAudience', 'Active remarketing audience: {{count}} people'), { count: formatNumber(results.activeRemarketingAudience) })}</span>
                          </div>
                        </div>

                        <div className="space-y-2 border-l pl-6">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">📊</span>
                            <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                              {formatNumber(results.impressions)} {'>'} IMPRESSIONS
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">👆</span>
                            <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                              {formatNumber(results.adClicks)} {'>'} CLICKS
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">🌐</span>
                            <div className="bg-gray-100 px-3 py-1 rounded text-sm font-medium">
                              {formatNumber(results.websiteVisitors)} {'>'} VISITORS
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">📞</span>
                            <div className="bg-green-100 px-3 py-1 rounded text-sm font-medium">
                              {formatNumber(results.leads)} {'>'} LEADS
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">🎯</span>
                            <div className="bg-purple-200 px-3 py-1 rounded text-sm font-medium">
                              {formatNumber(results.totalClients)} {'>'} TOTAL CLIENTS
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSettingsTab === 'advanced' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="bg-orange-50">
                    <CardHeader>
                      <CardTitle>Client Lifecycle</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="retention">Client Retention Rate (%)</Label>
                        <PercentageInputField
                          id="retention"
                          value={clientRetentionRate}
                          onValueChange={setClientRetentionRate}
                          placeholder="0"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50">
                    <CardHeader>
                      <CardTitle>Service Financial Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="serviceValue">Service Package Value (Rp)</Label>
                        <Input
                          id="serviceValue"
                          type="text"
                          value={formatCurrencyDisplay(servicePackageValue)}
                          onChange={(e) => setServicePackageValue(normalizeCurrencyValue(e.target.value))}
                          className="mt-1"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="profitMargin">Service Profit Margin (%)</Label>
                        <PercentageInputField
                          id="profitMargin"
                          value={serviceProfitMargin}
                          onValueChange={setServiceProfitMargin}
                          placeholder="0"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Conversion Key Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>{t('pages.campaignCalculator.services.label.totalClients', 'Total Clients')}</Label>
                        <div className="mt-1 text-2xl font-semibold text-purple-600">
                          {formatNumber(results.totalClients)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{t('pages.campaignCalculator.services.description.totalClients', 'Estimated new clients from conversion campaign.')}</p>
                      </div>
                      <div>
                        <Label>{t('pages.campaignCalculator.services.label.costPerClient', 'Cost per Client')}</Label>
                        <div className="mt-1 text-2xl font-semibold text-emerald-600">
                          {formatCurrency(results.costPerClient)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{t('pages.campaignCalculator.services.description.costPerClient', 'Average cost to acquire one client.')}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSettingsTab === 'analysis' && (
                <Card className="bg-blue-50">
                  <CardHeader>
                    <CardTitle>{t('pages.campaignCalculator.services.label.optimizationRecommendations', 'Optimization Recommendations')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <div key={`rec-${index}`} className="flex items-start">
                        <span className="text-blue-500 mr-2 mt-1">{rec.icon}</span>
                        <span>
                          <strong>{rec.title}:</strong> {rec.description}
                        </span>
                      </div>
                    ))}
                    {warnings.map((warning, index) => (
                      <div key={`warn-${index}`} className="flex items-start">
                        <span className="text-red-500 mr-2 mt-1">{warning.icon}</span>
                        <span>
                          <strong>{warning.title}:</strong> {warning.description}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default EnhancedServicesCalculator;

