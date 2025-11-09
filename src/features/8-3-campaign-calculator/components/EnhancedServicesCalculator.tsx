import { useEffect, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/features/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { ServiceKPISettings } from '../types/kpi-templates';

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
      setConversionFrequencyError('Belum ada audiens hasil Branding. Jalankan kampanye Branding terlebih dahulu.');
    } else if (conversionFrequency && floatStringToNumber(conversionFrequency) <= 0) {
      setConversionFrequencyError('Frekuensi remarketing harus lebih dari 0.');
    } else {
      setConversionFrequencyError(null);
    }
  }, [conversionFrequency, remarketingAudienceSource, results.brandingWarmAudience]);

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
        title: 'Perkuat Konten Branding',
        description: `Engagement rate ${brandingEngagementRateNum}% masih rendah. Coba variasikan format konten, gunakan storytelling, atau optimalkan CTA soft.`
      });
    }

    if (brandingQualificationRateNum < 25) {
      recommendations.push({
        icon: '🧲',
        title: 'Tingkatkan Kualitas Consideration',
        description: `Hanya ${brandingQualificationRateNum}% audiens ter-engage yang masuk ke tahap warm. Rancang penawaran middle funnel (webinar, lead magnet, studi kasus) agar audiens lebih siap di-retarget.`
      });
    }

    if (conversionFrequencyNum > 0 && conversionFrequencyNum < 6) {
      recommendations.push({
        icon: '🔁',
        title: 'Naikkan Frekuensi Remarketing',
        description: `Frekuensi remarketing saat ini ${conversionFrequencyNum.toFixed(1)}x. Biasanya dibutuhkan 7-8x paparan agar audiens memutuskan membeli.`
      });
    } else if (conversionFrequencyNum > 12) {
      recommendations.push({
        icon: '⚡',
        title: 'Optimalkan Batas Frekuensi',
        description: `Frekuensi ${conversionFrequencyNum.toFixed(1)}x mungkin terlalu tinggi dan dapat menimbulkan ad fatigue. Pertimbangkan batas frekuensi 8-10x.`
      });
    }

    if (ctrLinkNum < 1.5) {
      recommendations.push({
        icon: '🎯',
        title: 'Optimalkan CTR',
        description: `CTR ${ctrLinkNum}% masih di bawah standar. Sesuaikan pesan iklan dengan segmen remarketing dan uji variasi copy kreatif.`
      });
    }

    if (adsClickToVisitNum < 50) {
      recommendations.push({
        icon: '🌐',
        title: 'Perbaiki Landing Experience',
        description: `Hanya ${adsClickToVisitNum}% pengunjung yang lanjut ke halaman. Cek kecepatan loading, relevansi konten, dan kejelasan CTA.`
      });
    }

    if (whatsappClickNum < 15) {
      recommendations.push({
        icon: '📞',
        title: 'Perkuat Call-to-Action',
        description: `Konversi pengunjung ke form submit baru ${whatsappClickNum}%. Tambahkan urgensi atau insentif sehingga audiens mau mengisi formulir.`
      });
    }

    if (clientRetentionRateNum < 60) {
      recommendations.push({
        icon: '🔄',
        title: 'Program Retensi',
        description: `Retention rate ${clientRetentionRateNum}% bisa ditingkatkan dengan SOP follow-up, loyalty program, atau edukasi pasca layanan.`
      });
    }

    if (cpmNum > 500000) {
      recommendations.push({
        icon: '💰',
        title: 'Audit Targeting',
        description: `CPM (${formatCurrency(cpmNum)}) cukup tinggi. Uji segmentasi baru atau optimasi placement agar biaya awareness lebih efisien.`
      });
    }

    if (results.returnOnInvestment < 100) {
      warnings.push({
        icon: '⚠️',
        title: 'ROI Belum Optimal',
        description: `ROI ${results.returnOnInvestment.toFixed(1)}% masih di bawah titik impas. Pertimbangkan menaikkan nilai paket layanan atau efisiensi biaya di funnel.`
      });
    }

    if (results.costPerClient > results.servicePackageValue * 0.5 && results.servicePackageValue > 0) {
      warnings.push({
        icon: '⚠️',
        title: 'Biaya Akuisisi Tinggi',
        description: `Cost per client lebih dari 50% nilai paket. Cek kembali rasio konversi setiap tahap atau negosiasikan ulang biaya iklan.`
      });
    }

    if (remarketingAudienceSource === 'branding' && results.brandingWarmAudience === 0) {
      warnings.push({
        icon: '♻️',
        title: 'Audiens Remarketing Kosong',
        description: 'Belum ada engagement dari objective Branding. Jalankan kampanye awareness/consideration terlebih dahulu sebelum conversion.'
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
                    <p className="text-xs text-gray-500 mt-1">Gabungan likes, komen, share, view, dan aksi interaksi lain.</p>
                  </CardContent>
                </Card>
                 <Card>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm font-medium text-gray-500">Cost per Engagement</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-semibold text-emerald-600">{formatCurrency(results.brandingCostPerEngagement)}</div>
                     <p className="text-xs text-gray-500 mt-1">Biaya rata-rata untuk satu engagement.</p>
                   </CardContent>
                 </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Audiens Siap Remarketing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-purple-600">{formatNumber(results.brandingWarmAudience)}</div>
                    <p className="text-xs text-gray-500 mt-1">Pengunjung engaged yang lolos middle funnel.</p>
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
                      <Label htmlFor="branding-frequency">Frekuensi Rata-rata</Label>
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
                        Semua engagement diasumsikan sebagai audiens remarketing (100%).
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ringkasan Funnel Branding</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>• Investasi branding: {formatCurrency(brandingBudgetValue)}</p>
                    <p>• {formatNumber(results.brandingImpressions)} impresi untuk menjangkau {formatNumber(results.brandingReach)} orang.</p>
                    <p>• {formatNumber(results.brandingEngagements)} engagement gabungan tercapai.</p>
                    <p>• {formatNumber(results.brandingWarmAudience)} audiens siap di-retarget.</p>
                    <p>• Cost per engagement: {formatCurrency(results.brandingCostPerEngagement)}</p>
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
                    <p className="text-xs text-gray-500 mt-1">Hasil dari audiens remarketing × frekuensi.</p>
                  </CardContent>
                </Card>
                <Card className="border border-blue-300 bg-blue-100/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-800">Conversion Budget</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-blue-700">{formatCurrency(results.calculatedBudget)}</div>
                    <p className="text-xs text-gray-500 mt-1">Otomatis dari frekuensi, CPM, dan audiens remarketing.</p>
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
                    <CardTitle className="text-sm font-medium text-purple-700">Total Clients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-purple-600">{formatNumber(results.totalClients)}</div>
                    <p className="text-xs text-gray-500 mt-1">Estimasi klien baru dari kampanye conversion.</p>
                  </CardContent>
                </Card>
                <Card className="border border-emerald-200 bg-emerald-50/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-700">Cost per Client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-emerald-600">{formatCurrency(results.costPerClient)}</div>
                    <p className="text-xs text-gray-500 mt-1">Biaya rata-rata untuk memperoleh satu klien.</p>
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
                        <Label htmlFor="remarketing-source">Sumber Audiens Remarketing</Label>
                        <Select value={remarketingAudienceSource} onValueChange={setRemarketingAudienceSource}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Pilih sumber" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Input manual</SelectItem>
                            <SelectItem value="branding" disabled={results.brandingWarmAudience === 0}>
                              Audiens Branding ({formatNumber(results.brandingWarmAudience)} engagement)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="remarketingAudience">Jumlah Audiens Remarketing (orang)</Label>
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
                            ? 'Menggunakan total engagement Branding sebagai audiens remarketing.'
                            : 'Masukkan estimasi audiens remarketing jika memakai database lain.'}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="conversion-frequency">Frekuensi Remarketing</Label>
                        <Input
                          id="conversion-frequency"
                          type="text"
                          value={conversionFrequency}
                          onChange={(e) => setConversionFrequency(normalizeFloatValue(e.target.value))}
                          className="mt-1"
                          placeholder="7"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Rata-rata jumlah tayangan iklan per audiens warm. Rekomendasi 7-8 kali untuk mendorong keputusan.
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
                          Otomatis dihitung dari frekuensi × audiens remarketing × CPM.
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
                      <CardTitle>Conversion Funnel Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <span className="text-blue-500 mr-2">📊</span>
                            <span>Impressions: {formatNumber(results.impressions)} kali tayang</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-blue-500 mr-2">👆</span>
                            <span>Ad clicks: {formatNumber(results.adClicks)} orang</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-blue-500 mr-2">🌐</span>
                            <span>Website visitors: {formatNumber(results.websiteVisitors)} orang</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-green-500 mr-2">📞</span>
                            <span>Form submit: {formatNumber(results.leads)} orang</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-purple-500 mr-2">🎯</span>
                            <span>Total clients: {formatNumber(results.totalClients)} klien</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-purple-500 mr-2">♻️</span>
                            <span>Remarketing audience aktif: {formatNumber(results.activeRemarketingAudience)} orang</span>
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
                        <Label>Total Clients</Label>
                        <div className="mt-1 text-2xl font-semibold text-purple-600">
                          {formatNumber(results.totalClients)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Estimasi klien baru dari kampanye conversion.</p>
                      </div>
                      <div>
                        <Label>Cost per Client</Label>
                        <div className="mt-1 text-2xl font-semibold text-emerald-600">
                          {formatCurrency(results.costPerClient)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Biaya rata-rata untuk memperoleh satu klien.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeSettingsTab === 'analysis' && (
                <Card className="bg-blue-50">
                  <CardHeader>
                    <CardTitle>Rekomendasi Optimasi</CardTitle>
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

