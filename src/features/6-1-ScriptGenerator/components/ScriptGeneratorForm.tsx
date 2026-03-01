import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/features/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/features/ui/command';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/features/ui/accordion';
import { Sparkles, Loader2, X, ChevronDown, Check } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { ScriptGeneratorRequest } from '../services/scriptGeneratorService';
import { useProductKnowledge } from '@/features/6-1-ProductKnowledge/hooks/useProductKnowledge';
import { useProductKnowledgeStyle } from '@/features/6-1-ProductKnowledge/hooks/useProductKnowledgeStyle';
import { useProductKnowledgeHooks } from '@/features/6-1-ProductKnowledge/hooks/useProductKnowledgeHooks';
import { useKeywords } from '@/features/6-1-ProductKnowledge/hooks/useKeywords';
import { toast } from 'sonner';
import { Checkbox } from '@/features/ui/checkbox';
import { cn } from '@/lib/utils';

interface ScriptGeneratorFormProps {
  onGenerate: (data: ScriptGeneratorRequest) => Promise<void>;
  isGenerating: boolean;
}

// Judul templates - bisa digunakan oleh semua multi tenant
const judulTemplates = [
  {
    value: 'cara-melakukan',
    label: 'Cara [Melakukan Sesuatu] Dalam [Waktu Singkat] Dengan [Hasil Hebat]',
    template: 'Cara [Melakukan Sesuatu] Dalam [Waktu Singkat] Dengan [Hasil Hebat]'
  },
  {
    value: 'tips-mencapai',
    label: '[#] Tips untuk [Mencapai Tujuan/Hasil] yang Lebih Baik',
    template: '[#] Tips untuk [Mencapai Tujuan/Hasil] yang Lebih Baik'
  },
  {
    value: 'orang-tidak-tahu',
    label: '[#%] Orang Tidak Tahu [Fakta atau Statistik Penting]',
    template: '[#%] Orang Tidak Tahu [Fakta atau Statistik Penting]'
  },
  {
    value: 'testimoni',
    label: 'Pelanggan Kami Berkata: [Kutipan Positif Tentang Produk/Layanan]',
    template: 'Pelanggan Kami Berkata: [Kutipan Positif Tentang Produk/Layanan]'
  },
  {
    value: 'jangan-pernah',
    label: 'Jangan Pernah [Lakukan Sesuatu] Jika Anda Ingin [Hasil yang Lebih Baik]',
    template: 'Jangan Pernah [Lakukan Sesuatu] Jika Anda Ingin [Hasil yang Lebih Baik]'
  },
  {
    value: 'masalah-solusi',
    label: 'Masalah [Masalah Umum]? Inilah Solusinya!',
    template: 'Masalah [Masalah Umum]? Inilah Solusinya!'
  },
  {
    value: 'garansi',
    label: '100% Garansi [Manfaat atau Hasil] atau Uang Anda Kembali!',
    template: '100% Garansi [Manfaat atau Hasil] atau Uang Anda Kembali!'
  },
  {
    value: 'rahasia',
    label: 'Rahasia Terbesar dalam [Industri atau Topik] Terungkap!',
    template: 'Rahasia Terbesar dalam [Industri atau Topik] Terungkap!'
  },
  {
    value: 'perbandingan',
    label: '[Produk/Layanan A] vs. [Produk/Layanan B]: Mana yang Lebih Baik?',
    template: '[Produk/Layanan A] vs. [Produk/Layanan B]: Mana yang Lebih Baik?'
  },
  {
    value: 'panduan-langkah',
    label: 'Langkah-demi-Langkah Panduan Mendapatkan [Hasil yang Diinginkan]',
    template: 'Langkah-demi-Langkah Panduan Mendapatkan [Hasil yang Diinginkan]'
  },
  {
    value: 'panduan-khusus',
    label: 'Panduan Khusus Hanya untuk [Audience/Target Market]',
    template: 'Panduan Khusus Hanya untuk [Audience/Target Market]'
  },
  {
    value: 'seberapa-aman',
    label: 'Seberapa Aman [Sesuatu yang Berharga] dari [Ancaman]?',
    template: 'Seberapa Aman [Sesuatu yang Berharga] dari [Ancaman]?'
  },
  {
    value: 'tanda-peringatan',
    label: '[#Tanda] Peringatan Bahwa Ada [Sesuatu Yang Buruk]',
    template: '[#Tanda] Peringatan Bahwa Ada [Sesuatu Yang Buruk]'
  },
  {
    value: 'peringatan',
    label: 'Peringatan! [Masukan Sesuatu yang Buruk]',
    template: 'Peringatan! [Masukan Sesuatu yang Buruk]'
  },
  {
    value: 'resiko-faktor',
    label: '[#] Resiko/Faktor yang Sedikit Diketahui yang Dapat Menjadi [Sesuatu yang Buruk] pada [Sesuatu yang Berharga]',
    template: '[#] Resiko/Faktor yang Sedikit Diketahui yang Dapat Menjadi [Sesuatu yang Buruk] pada [Sesuatu yang Berharga]'
  },
  {
    value: 'kebenaran',
    label: 'Kebenaran Mengejutkan tentang [Sesuatu yang Berharga]',
    template: 'Kebenaran Mengejutkan tentang [Sesuatu yang Berharga]'
  }
];

export const ScriptGeneratorForm: React.FC<ScriptGeneratorFormProps> = ({
  onGenerate,
  isGenerating
}) => {
  const { t } = useAppTranslation();
  const { organizationId } = useCurrentOrg();
  
  const [formData, setFormData] = useState<ScriptGeneratorRequest>({
    content_type: '',
    service_name: '',
    sub_service_name: '',
    content_pillar: '',
    duration_minutes: undefined,
    slide: undefined,
    duration_value: undefined,
    duration_unit: 'detik',
    target_market: '',
    gender: '',
    age: '',
    buying_roles: '',
    keywords: [],
    keinginan: '',
    kebutuhan: '',
    hidden_needs: '',
    problem: '',
    impact: '',
    false_belief: '',
    false_belief_impact: '',
    what_makes_them_stop: '',
    feature_name: '',
    feature_description: '',
    competitive_advantage: '',
    solution: '',
    hook_name: '',
    hook_description: '',
    hook_content: '',
    style_name: '',
    style_instruksi: '',
    structure: '',
    judul: '',
    judul_custom: '',
    selling_approach: undefined,
    cta_type: undefined
  });
  
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedHookName, setSelectedHookName] = useState<string>('');
  const [selectedStyleName, setSelectedStyleName] = useState<string>('');
  const [selectedJudulTemplate, setSelectedJudulTemplate] = useState<string>('');
  const [errors, setErrors] = useState<{ target_market?: string; keywords?: string }>({});
  const [keywordSearchOpen, setKeywordSearchOpen] = useState<boolean>(false);
  const [keywordSearchQuery, setKeywordSearchQuery] = useState<string>('');
  const [useKeyword, setUseKeyword] = useState<boolean>(false);

  // Master data
  const [contentTypes, setContentTypes] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [subServices, setSubServices] = useState<any[]>([]);
  const [contentPillars, setContentPillars] = useState<any[]>([]);
  const [filteredSubServices, setFilteredSubServices] = useState<any[]>([]);
  
  // Fetch product knowledge for wants and needs
  const { data: productKnowledgeData = [] } = useProductKnowledge();
  
  // Fetch product knowledge style for style instructions
  const { data: productKnowledgeStyles = [] } = useProductKnowledgeStyle();
  
  // Fetch product knowledge hooks
  const { data: productKnowledgeHooks = [] } = useProductKnowledgeHooks();
  
  // Fetch keywords
  const { data: keywords = [] } = useKeywords();
  
  // Filter product knowledge that has wants and needs
  const productKnowledgeWithWantsNeeds = productKnowledgeData.filter(
    (pk) => pk.wants && pk.wants.trim() !== '' && pk.needs && pk.needs.trim() !== ''
  );
  
  // Extract unique target_audience (Customer Persona) from product knowledge
  const extractTargetAudienceAsString = (targetAudience: any): string => {
    if (!targetAudience) return '';
    if (typeof targetAudience === 'string') return targetAudience.trim();
    if (typeof targetAudience === 'object') {
      // If it's an object, try to stringify it or extract meaningful string
      try {
        const str = JSON.stringify(targetAudience);
        // If it's a simple object with one key-value, return the value
        if (Object.keys(targetAudience).length === 1) {
          return String(Object.values(targetAudience)[0]).trim();
        }
        return str;
      } catch {
        return String(targetAudience);
      }
    }
    return String(targetAudience).trim();
  };
  
  // Get unique customer personas from product knowledge filtered by selected service
  const customerPersonas = useMemo(() => {
    // Only show personas if service is selected
    if (!selectedServiceId) {
      return [];
    }
    
    const personasSet = new Set<string>();
    
    // Filter product knowledge by selected service
    productKnowledgeData.forEach((pk) => {
      // Check if service_id matches selected service
      if (pk.service_id === selectedServiceId && pk.target_audience) {
        const personaStr = extractTargetAudienceAsString(pk.target_audience);
        if (personaStr && personaStr.trim() !== '') {
          personasSet.add(personaStr);
        }
      }
    });
    
    return Array.from(personasSet).sort();
  }, [productKnowledgeData, selectedServiceId]);
  
  // Helper function to parse hidden_needs string into array
  const parseHiddenNeeds = (hiddenNeeds: string | null | undefined): string[] => {
    if (!hiddenNeeds || hiddenNeeds.trim() === '') return [];
    
    // Split by double newline first (like problems_solved format)
    if (hiddenNeeds.includes('\n\n')) {
      return hiddenNeeds
        .split(/\n\n+/)
        .map((item) => item.trim())
        .filter((item) => item !== '');
    }
    
    // Fallback to single newline
    return hiddenNeeds
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item !== '');
  };
  
  // Helper function to parse impact string into array
  const parseImpact = (impact: string | null | undefined): string[] => {
    if (!impact || impact.trim() === '') return [];
    
    // Split by double newline first (like problems_solved format)
    if (impact.includes('\n\n')) {
      return impact
        .split(/\n\n+/)
        .map((item) => item.trim())
        .filter((item) => item !== '');
    }
    
    // Fallback to single newline
    return impact
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item !== '');
  };
  
  // Helper function to format problems array to display string
  const formatProblemsForDisplay = (problems: string[] | null | undefined): string => {
    if (!problems || problems.length === 0) return '';
    // Format dengan newline dan baris kosong di antara setiap masalah untuk pemisahan visual
    return problems.filter(Boolean).join('\n\n');
  };

  // Helper function to parse competitive_advantage (can be array or string)
  const parseCompetitiveAdvantage = (competitiveAdvantage: any): string => {
    if (!competitiveAdvantage) return '';
    
    if (typeof competitiveAdvantage === 'string') {
      return competitiveAdvantage.trim();
    }
    
    if (Array.isArray(competitiveAdvantage)) {
      // Format dengan newline dan baris kosong di antara setiap advantage
      return competitiveAdvantage.filter(Boolean).join('\n\n');
    }
    
    if (typeof competitiveAdvantage === 'object') {
      return JSON.stringify(competitiveAdvantage);
    }
    
    return String(competitiveAdvantage);
  };

  // Load master data
  useEffect(() => {
    const loadMasterData = async () => {
      if (!organizationId) return;

      try {
        const [contentTypesResult, servicesResult, subServicesResult, contentPillarsResult] = await Promise.all([
          supabase
            .from('content_types')
            .select('*')
            .or(`organization_id.eq.${organizationId},organization_id.is.null`)
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('services')
            .select('*')
            .or(`organization_id.eq.${organizationId},organization_id.is.null`)
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('sub_services')
            .select('*')
            .or(`organization_id.eq.${organizationId},organization_id.is.null`)
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('content_pillars')
            .select('*')
            .or(`organization_id.eq.${organizationId},organization_id.is.null`)
            .eq('is_active', true)
            .order('name')
        ]);

        // Filter out any items with empty/null names to prevent SelectItem error
        setContentTypes((contentTypesResult.data || []).filter((t: any) => t?.name && typeof t.name === 'string' && t.name.trim() !== ''));
        setServices((servicesResult.data || []).filter((s: any) => s?.name && typeof s.name === 'string' && s.name.trim() !== '' && s?.id));
        setSubServices((subServicesResult.data || []).filter((ss: any) => ss?.name && typeof ss.name === 'string' && ss.name.trim() !== '' && ss?.id));
        setContentPillars((contentPillarsResult.data || []).filter((cp: any) => cp?.name && typeof cp.name === 'string' && cp.name.trim() !== ''));
      } catch (error) {
        console.error('Error loading master data:', error);
      }
    };

    loadMasterData();
  }, [organizationId]);

  // Filter sub services based on selected service
  useEffect(() => {
    if (selectedServiceId && subServices.length > 0) {
      const filtered = subServices.filter(
        (ss: any) => ss.service_id === selectedServiceId && ss.name && ss.name.trim() !== ''
      );
      setFilteredSubServices(filtered);
    } else {
      setFilteredSubServices([]);
    }
  }, [selectedServiceId, subServices]);

  // Clear selected style if it doesn't match the selected content pillar
  useEffect(() => {
    if (!formData.content_pillar || !formData.style_name) {
      return;
    }
    
    // Find the selected style
    const selectedStyle = productKnowledgeStyles.find(
      (style) => style.name === formData.style_name
    );
    
    if (!selectedStyle) {
      return;
    }
    
    // Find the content pillar ID from the pillar name
    const selectedPillar = contentPillars.find(
      (pillar) => pillar.name === formData.content_pillar
    );
    
    if (!selectedPillar) {
      return;
    }
    
    // Check if style is compatible with selected pillar
    const pillarIds = selectedStyle.content_pillar_ids || [];
    const isUniversal = pillarIds.length === 0;
    const includesSelectedPillar = pillarIds.includes(selectedPillar.id);
    
    // If style is not universal and doesn't include selected pillar, clear it
    if (!isUniversal && !includesSelectedPillar) {
      setSelectedStyleName('');
      handleInputChange('style_name', '');
      handleInputChange('style_instruksi', '');
      handleInputChange('structure', '');
    }
  }, [formData.content_pillar, formData.style_name, productKnowledgeStyles, contentPillars]);

  const handleInputChange = (field: keyof ScriptGeneratorRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Reset sub_service when service changes
    if (field === 'service_name') {
      setFormData(prev => ({
        ...prev,
        service_name: value,
        sub_service_name: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Customer Persona and Keywords are required (keywords only if useKeyword is checked)
    const newErrors: { target_market?: string; keywords?: string } = {};
    
    if (!formData.target_market || formData.target_market.trim() === '') {
      newErrors.target_market = 'Customer Persona wajib diisi';
    }
    
    // Keywords are only required if useKeyword checkbox is checked
    if (useKeyword && (!formData.keywords || formData.keywords.length === 0)) {
      newErrors.keywords = 'Keyword wajib diisi (minimal 1 keyword)';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Mohon lengkapi field yang wajib diisi');
      return;
    }
    
    // Clear errors if validation passes
    setErrors({});
    // Compute plan IDs for Save to Plan auto-fill
    const content_type_id = contentTypes.find((ct: { name: string }) => ct.name === formData.content_type)?.id ?? '';
    const service_id = selectedServiceId || '';
    const sub_service_id = filteredSubServices.find((ss: { name: string }) => ss.name === formData.sub_service_name)?.id ?? '';
    const content_pillar_id = contentPillars.find((cp: { name: string }) => cp.name === formData.content_pillar)?.id ?? '';
    // Pass useKeyword flag and plan IDs to the service
    await onGenerate({
      ...formData,
      useKeyword,
      content_type_id,
      service_id,
      sub_service_id,
      content_pillar_id,
    });
  };

  const handleReset = () => {
    setFormData({
      content_type: '',
      service_name: '',
      sub_service_name: '',
      content_pillar: '',
      duration_minutes: undefined,
      slide: undefined,
      duration_value: undefined,
      duration_unit: 'detik',
      target_market: '',
      gender: '',
      age: '',
      buying_roles: '',
      keywords: [],
      keinginan: '',
      kebutuhan: '',
      hidden_needs: '',
      problem: '',
      impact: '',
      false_belief: '',
      false_belief_impact: '',
      what_makes_them_stop: '',
      feature_name: '',
      feature_description: '',
      competitive_advantage: '',
      solution: '',
      hook_name: '',
      hook_description: '',
      hook_content: '',
      style_name: '',
      style_instruksi: '',
      structure: '',
      judul: '',
      judul_custom: '',
      selling_approach: undefined,
      cta_type: undefined
    });
    setSelectedServiceId('');
    setSelectedHookName('');
    setSelectedStyleName('');
    setSelectedJudulTemplate('');
    setUseKeyword(false);
    setErrors({});
  };

  // Filter keywords by selected service
  const filteredKeywords = useMemo(() => {
    if (!selectedServiceId) return [];
    return keywords.filter(k => k.service_id === selectedServiceId);
  }, [keywords, selectedServiceId]);

  // Filter keywords by search query
  const searchableKeywords = useMemo(() => {
    const availableKeywords = filteredKeywords.filter(
      (kw) => !formData.keywords?.includes(kw.keyword)
    );
    
    if (!keywordSearchQuery.trim()) {
      return availableKeywords;
    }
    
    const query = keywordSearchQuery.toLowerCase();
    return availableKeywords.filter((kw) =>
      kw.keyword.toLowerCase().includes(query)
    );
  }, [filteredKeywords, formData.keywords, keywordSearchQuery]);

  // Reset search query when popover closes
  useEffect(() => {
    if (!keywordSearchOpen) {
      setKeywordSearchQuery('');
    }
  }, [keywordSearchOpen]);

  const handleAddKeyword = (keywordText: string) => {
    if (formData.keywords && formData.keywords.length >= 3) {
      toast.error('Maksimal 3 keyword');
      return;
    }
    if (formData.keywords?.includes(keywordText)) {
      toast.error('Keyword sudah ada');
      return;
    }
    setFormData(prev => ({
      ...prev,
      keywords: [...(prev.keywords || []), keywordText]
    }));
    // Clear error when keyword is added
    if (errors.keywords) {
      setErrors(prev => ({ ...prev, keywords: undefined }));
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords?.filter(k => k !== keywordToRemove) || []
    }));
    // Validate after removal
    const remainingKeywords = formData.keywords?.filter(k => k !== keywordToRemove) || [];
    if (remainingKeywords.length === 0 && errors.keywords) {
      setErrors(prev => ({ ...prev, keywords: 'Keyword wajib diisi (minimal 1 keyword)' }));
    } else if (remainingKeywords.length > 0 && errors.keywords) {
      setErrors(prev => ({ ...prev, keywords: undefined }));
    }
  };

  // Determine field type based on content type
  const contentTypeLower = (formData.content_type || '').toLowerCase();
  const isPostOrCarousel = contentTypeLower === 'post' || contentTypeLower === 'carousel';
  const isReelStoryYoutube = contentTypeLower === 'reel' || contentTypeLower === 'story' || contentTypeLower === 'youtube';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Accordion type="single" defaultValue="basic-info" collapsible className="w-full space-y-2">
        {/* Section 1: Basic Information */}
        <AccordionItem value="basic-info" className="border rounded-lg px-3 transition-colors data-[state=open]:bg-blue-50 data-[state=open]:border-blue-200 data-[state=closed]:bg-white data-[state=closed]:border-gray-200">
          <AccordionTrigger className="py-2 text-base font-semibold data-[state=open]:text-blue-700 data-[state=closed]:text-gray-700">
            {t('scriptGenerator.form.basicInfo', 'Informasi Dasar')}
          </AccordionTrigger>
          <AccordionContent className="pb-2 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Content Type */}
              <div className="space-y-1">
                <Label htmlFor="content_type">Content Type</Label>
                <Select
                  value={formData.content_type || ""}
                  onValueChange={(value) => {
                    handleInputChange('content_type', value);
                    // Reset duration/slide when content type changes
                    setFormData(prev => ({
                      ...prev,
                      content_type: value,
                      slide: undefined,
                      duration_value: undefined,
                      duration_unit: 'detik'
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Content Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes
                      .filter((type) => {
                        const name = type?.name;
                        return name && typeof name === 'string' && name.trim() !== '' && type?.id;
                      })
                      .map((type) => {
                        const value = String(type.name).trim();
                        return (
                          <SelectItem key={type.id} value={value}>
                            {type.name}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              {/* Slide or Duration - conditional based on Content Type */}
              {isPostOrCarousel ? (
                <div className="space-y-1">
                  <Label htmlFor="slide">Slide</Label>
                  <Input
                    id="slide"
                    type="number"
                    min="1"
                    value={formData.slide || ''}
                    onChange={(e) => handleInputChange('slide', parseInt(e.target.value) || undefined)}
                    placeholder="Contoh: 5"
                  />
                </div>
              ) : isReelStoryYoutube ? (
                <div className="space-y-1">
                  <Label htmlFor="duration_value">Durasi</Label>
                  <div className="flex gap-2">
                    <Input
                      id="duration_value"
                      type="number"
                      min="1"
                      value={formData.duration_value || ''}
                      onChange={(e) => handleInputChange('duration_value', parseInt(e.target.value) || undefined)}
                      placeholder="Contoh: 60"
                      className="flex-1"
                    />
                    <Select
                      value={formData.duration_unit || 'detik'}
                      onValueChange={(value) => handleInputChange('duration_unit', value as 'menit' | 'detik')}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="menit">Menit</SelectItem>
                        <SelectItem value="detik">Detik</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              {/* Service */}
              <div className="space-y-1">
                <Label htmlFor="service_name">Service</Label>
                <Select
                  value={selectedServiceId || ""}
                  onValueChange={(serviceId) => {
                    const selectedService = services.find(s => s.id === serviceId);
                    setSelectedServiceId(serviceId);
                    handleInputChange('service_name', selectedService?.name || '');
                    handleInputChange('sub_service_name', ''); // Reset sub service
                    handleInputChange('target_market', ''); // Reset Customer Persona when service changes
                    handleInputChange('keywords', []); // Reset keywords when service changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services
                      .filter((service) => {
                        const id = service?.id;
                        const name = service?.name;
                        return id && name && typeof name === 'string' && name.trim() !== '' && typeof id === 'string' && id.trim() !== '';
                      })
                      .map((service) => {
                        const value = String(service.id).trim();
                        return (
                          <SelectItem key={service.id} value={value}>
                            {service.name}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              {/* Sub Service */}
              <div className="space-y-1">
                <Label htmlFor="sub_service_name">Sub Service</Label>
                <Select
                  value={formData.sub_service_name || ""}
                  onValueChange={(value) => handleInputChange('sub_service_name', value)}
                  disabled={!selectedServiceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedServiceId ? "Pilih Sub Service" : "Pilih Service dulu"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubServices
                      .filter((subService) => {
                        const name = subService?.name;
                        return name && typeof name === 'string' && name.trim() !== '' && subService?.id;
                      })
                      .map((subService) => {
                        const value = String(subService.name).trim();
                        return (
                          <SelectItem key={subService.id} value={value}>
                            {subService.name}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Pillar & Pendekatan Content - sejajar dalam satu baris, keduanya punya wrapper */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch md:col-span-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1 flex flex-col min-h-[72px]">
                  <Label htmlFor="content_pillar">{t('scriptGenerator.form.contentPillar', 'Content Pillar')}</Label>
                  <Select
                    value={formData.content_pillar || ""}
                    onValueChange={(value) => handleInputChange('content_pillar', value)}
                  >
                    <SelectTrigger id="content_pillar" className="flex-1 min-h-[40px]">
                      <SelectValue placeholder={t('scriptGenerator.form.contentPillarPlaceholder', 'Pilih Content Pillar')} />
                    </SelectTrigger>
                    <SelectContent
                      className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] border-2 border-gray-200 bg-white shadow-lg"
                      position="popper"
                    >
                      {contentPillars
                        .filter((pillar) => {
                          const name = pillar?.name;
                          return name && typeof name === 'string' && name.trim() !== '' && pillar?.id;
                        })
                        .flatMap((pillar, index) => {
                          const value = String(pillar.name).trim();
                          return [
                            index > 0 && <SelectSeparator key={`sep-${pillar.id}`} className="my-1 bg-gray-200" />,
                            <SelectItem
                              key={pillar.id}
                              value={value}
                              className={cn(
                                "break-words whitespace-normal",
                                index % 2 === 1 && "bg-gray-50/80"
                              )}
                            >
                              {pillar.name}
                            </SelectItem>
                          ];
                        }).filter(Boolean)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pendekatan Content - wrapper dengan warna: Tanpa Produk=hijau, Soft Selling=kuning, Hard Selling=merah */}
                {(() => {
                  const sellingApproach = formData.selling_approach;
                  const wrapperClasses = cn(
                    'rounded-lg border p-3 space-y-1 transition-colors flex flex-col min-h-[72px]',
                    sellingApproach === 'Tanpa Produk' && 'bg-green-50 border-green-200',
                    sellingApproach === 'Soft Selling' && 'bg-amber-50 border-amber-200',
                    sellingApproach === 'Hard Selling' && 'bg-red-50 border-red-200',
                    !sellingApproach && 'bg-gray-50 border-gray-200'
                  );
                  const triggerClasses = cn(
                    'min-w-0 overflow-hidden [&>span]:min-w-0 [&>span]:truncate flex-1 min-h-[40px]',
                    sellingApproach === 'Tanpa Produk' && 'border-green-300 bg-white focus:ring-green-500',
                    sellingApproach === 'Soft Selling' && 'border-amber-300 bg-white focus:ring-amber-500',
                    sellingApproach === 'Hard Selling' && 'border-red-300 bg-white focus:ring-red-500'
                  );
                  return (
                    <div className={wrapperClasses}>
                      <Label htmlFor="selling_approach">
                        {t('scriptGenerator.form.approachLabel', 'Pendekatan Content')}
                      </Label>
                      <Select
                        value={formData.selling_approach || ""}
                        onValueChange={(value) => handleInputChange('selling_approach', value as 'Tanpa Produk' | 'Soft Selling' | 'Hard Selling')}
                      >
                        <SelectTrigger id="selling_approach" className={triggerClasses}>
                          <SelectValue placeholder={t('scriptGenerator.form.approachPlaceholder', 'Pilih Pendekatan Content')} />
                        </SelectTrigger>
                        <SelectContent
                          className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] border-2 border-gray-200 bg-white shadow-lg"
                          position="popper"
                        >
                          <SelectItem value="Tanpa Produk" className="break-words whitespace-normal text-green-800 data-[highlighted]:bg-green-100 data-[state=checked]:bg-green-100">
                            {t('scriptGenerator.form.approachTanpaProduk', 'Tanpa Produk - Tidak membahas produk sama sekali')}
                          </SelectItem>
                          <SelectSeparator className="my-1 bg-gray-200" />
                          <SelectItem value="Soft Selling" className="break-words whitespace-normal text-amber-800 data-[highlighted]:bg-amber-100 data-[state=checked]:bg-amber-100 bg-gray-50/80">
                            {t('scriptGenerator.form.approachSoftSelling', 'Soft Selling - Bicara produk tetapi sangat soft')}
                          </SelectItem>
                          <SelectSeparator className="my-1 bg-gray-200" />
                          <SelectItem value="Hard Selling" className="break-words whitespace-normal text-red-800 data-[highlighted]:bg-red-100 data-[state=checked]:bg-red-100">
                            {t('scriptGenerator.form.approachHardSelling', 'Hard Selling - 100% bicara Produk, keunggulan dan fitur')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Target Audience & Customer Insights (combined - lihat insight saat persona dipilih) */}
        <AccordionItem value="target-audience" className="border rounded-lg px-3 transition-colors data-[state=open]:bg-blue-50 data-[state=open]:border-blue-200 data-[state=closed]:bg-white data-[state=closed]:border-gray-200">
          <AccordionTrigger className="py-2 text-base font-semibold data-[state=open]:text-blue-700 data-[state=closed]:text-gray-700">
            Target Audience & Customer Insights
          </AccordionTrigger>
          <AccordionContent className="pb-2 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Customer Persona */}
              <div className="space-y-1">
                <Label htmlFor="target_market">
                  Customer Persona <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.target_market || ""}
                  onValueChange={(value) => {
                    // Clear error when value changes
                    if (errors.target_market) {
                      setErrors(prev => ({ ...prev, target_market: undefined }));
                    }
                    
                    const normalizePersona = (s: string) => (s || '').trim();
                    const matchingPKs = productKnowledgeData.filter((pk) => {
                      if (pk.service_id !== selectedServiceId) return false;
                      if (!pk.target_audience) return false;
                      const pkPersonaStr = normalizePersona(extractTargetAudienceAsString(pk.target_audience));
                      return pkPersonaStr === normalizePersona(value);
                    });
                    
                    const matchingWithWantsNeeds = productKnowledgeWithWantsNeeds.filter((pk) => {
                      if (pk.service_id !== selectedServiceId) return false;
                      if (!pk.target_audience) return false;
                      const pkPersonaStr = normalizePersona(extractTargetAudienceAsString(pk.target_audience));
                      return pkPersonaStr === normalizePersona(value);
                    });
                    
                    const selectedPK = matchingWithWantsNeeds.length > 0
                      ? matchingWithWantsNeeds[0]
                      : matchingPKs[0];
                    
                    const updates: Partial<ScriptGeneratorRequest> = { target_market: value };
                    
                    if (matchingPKs.length > 0 && selectedPK) {
                      const wantsVal = selectedPK.wants?.trim() || '';
                      const needsVal = selectedPK.needs?.trim()
                        || (matchingPKs.find((pk) => pk.needs?.trim())?.needs?.trim() || '');
                      
                      updates.keinginan = wantsVal;
                      updates.kebutuhan = needsVal;
                      updates.hidden_needs = selectedPK.hidden_needs
                        ? (parseHiddenNeeds(selectedPK.hidden_needs).join('\n\n') || '')
                        : '';
                      updates.problem = selectedPK.problems_solved && Array.isArray(selectedPK.problems_solved)
                        ? selectedPK.problems_solved.filter(Boolean).join('\n\n')
                        : '';
                      updates.impact = selectedPK.impact
                        ? (parseImpact(selectedPK.impact).join('\n\n') || '')
                        : '';
                      updates.false_belief = selectedPK.false_belief?.trim() || '';
                      updates.false_belief_impact = selectedPK.false_belief_impact?.trim() || '';
                      updates.what_makes_them_stop = selectedPK.what_makes_them_stop?.trim() || '';
                      updates.solution = selectedPK.solusi?.trim() || '';
                      updates.feature_name = selectedPK.feature_name?.trim() || '';
                      updates.feature_description = selectedPK.feature_description?.trim() || '';
                      updates.competitive_advantage = selectedPK.competitive_advantage
                        ? parseCompetitiveAdvantage(selectedPK.competitive_advantage)
                        : '';
                    } else {
                      updates.keinginan = '';
                      updates.kebutuhan = '';
                      updates.hidden_needs = '';
                      updates.problem = '';
                      updates.impact = '';
                      updates.false_belief = '';
                      updates.false_belief_impact = '';
                      updates.what_makes_them_stop = '';
                      updates.solution = '';
                      updates.feature_name = '';
                      updates.feature_description = '';
                      updates.competitive_advantage = '';
                    }
                    
                    setFormData((prev) => ({ ...prev, ...updates }));
                  }}
                  disabled={!selectedServiceId}
                >
                  <SelectTrigger className={cn(
                    'min-w-0 overflow-hidden [&>span]:min-w-0 [&>span]:truncate',
                    errors.target_market && 'border-red-500'
                  )}>
                    <SelectValue placeholder={selectedServiceId ? "Pilih Customer Persona" : "Pilih Service terlebih dahulu"} />
                  </SelectTrigger>
                  <SelectContent
                    className="max-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]"
                    position="popper"
                  >
                    {!selectedServiceId ? (
                      <SelectItem value="select-service-first" disabled>
                        Pilih Service terlebih dahulu
                      </SelectItem>
                    ) : customerPersonas.length === 0 ? (
                      <SelectItem value="no-data" disabled>
                        Tidak ada Customer Persona tersedia untuk Service ini
                      </SelectItem>
                    ) : (
                      customerPersonas.map((persona, index) => (
                        <SelectItem
                          key={index}
                          value={persona}
                          className="break-words whitespace-normal items-start py-2"
                        >
                          <span className="block break-words line-clamp-3" title={persona}>
                            {persona}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.target_market && (
                  <p className="text-sm text-red-500 mt-1">{errors.target_market}</p>
                )}
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender || ""}
                  onValueChange={(value) => handleInputChange('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Gender" />
                  </SelectTrigger>
                  <SelectContent
                    className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] border-2 border-gray-200 bg-white shadow-lg"
                    position="popper"
                  >
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectSeparator className="my-1 bg-gray-200" />
                    <SelectItem value="Perempuan" className="bg-gray-50/80">Perempuan</SelectItem>
                    <SelectSeparator className="my-1 bg-gray-200" />
                    <SelectItem value="Semua">Semua</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age */}
              <div className="space-y-1">
                <Label htmlFor="age">Umur</Label>
                <Input
                  id="age"
                  value={formData.age || ''}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  placeholder="Contoh: 25-40 tahun"
                />
              </div>

              {/* Buying Roles */}
              <div className="space-y-1">
                <Label htmlFor="buying_roles">Buying Roles</Label>
                <Input
                  id="buying_roles"
                  value={formData.buying_roles || ''}
                  onChange={(e) => handleInputChange('buying_roles', e.target.value)}
                  placeholder="Contoh: Decision Maker, Influencer"
                />
              </div>

              {/* Keywords - Full width */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="keywords" className="cursor-pointer">
                    Keyword (Maksimal 3)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="use-keyword"
                      checked={useKeyword}
                      onCheckedChange={(checked) => {
                        setUseKeyword(checked === true);
                        // Clear keywords error when checkbox is unchecked
                        if (!checked && errors.keywords) {
                          setErrors(prev => ({ ...prev, keywords: undefined }));
                        }
                        // Validate when checkbox is checked
                        if (checked && (!formData.keywords || formData.keywords.length === 0)) {
                          setErrors(prev => ({ ...prev, keywords: 'Keyword wajib diisi (minimal 1 keyword)' }));
                        }
                      }}
                    />
                    <Label htmlFor="use-keyword" className="text-sm font-normal cursor-pointer">
                      Gunakan Keyword
                    </Label>
                  </div>
                  {useKeyword && <span className="text-red-500">*</span>}
                </div>
                <Popover open={keywordSearchOpen} onOpenChange={setKeywordSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="keywords"
                      variant="outline"
                      role="combobox"
                      aria-expanded={keywordSearchOpen}
                      className={`w-full justify-between ${errors.keywords ? 'border-red-500' : ''}`}
                      disabled={!useKeyword || !selectedServiceId || (formData.keywords && formData.keywords.length >= 3)}
                    >
                      {!useKeyword
                        ? "Aktifkan checkbox untuk menggunakan keyword"
                        : !selectedServiceId
                        ? "Pilih Service terlebih dahulu"
                        : formData.keywords && formData.keywords.length >= 3
                        ? "Maksimal 3 keyword sudah tercapai"
                        : "Pilih Keyword"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Cari keyword..."
                        value={keywordSearchQuery}
                        onValueChange={setKeywordSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {!selectedServiceId
                            ? "Pilih Service terlebih dahulu"
                            : filteredKeywords.length === 0
                            ? "Tidak ada keyword tersedia untuk Service ini"
                            : "Keyword tidak ditemukan"}
                        </CommandEmpty>
                        <CommandGroup>
                          {searchableKeywords.map((kw) => (
                            <CommandItem
                              key={kw.id}
                              value={kw.keyword}
                              onSelect={() => {
                                handleAddKeyword(kw.keyword);
                                setKeywordSearchQuery('');
                                setKeywordSearchOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.keywords?.includes(kw.keyword)
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                }`}
                              />
                              {kw.keyword}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formData.keywords && formData.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.keywords.map((keyword, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        <span>{keyword}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {formData.keywords && formData.keywords.length >= 3 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimal 3 keyword sudah tercapai
                  </p>
                )}
                {!useKeyword && (
                  <p className="text-xs text-gray-500 mt-1">
                    Centang checkbox "Gunakan Keyword" untuk mengaktifkan field keyword
                  </p>
                )}
                {useKeyword && !selectedServiceId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Pilih Service terlebih dahulu untuk memilih keyword
                  </p>
                )}
                {errors.keywords && (
                  <p className="text-sm text-red-500 mt-1">{errors.keywords}</p>
                )}
              </div>
            </div>

            {/* Customer Insights - langsung terlihat saat Customer Persona dipilih */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Customer Insights</h4>
              <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="keinginan">Keinginan</Label>
                  <Select
                    value={formData.keinginan || ""}
                    onValueChange={(value) => {
                      // Update keinginan first
                      handleInputChange('keinginan', value);
                      
                      // Find the product knowledge item with this wants value
                      const selectedPK = productKnowledgeWithWantsNeeds.find(
                        (pk) => pk.wants?.trim() === value
                      );
                      
                      // Auto-fill needs if found
                      if (selectedPK && selectedPK.needs) {
                        const needsValue = selectedPK.needs.trim();
                        handleInputChange('kebutuhan', needsValue);
                      } else {
                        // Clear kebutuhan if no product knowledge found or no needs available
                        handleInputChange('kebutuhan', '');
                      }
                      
                      // Auto-fill solution if found
                      if (selectedPK && selectedPK.solusi) {
                        const solusiValue = selectedPK.solusi.trim();
                        handleInputChange('solution', solusiValue);
                      } else {
                        // Clear solution if no product knowledge found or no solusi available
                        handleInputChange('solution', '');
                      }
                      
                      // Auto-fill hidden needs if found
                      if (selectedPK && selectedPK.hidden_needs) {
                        const hiddenNeedsArray = parseHiddenNeeds(selectedPK.hidden_needs);
                        if (hiddenNeedsArray.length > 0) {
                          // Join array dengan double newline untuk pemisahan visual
                          const hiddenNeedsStr = hiddenNeedsArray.join('\n\n');
                          handleInputChange('hidden_needs', hiddenNeedsStr);
                        } else {
                          handleInputChange('hidden_needs', '');
                        }
                      } else {
                        // Clear hidden needs if no product knowledge found
                        handleInputChange('hidden_needs', '');
                      }
                      
                      // Auto-fill problems if found
                      if (selectedPK && selectedPK.problems_solved && Array.isArray(selectedPK.problems_solved) && selectedPK.problems_solved.length > 0) {
                        // problems_solved is already an array, so use it directly
                        const problemsArray = selectedPK.problems_solved.filter(Boolean);
                        if (problemsArray.length > 0) {
                          // Join array dengan double newline untuk pemisahan visual
                          const problemsStr = problemsArray.join('\n\n');
                          handleInputChange('problem', problemsStr);
                        } else {
                          handleInputChange('problem', '');
                        }
                      } else {
                        // Clear problems if no product knowledge found
                        handleInputChange('problem', '');
                      }
                      
                      // Auto-fill impact if found
                      if (selectedPK && selectedPK.impact) {
                        const impactArray = parseImpact(selectedPK.impact);
                        if (impactArray.length > 0) {
                          // Join array dengan double newline untuk pemisahan visual
                          const impactStr = impactArray.join('\n\n');
                          handleInputChange('impact', impactStr);
                        } else {
                          handleInputChange('impact', '');
                        }
                      } else {
                        // Clear impact if no product knowledge found
                        handleInputChange('impact', '');
                      }
                      
                      // Auto-fill false_belief if found
                      if (selectedPK && selectedPK.false_belief) {
                        handleInputChange('false_belief', selectedPK.false_belief.trim());
                      } else {
                        handleInputChange('false_belief', '');
                      }
                      
                      // Auto-fill false_belief_impact if found
                      if (selectedPK && selectedPK.false_belief_impact) {
                        handleInputChange('false_belief_impact', selectedPK.false_belief_impact.trim());
                      } else {
                        handleInputChange('false_belief_impact', '');
                      }
                      
                      // Auto-fill what_makes_them_stop if found
                      if (selectedPK && selectedPK.what_makes_them_stop) {
                        handleInputChange('what_makes_them_stop', selectedPK.what_makes_them_stop.trim());
                      } else {
                        handleInputChange('what_makes_them_stop', '');
                      }
                      
                      // Auto-fill feature_name if found
                      if (selectedPK && selectedPK.feature_name) {
                        handleInputChange('feature_name', selectedPK.feature_name.trim());
                      } else {
                        handleInputChange('feature_name', '');
                      }
                      
                      // Auto-fill feature_description if found
                      if (selectedPK && selectedPK.feature_description) {
                        handleInputChange('feature_description', selectedPK.feature_description.trim());
                      } else {
                        handleInputChange('feature_description', '');
                      }
                      
                      // Auto-fill competitive_advantage if found
                      if (selectedPK && selectedPK.competitive_advantage) {
                        const competitiveAdvantageStr = parseCompetitiveAdvantage(selectedPK.competitive_advantage);
                        handleInputChange('competitive_advantage', competitiveAdvantageStr);
                      } else {
                        handleInputChange('competitive_advantage', '');
                      }
                    }}
                  >
                    <SelectTrigger className="min-w-0 overflow-hidden [&>span]:min-w-0 [&>span]:truncate">
                      <SelectValue placeholder="Pilih Keinginan dari Product Knowledge" />
                    </SelectTrigger>
                    <SelectContent
                      className="max-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]"
                      position="popper"
                    >
                      {productKnowledgeWithWantsNeeds.length === 0 ? (
                        <SelectItem value="no-data" disabled>
                          Tidak ada data Product Knowledge dengan Wants dan Needs
                        </SelectItem>
                      ) : (
                        productKnowledgeWithWantsNeeds
                          .filter((pk) => pk.wants && pk.wants.trim() !== '')
                          .map((pk) => {
                            const wantsValue = pk.wants!.trim();
                            return (
                              <SelectItem
                                key={pk.id}
                                value={wantsValue}
                                className="break-words whitespace-normal items-start py-2"
                              >
                                <span className="block break-words line-clamp-3" title={wantsValue}>
                                  {wantsValue}
                                </span>
                              </SelectItem>
                            );
                          })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="kebutuhan">Kebutuhan</Label>
                  <Select
                    value={formData.kebutuhan || ""}
                    onValueChange={(value) => handleInputChange('kebutuhan', value)}
                    disabled={!formData.keinginan}
                  >
                    <SelectTrigger className={cn(
                      'min-w-0 overflow-hidden [&>span]:min-w-0 [&>span]:truncate',
                      !formData.keinginan && 'bg-gray-100'
                    )}>
                      <SelectValue placeholder={formData.keinginan ? (formData.kebutuhan ? "" : "Pilih Kebutuhan") : "Pilih Keinginan terlebih dahulu"} />
                    </SelectTrigger>
                    <SelectContent
                      className="max-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]"
                      position="popper"
                    >
                      {formData.keinginan ? (
                        // Show needs that match the selected wants
                        (() => {
                          // Find all product knowledge items with matching wants
                          const keinginanTrim = (formData.keinginan || '').trim();
                          const matchingPKs = productKnowledgeWithWantsNeeds.filter(
                            (pk) => (pk.wants || '').trim() === keinginanTrim
                          );
                          
                          // Collect all unique needs from matching product knowledge
                          const uniqueNeeds = new Map<string, string>();
                          
                          if (matchingPKs.length > 0) {
                            matchingPKs.forEach((pk) => {
                              if (pk.needs) {
                                const needsValue = pk.needs.trim();
                                if (needsValue && !uniqueNeeds.has(needsValue)) {
                                  uniqueNeeds.set(needsValue, pk.id);
                                }
                              }
                            });
                          }
                          
                          // CRITICAL: Always ensure the current kebutuhan value is available as SelectItem
                          // This ensures autofilled values are always displayed correctly
                          if (formData.kebutuhan) {
                            const kebutuhanValue = (formData.kebutuhan || '').trim();
                            if (kebutuhanValue && !uniqueNeeds.has(kebutuhanValue)) {
                              // Pastikan nilai auto-fill selalu ada sebagai opsi (cari di semua PK)
                              const pkWithKebutuhan = productKnowledgeData.find(
                                (pk) => (pk.needs || '').trim() === kebutuhanValue
                              );
                              uniqueNeeds.set(kebutuhanValue, pkWithKebutuhan?.id || 'autofilled');
                            }
                          }
                          
                          // If no matches found, show all needs as fallback
                          if (uniqueNeeds.size === 0) {
                            productKnowledgeWithWantsNeeds.forEach((pk) => {
                              if (pk.needs) {
                                const needsValue = pk.needs.trim();
                                if (needsValue && !uniqueNeeds.has(needsValue)) {
                                  uniqueNeeds.set(needsValue, pk.id);
                                }
                              }
                            });
                          }
                          
                          return Array.from(uniqueNeeds.entries()).map(([needsValue, pkId]) => (
                            <SelectItem
                              key={pkId}
                              value={needsValue}
                              className="break-words whitespace-normal items-start py-2"
                            >
                              <span className="block break-words line-clamp-3" title={needsValue}>
                                {needsValue}
                              </span>
                            </SelectItem>
                          ));
                        })()
                      ) : (
                        <SelectItem value="select-wants-first" disabled>
                          Pilih Keinginan terlebih dahulu
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="hidden_needs">Hidden Needs</Label>
                <Textarea
                  id="hidden_needs"
                  value={formData.hidden_needs || ''}
                  onChange={(e) => handleInputChange('hidden_needs', e.target.value)}
                  placeholder="Kebutuhan tersembunyi (pisahkan dengan baris kosong untuk multiple needs)"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="problem">Problem</Label>
                  <Textarea
                    id="problem"
                    value={formData.problem || ''}
                    onChange={(e) => handleInputChange('problem', e.target.value)}
                    placeholder="Masalah yang dihadapi (pisahkan dengan baris kosong untuk multiple problems)"
                    rows={4}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="impact">Impact</Label>
                  <Textarea
                    id="impact"
                    value={formData.impact || ''}
                    onChange={(e) => handleInputChange('impact', e.target.value)}
                    placeholder="Dampak dari masalah (pisahkan dengan baris kosong untuk multiple impacts)"
                    rows={4}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="false_belief">False Belief</Label>
                  <Textarea
                    id="false_belief"
                    value={formData.false_belief || ''}
                    onChange={(e) => handleInputChange('false_belief', e.target.value)}
                    placeholder="Keyakinan salah yang dimiliki pelanggan"
                    rows={2}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="false_belief_impact">False Belief Impact</Label>
                  <Textarea
                    id="false_belief_impact"
                    value={formData.false_belief_impact || ''}
                    onChange={(e) => handleInputChange('false_belief_impact', e.target.value)}
                    placeholder="Dampak dari keyakinan salah terhadap perilaku pelanggan"
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="what_makes_them_stop">What Makes Them Stop?</Label>
                <Textarea
                  id="what_makes_them_stop"
                  value={formData.what_makes_them_stop || ''}
                  onChange={(e) => handleInputChange('what_makes_them_stop', e.target.value)}
                  placeholder="Apa yang membuat pelanggan berhenti atau ragu-ragu"
                  rows={2}
                />
              </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Product/Service Details (was Section 4) */}
        <AccordionItem value="product-details" className="border rounded-lg px-3 transition-colors data-[state=open]:bg-blue-50 data-[state=open]:border-blue-200 data-[state=closed]:bg-white data-[state=closed]:border-gray-200">
          <AccordionTrigger className="py-2 text-base font-semibold data-[state=open]:text-blue-700 data-[state=closed]:text-gray-700">
            Product/Service Details
          </AccordionTrigger>
          <AccordionContent className="pb-2 pt-0">
            <div className="space-y-2 pt-1">
              <div className="space-y-1">
                <Label htmlFor="feature_name">Feature</Label>
                <Input
                  id="feature_name"
                  value={formData.feature_name || ''}
                  onChange={(e) => handleInputChange('feature_name', e.target.value)}
                  placeholder="Nama fitur produk/layanan"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="feature_description">Feature Description</Label>
                  <Textarea
                    id="feature_description"
                    value={formData.feature_description || ''}
                    onChange={(e) => handleInputChange('feature_description', e.target.value)}
                    placeholder="Deskripsi detail fitur produk/layanan"
                    rows={3}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="solution">Solution</Label>
                  <Textarea
                    id="solution"
                    value={formData.solution || ''}
                    onChange={(e) => handleInputChange('solution', e.target.value)}
                    placeholder="Solusi yang ditawarkan"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="competitive_advantage">Competitive Advantage</Label>
                <Textarea
                  id="competitive_advantage"
                  value={formData.competitive_advantage || ''}
                  onChange={(e) => handleInputChange('competitive_advantage', e.target.value)}
                  placeholder="Keunggulan kompetitif produk/layanan"
                  rows={3}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: Content Structure */}
        <AccordionItem value="content-structure" className="border rounded-lg px-3 transition-colors data-[state=open]:bg-blue-50 data-[state=open]:border-blue-200 data-[state=closed]:bg-white data-[state=closed]:border-gray-200">
          <AccordionTrigger className="py-2 text-base font-semibold data-[state=open]:text-blue-700 data-[state=closed]:text-gray-700">
            Content Structure
          </AccordionTrigger>
          <AccordionContent className="pb-2 pt-0">
            <div className="space-y-2 pt-1">
              <div className="space-y-1">
                <Label htmlFor="hook_name">Hook Name</Label>
                <Select
                  value={selectedHookName || ""}
                  onValueChange={(value) => {
                    setSelectedHookName(value);
                    
                    // Find the selected hook
                    const selectedHook = productKnowledgeHooks.find(
                      (hook) => hook.name === value
                    );
                    
                    // Auto-fill hook_name, hook_description, and hook_content if found
                    if (selectedHook) {
                      handleInputChange('hook_name', value);
                      handleInputChange('hook_description', selectedHook.description || '');
                      handleInputChange('hook_content', selectedHook.hook_content || '');
                    } else {
                      // Clear fields if no hook found
                      handleInputChange('hook_name', '');
                      handleInputChange('hook_description', '');
                      handleInputChange('hook_content', '');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Hook Name" />
                  </SelectTrigger>
                  <SelectContent
                    className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] border-2 border-gray-200 bg-white shadow-lg"
                    position="popper"
                  >
                    {productKnowledgeHooks.length === 0 ? (
                      <SelectItem value="no-data" disabled className="break-words whitespace-normal">
                        Tidak ada Hook tersedia
                      </SelectItem>
                    ) : (
                      productKnowledgeHooks
                        .filter((hook) => hook.name && hook.name.trim() !== '')
                        .flatMap((hook, index) => [
                          index > 0 && <SelectSeparator key={`sep-${hook.id}`} className="my-1 bg-gray-200" />,
                          <SelectItem
                            key={hook.id}
                            value={hook.name}
                            className={cn(
                              "break-words whitespace-normal",
                              index % 2 === 1 && "bg-gray-50/80"
                            )}
                          >
                            {hook.name}
                          </SelectItem>
                        ]).filter(Boolean)
                    )}
                  </SelectContent>
                </Select>
              </div>

              {formData.hook_description && (
                <div className="space-y-1">
                  <Label htmlFor="hook_description">Hook Description</Label>
                  <Textarea
                    id="hook_description"
                    value={formData.hook_description || ''}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                    placeholder="Deskripsi hook akan muncul di sini"
                    rows={2}
                  />
                </div>
              )}

              {formData.hook_content && (
                <div className="space-y-1">
                  <Label htmlFor="hook_content">Hook Content</Label>
                  <Textarea
                    id="hook_content"
                    value={formData.hook_content || ''}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                    placeholder="Konten hook akan muncul di sini"
                    rows={4}
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="style_name">Style Name</Label>
                <Select
                  value={selectedStyleName || ""}
                  onValueChange={(value) => {
                    setSelectedStyleName(value);
                    
                    // Find the selected style
                    const selectedStyle = productKnowledgeStyles.find(
                      (style) => style.name === value
                    );
                    
                    // Auto-fill style_name and style_instruksi if found
                    if (selectedStyle) {
                      // Set style_name (the name selected)
                      handleInputChange('style_name', value);
                      
                      if (selectedStyle.description) {
                        handleInputChange('style_instruksi', selectedStyle.description);
                      }
                      
                      // Auto-fill structure if found
                      if (selectedStyle.structure) {
                        handleInputChange('structure', selectedStyle.structure);
                      }
                    } else {
                      // Clear fields if no style found
                      handleInputChange('style_name', '');
                      handleInputChange('style_instruksi', '');
                      handleInputChange('structure', '');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Style Name" />
                  </SelectTrigger>
                  <SelectContent
                    className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] border-2 border-gray-200 bg-white shadow-lg"
                    position="popper"
                  >
                    {(() => {
                      // Filter styles based on selected content pillar
                      const filteredStyles = productKnowledgeStyles.filter((style) => {
                        // Always show styles with valid names
                        if (!style.name || style.name.trim() === '') {
                          return false;
                        }
                        
                        // If no content pillar is selected, show all styles
                        if (!formData.content_pillar) {
                          return true;
                        }
                        
                        // Find the content pillar ID from the pillar name
                        const selectedPillar = contentPillars.find(
                          (pillar) => pillar.name === formData.content_pillar
                        );
                        
                        if (!selectedPillar) {
                          // If pillar not found, show all styles
                          return true;
                        }
                        
                        // Show style if:
                        // 1. Style has no pillars (universal) - content_pillar_ids is null or empty array
                        // 2. Style includes the selected pillar ID
                        const pillarIds = style.content_pillar_ids || [];
                        const isUniversal = pillarIds.length === 0;
                        const includesSelectedPillar = pillarIds.includes(selectedPillar.id);
                        
                        return isUniversal || includesSelectedPillar;
                      });
                      
                      if (filteredStyles.length === 0) {
                        return (
                          <SelectItem value="no-data" disabled className="break-words whitespace-normal">
                            {formData.content_pillar 
                              ? `Tidak ada Style tersedia untuk pillar "${formData.content_pillar}"`
                              : 'Tidak ada Style tersedia'}
                          </SelectItem>
                        );
                      }
                      
                      return filteredStyles.flatMap((style, index) => [
                        index > 0 && <SelectSeparator key={`sep-${style.id}`} className="my-1 bg-gray-200" />,
                        <SelectItem
                          key={style.id}
                          value={style.name}
                          className={cn(
                            "break-words whitespace-normal",
                            index % 2 === 1 && "bg-gray-50/80"
                          )}
                        >
                          {style.name}
                        </SelectItem>
                      ]).filter(Boolean);
                    })()}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="style_instruksi">Style Instruksi</Label>
                  <Textarea
                    id="style_instruksi"
                    value={formData.style_instruksi || ''}
                    onChange={(e) => handleInputChange('style_instruksi', e.target.value)}
                    placeholder="Instruksi style untuk script (contoh: formal, casual, friendly, dll)"
                    rows={3}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="structure">Structure</Label>
                  <Textarea
                    id="structure"
                    value={formData.structure || ''}
                    onChange={(e) => handleInputChange('structure', e.target.value)}
                    placeholder="Struktur script yang diinginkan (contoh: Hook - Problem - Solution - CTA)"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cta_type">CTA (Call to Action)</Label>
                <Select
                  value={formData.cta_type || ""}
                  onValueChange={(value) => handleInputChange('cta_type', value as 'use_solution' | 'use_comment')}
                  disabled={!formData.selling_approach}
                >
                  <SelectTrigger className={cn(
                    'min-w-0 overflow-hidden [&>span]:min-w-0 [&>span]:truncate',
                    !formData.selling_approach && 'bg-gray-100 cursor-not-allowed'
                  )}>
                    <SelectValue placeholder="Pilih Tipe CTA" />
                  </SelectTrigger>
                  <SelectContent
                    className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] border-2 border-gray-200 bg-white shadow-lg"
                    position="popper"
                  >
                    <SelectItem
                      value="use_solution"
                      className="break-words whitespace-normal"
                    >
                      Menggunakan Solution - CTA akan menggunakan field Solution dari Product/Service Details
                    </SelectItem>
                    <SelectSeparator className="my-1 bg-gray-200" />
                    <SelectItem
                      value="use_comment"
                      className="break-words whitespace-normal bg-gray-50/80"
                    >
                      Menggunakan Comment - CTA meminta comment untuk mendapatkan engagement dan leads
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formData.cta_type === 'use_solution' && !formData.solution && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Pastikan field "Solution" di accordion "Product/Service Details" sudah diisi
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="judul">Judul</Label>
                <Select
                  value={selectedJudulTemplate || ""}
                  onValueChange={(value) => {
                    setSelectedJudulTemplate(value);
                    
                    // Find the selected template
                    const template = judulTemplates.find(t => t.value === value);
                    
                    if (template) {
                      // Set the template as judul and also as judul_custom for editing
                      handleInputChange('judul', template.template);
                      handleInputChange('judul_custom', template.template);
                    } else {
                      handleInputChange('judul', '');
                      handleInputChange('judul_custom', '');
                    }
                  }}
                >
                  <SelectTrigger className="min-w-0 overflow-hidden [&>span]:min-w-0 [&>span]:truncate">
                    <SelectValue placeholder="Pilih Template Judul" />
                  </SelectTrigger>
                  <SelectContent
                    className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] border-2 border-gray-200 bg-white shadow-lg"
                    position="popper"
                  >
                    {judulTemplates.flatMap((template, index) => [
                      index > 0 && <SelectSeparator key={`sep-${template.value}`} className="my-1 bg-gray-200" />,
                      <SelectItem
                        key={template.value}
                        value={template.value}
                        className={cn(
                          "break-words whitespace-normal items-start py-2",
                          index % 2 === 1 && "bg-gray-50/80"
                        )}
                      >
                        <span className="block break-words line-clamp-3" title={template.label}>
                          {template.label}
                        </span>
                      </SelectItem>
                    ]).filter(Boolean)}
                  </SelectContent>
                </Select>
                {formData.judul && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <Label htmlFor="judul_custom" className="text-sm font-medium text-gray-700 mb-2 block">
                      Edit Judul (Opsional)
                    </Label>
                    <Textarea
                      id="judul_custom"
                      value={formData.judul_custom || ''}
                      onChange={(e) => {
                        handleInputChange('judul_custom', e.target.value);
                        handleInputChange('judul', e.target.value);
                      }}
                      placeholder="Edit template judul sesuai kebutuhan"
                      rows={2}
                      className="text-sm"
                    />
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-600 font-medium">
                        💡 <strong>Cara Menggunakan Template:</strong>
                      </p>
                      <ul className="text-xs text-gray-500 ml-4 list-disc space-y-1">
                        <li>Ganti teks dalam <strong>[kurung siku]</strong> dengan konten yang relevan</li>
                        <li><strong>[#]</strong> = ganti dengan angka (contoh: "5 Tips", "10 Cara")</li>
                        <li><strong>[#%]</strong> = ganti dengan persentase (contoh: "90% Orang", "75% Pelanggan")</li>
                        <li><strong>[#Tanda]</strong> = ganti dengan tanda/ikon (contoh: "⚠️ Peringatan", "🚨 Alert")</li>
                        <li>Pastikan judul relevan dengan produk/layanan dan target audience Anda</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isGenerating}
          className="flex-1"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Script
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isGenerating}
        >
          Reset
        </Button>
      </div>
    </form>
  );
};
