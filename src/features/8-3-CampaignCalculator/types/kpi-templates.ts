export interface KPITemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  type: CalculatorType;
  settings: ServiceKPISettings | SalesKPISettings;
  created_by: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  usage_count: number;
}

export type TemplateCategory = 
  | 'healthcare'
  | 'legal'
  | 'digital_agency'
  | 'business_consulting'
  | 'ecommerce'
  | 'saas'
  | 'digital_products'
  | 'physical_products'
  | 'custom';

export type CalculatorType = 'services' | 'sales';

export interface ServiceKPISettings {
  // Branding funnel inputs
  brandingBudget: string;
  brandingCpm: string;
  brandingFrequency: string;
  brandingEngagementRate: string;
  brandingQualificationRate: string;

  // Conversion funnel inputs
  conversionFrequency: string;
  budget: string;
  cpm: string;
  cpc?: string; // For Google Ads (CPC-based)
  ctrLink: string;
  adsClickToVisit: string;
  whatsappClick: string;
  prospectToClient: string;
  reservation: string;
  crossSelling: string;
  servicePackageValue: string;
  serviceProfitMargin: string;
  clientRetentionRate: string;

  // Remarketing controls
  remarketingAudienceSource: string;
  remarketingAudience: string;
  
  // Ad platform type for Traffic Calculator
  adType?: 'meta' | 'google'; // 'meta' for Meta Ads (CPM), 'google' for Google Ads (CPC)
}

export interface SalesKPISettings {
  budget: string;
  cpc: string;
  landingPageCtr: string;
  productViewRate: string;
  addToCartRate: string;
  checkoutRate: string;
  paymentSuccessRate: string;
  productPrice: string;
  avgOrderValue: string;
  profitMargin: string;
  repeatPurchaseRate: string;
  upsellRate: string;
  seasonalMultiplier: string;
}

export interface TemplateUsage {
  template_id: string;
  used_by: string;
  used_at: string;
  results: any;
}

export const TEMPLATE_CATEGORIES = {
  services: [
    { value: 'healthcare', label: 'Healthcare Services', description: 'Patient acquisition and medical services' },
    { value: 'legal', label: 'Legal Services', description: 'Legal consultation and case management' },
    { value: 'digital_agency', label: 'Digital Agency', description: 'Marketing and creative services' },
    { value: 'business_consulting', label: 'Business Consulting', description: 'Professional consulting services' },
    { value: 'custom', label: 'Custom Service', description: 'User-defined service template' }
  ],
  sales: [
    { value: 'ecommerce', label: 'E-commerce', description: 'Online retail and product sales' },
    { value: 'saas', label: 'SaaS Products', description: 'Software as a Service subscriptions' },
    { value: 'digital_products', label: 'Digital Products', description: 'Digital downloads and courses' },
    { value: 'physical_products', label: 'Physical Products', description: 'Physical goods and merchandise' },
    { value: 'custom', label: 'Custom Product', description: 'User-defined product template' }
  ]
} as const;
