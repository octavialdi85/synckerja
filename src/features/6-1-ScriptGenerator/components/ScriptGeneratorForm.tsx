import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { ScriptGeneratorRequest } from '../services/scriptGeneratorService';
import { useProductKnowledge } from '@/features/6-1-ProductKnowledge/hooks/useProductKnowledge';
import { useProductKnowledgeStyle } from '@/features/6-1-ProductKnowledge/hooks/useProductKnowledgeStyle';
import { useProductKnowledgeHooks } from '@/features/6-1-ProductKnowledge/hooks/useProductKnowledgeHooks';

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
    duration_unit: 'menit',
    target_market: '',
    gender: '',
    age: '',
    buying_roles: '',
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
    selling_approach: undefined
  });
  
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedHookName, setSelectedHookName] = useState<string>('');
  const [selectedStyleName, setSelectedStyleName] = useState<string>('');
  const [selectedJudulTemplate, setSelectedJudulTemplate] = useState<string>('');
  const [isSellingApproachLocked, setIsSellingApproachLocked] = useState<boolean>(false);

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

  // Auto-select and lock Hard Selling for specific content pillars
  useEffect(() => {
    const pillarName = (formData.content_pillar || '').toLowerCase().trim();
    const promoPillars = ['attractive offers', 'buy 1 get 1', 'promo'];
    
    // Check if the pillar name matches any of the promo pillars (case-insensitive, partial match)
    const isPromoPillar = pillarName && promoPillars.some(promo => {
      const promoLower = promo.toLowerCase();
      // Check for exact match or if pillar name contains the promo keyword
      return pillarName === promoLower || pillarName.includes(promoLower);
    });
    
    if (isPromoPillar) {
      // Auto-select Hard Selling and lock the field for promo pillars
      setFormData(prev => ({
        ...prev,
        selling_approach: 'Hard Selling' as const
      }));
      setIsSellingApproachLocked(true);
    } else {
      // Unlock the field if pillar changes to non-promo or is cleared
      setIsSellingApproachLocked(false);
      
      // Clear Hard Selling if it was selected and pillar is not promo
      setFormData(prev => {
        if (prev.selling_approach === 'Hard Selling') {
          return {
            ...prev,
            selling_approach: undefined
          };
        }
        return prev;
      });
    }
  }, [formData.content_pillar]);

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
    await onGenerate(formData);
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
      duration_unit: 'menit',
      target_market: '',
      gender: '',
      age: '',
      buying_roles: '',
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
      selling_approach: undefined
    });
    setSelectedServiceId('');
    setSelectedHookName('');
    setSelectedStyleName('');
    setSelectedJudulTemplate('');
    setIsSellingApproachLocked(false);
  };

  // Determine field type based on content type
  const contentTypeLower = (formData.content_type || '').toLowerCase();
  const isPostOrCarousel = contentTypeLower === 'post' || contentTypeLower === 'carousel';
  const isReelStoryYoutube = contentTypeLower === 'reel' || contentTypeLower === 'story' || contentTypeLower === 'youtube';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Content Type */}
        <div className="space-y-2">
          <Label htmlFor="content_type">Content Type</Label>
          <Select
            value={formData.content_type || undefined}
            onValueChange={(value) => {
              handleInputChange('content_type', value);
              // Reset duration/slide when content type changes
              setFormData(prev => ({
                ...prev,
                content_type: value,
                slide: undefined,
                duration_value: undefined,
                duration_unit: 'menit'
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
          <div className="space-y-2">
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
          <div className="space-y-2">
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
                value={formData.duration_unit || 'menit'}
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
        <div className="space-y-2">
          <Label htmlFor="service_name">Service</Label>
          <Select
            value={selectedServiceId || undefined}
            onValueChange={(serviceId) => {
              const selectedService = services.find(s => s.id === serviceId);
              setSelectedServiceId(serviceId);
              handleInputChange('service_name', selectedService?.name || '');
              handleInputChange('sub_service_name', ''); // Reset sub service
              handleInputChange('target_market', ''); // Reset Customer Persona when service changes
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
        <div className="space-y-2">
          <Label htmlFor="sub_service_name">Sub Service</Label>
          <Select
            value={formData.sub_service_name || undefined}
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

        {/* Content Pillar */}
        <div className="space-y-2">
          <Label htmlFor="content_pillar">Content Pillar</Label>
          <Select
            value={formData.content_pillar || undefined}
            onValueChange={(value) => handleInputChange('content_pillar', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih Content Pillar" />
            </SelectTrigger>
            <SelectContent>
              {contentPillars
                .filter((pillar) => {
                  const name = pillar?.name;
                  return name && typeof name === 'string' && name.trim() !== '' && pillar?.id;
                })
                .map((pillar) => {
                  const value = String(pillar.name).trim();
                  return (
                    <SelectItem key={pillar.id} value={value}>
                      {pillar.name}
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        </div>

        {/* Selling Approach */}
        <div className="space-y-2">
          <Label htmlFor="selling_approach">
            Pendekatan Penjualan
            {isSellingApproachLocked && (
              <span className="ml-2 text-xs text-gray-500">(Otomatis terkunci untuk Content Pillar ini)</span>
            )}
            {!isSellingApproachLocked && formData.content_pillar && (
              <span className="ml-2 text-xs text-gray-500">(Hard Selling hanya tersedia untuk pillar Promo)</span>
            )}
          </Label>
          <Select
            value={formData.selling_approach || undefined}
            onValueChange={(value) => handleInputChange('selling_approach', value as 'Tanpa Produk' | 'Soft Selling' | 'Hard Selling')}
            disabled={isSellingApproachLocked}
          >
            <SelectTrigger className={isSellingApproachLocked ? 'bg-gray-100 cursor-not-allowed' : ''}>
              <SelectValue placeholder="Pilih Pendekatan Penjualan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tanpa Produk">
                Tanpa Produk - Tidak membahas produk sama sekali
              </SelectItem>
              <SelectItem value="Soft Selling">
                Soft Selling - Bicara produk tetapi sangat soft
              </SelectItem>
              <SelectItem 
                value="Hard Selling"
                disabled={!isSellingApproachLocked}
                className={!isSellingApproachLocked ? 'opacity-50 cursor-not-allowed' : ''}
              >
                Hard Selling - 100% bicara Produk, keunggulan dan fitur
                {!isSellingApproachLocked && formData.content_pillar && (
                  <span className="ml-2 text-xs text-gray-400">(Hanya untuk pillar Promo)</span>
                )}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Customer Persona */}
        <div className="space-y-2">
          <Label htmlFor="target_market">Customer Persona</Label>
          <Select
            value={formData.target_market || undefined}
            onValueChange={(value) => {
              handleInputChange('target_market', value);
              
              // Find product knowledge items with matching target_audience AND service_id
              const matchingPKs = productKnowledgeData.filter((pk) => {
                // Must match both service and target_audience
                if (pk.service_id !== selectedServiceId) return false;
                if (!pk.target_audience) return false;
                const pkPersonaStr = extractTargetAudienceAsString(pk.target_audience);
                return pkPersonaStr === value;
              });
              
              // If found, auto-fill all fields from the first matching product knowledge
              if (matchingPKs.length > 0) {
                const selectedPK = matchingPKs[0]; // Use first match
                
                // Auto-fill keinginan (wants)
                if (selectedPK.wants) {
                  handleInputChange('keinginan', selectedPK.wants.trim());
                }
                
                // Auto-fill kebutuhan (needs)
                if (selectedPK.needs) {
                  handleInputChange('kebutuhan', selectedPK.needs.trim());
                }
                
                // Auto-fill hidden needs
                if (selectedPK.hidden_needs) {
                  const hiddenNeedsArray = parseHiddenNeeds(selectedPK.hidden_needs);
                  if (hiddenNeedsArray.length > 0) {
                    const hiddenNeedsStr = hiddenNeedsArray.join('\n\n');
                    handleInputChange('hidden_needs', hiddenNeedsStr);
                  } else {
                    handleInputChange('hidden_needs', '');
                  }
                } else {
                  handleInputChange('hidden_needs', '');
                }
                
                // Auto-fill problems
                if (selectedPK.problems_solved && Array.isArray(selectedPK.problems_solved) && selectedPK.problems_solved.length > 0) {
                  const problemsArray = selectedPK.problems_solved.filter(Boolean);
                  if (problemsArray.length > 0) {
                    const problemsStr = problemsArray.join('\n\n');
                    handleInputChange('problem', problemsStr);
                  } else {
                    handleInputChange('problem', '');
                  }
                } else {
                  handleInputChange('problem', '');
                }
                
                // Auto-fill impact
                if (selectedPK.impact) {
                  const impactArray = parseImpact(selectedPK.impact);
                  if (impactArray.length > 0) {
                    const impactStr = impactArray.join('\n\n');
                    handleInputChange('impact', impactStr);
                  } else {
                    handleInputChange('impact', '');
                  }
                } else {
                  handleInputChange('impact', '');
                }
                
                // Auto-fill false_belief
                if (selectedPK.false_belief) {
                  handleInputChange('false_belief', selectedPK.false_belief.trim());
                } else {
                  handleInputChange('false_belief', '');
                }
                
                // Auto-fill false_belief_impact
                if (selectedPK.false_belief_impact) {
                  handleInputChange('false_belief_impact', selectedPK.false_belief_impact.trim());
                } else {
                  handleInputChange('false_belief_impact', '');
                }
                
                // Auto-fill what_makes_them_stop
                if (selectedPK.what_makes_them_stop) {
                  handleInputChange('what_makes_them_stop', selectedPK.what_makes_them_stop.trim());
                } else {
                  handleInputChange('what_makes_them_stop', '');
                }
                
                // Auto-fill solution
                if (selectedPK.solusi) {
                  handleInputChange('solution', selectedPK.solusi.trim());
                } else {
                  handleInputChange('solution', '');
                }
                
                // Auto-fill feature_name
                if (selectedPK.feature_name) {
                  handleInputChange('feature_name', selectedPK.feature_name.trim());
                } else {
                  handleInputChange('feature_name', '');
                }
                
                // Auto-fill feature_description
                if (selectedPK.feature_description) {
                  handleInputChange('feature_description', selectedPK.feature_description.trim());
                } else {
                  handleInputChange('feature_description', '');
                }
                
                // Auto-fill competitive_advantage
                if (selectedPK.competitive_advantage) {
                  const competitiveAdvantageStr = parseCompetitiveAdvantage(selectedPK.competitive_advantage);
                  handleInputChange('competitive_advantage', competitiveAdvantageStr);
                } else {
                  handleInputChange('competitive_advantage', '');
                }
              } else {
                // Clear all fields if no matching product knowledge found
                handleInputChange('keinginan', '');
                handleInputChange('kebutuhan', '');
                handleInputChange('hidden_needs', '');
                handleInputChange('problem', '');
                handleInputChange('impact', '');
                handleInputChange('false_belief', '');
                handleInputChange('false_belief_impact', '');
                handleInputChange('what_makes_them_stop', '');
                handleInputChange('solution', '');
                handleInputChange('feature_name', '');
                handleInputChange('feature_description', '');
                handleInputChange('competitive_advantage', '');
              }
            }}
            disabled={!selectedServiceId}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedServiceId ? "Pilih Customer Persona" : "Pilih Service terlebih dahulu"} />
            </SelectTrigger>
            <SelectContent>
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
                  <SelectItem key={index} value={persona}>
                    {persona}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            value={formData.gender || undefined}
            onValueChange={(value) => handleInputChange('gender', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Laki-laki">Laki-laki</SelectItem>
              <SelectItem value="Perempuan">Perempuan</SelectItem>
              <SelectItem value="Semua">Semua</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Age */}
        <div className="space-y-2">
          <Label htmlFor="age">Umur</Label>
          <Input
            id="age"
            value={formData.age || ''}
            onChange={(e) => handleInputChange('age', e.target.value)}
            placeholder="Contoh: 25-40 tahun"
          />
        </div>

        {/* Buying Roles */}
        <div className="space-y-2">
          <Label htmlFor="buying_roles">Buying Roles</Label>
          <Input
            id="buying_roles"
            value={formData.buying_roles || ''}
            onChange={(e) => handleInputChange('buying_roles', e.target.value)}
            placeholder="Contoh: Decision Maker, Influencer"
          />
        </div>
      </div>

      {/* Text Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="keinginan">Keinginan</Label>
          <Select
            value={formData.keinginan || undefined}
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
            <SelectTrigger>
              <SelectValue placeholder="Pilih Keinginan dari Product Knowledge" />
            </SelectTrigger>
            <SelectContent>
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
                      <SelectItem key={pk.id} value={wantsValue}>
                        {wantsValue}
                      </SelectItem>
                    );
                  })
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="kebutuhan">Kebutuhan</Label>
          <Select
            value={formData.kebutuhan || undefined}
            onValueChange={(value) => handleInputChange('kebutuhan', value)}
            disabled={!formData.keinginan}
          >
            <SelectTrigger>
              <SelectValue placeholder={formData.keinginan ? (formData.kebutuhan ? "" : "Pilih Kebutuhan") : "Pilih Keinginan terlebih dahulu"} />
            </SelectTrigger>
            <SelectContent>
              {formData.keinginan ? (
                // Show needs that match the selected wants
                (() => {
                  // Find all product knowledge items with matching wants
                  const matchingPKs = productKnowledgeWithWantsNeeds.filter(
                    (pk) => pk.wants?.trim() === formData.keinginan
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
                    const kebutuhanValue = formData.kebutuhan.trim();
                    if (kebutuhanValue && !uniqueNeeds.has(kebutuhanValue)) {
                      // Find the PK that has this kebutuhan value (might be from autofill)
                      const pkWithKebutuhan = productKnowledgeWithWantsNeeds.find(
                        (pk) => pk.needs?.trim() === kebutuhanValue
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
                    <SelectItem key={pkId} value={needsValue}>
                      {needsValue}
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

        <div className="space-y-2">
          <Label htmlFor="hidden_needs">Hidden Needs</Label>
          <Textarea
            id="hidden_needs"
            value={formData.hidden_needs || ''}
            onChange={(e) => handleInputChange('hidden_needs', e.target.value)}
            placeholder="Kebutuhan tersembunyi (pisahkan dengan baris kosong untuk multiple needs)"
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="problem">Problem</Label>
          <Textarea
            id="problem"
            value={formData.problem || ''}
            onChange={(e) => handleInputChange('problem', e.target.value)}
            placeholder="Masalah yang dihadapi (pisahkan dengan baris kosong untuk multiple problems)"
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="impact">Impact</Label>
          <Textarea
            id="impact"
            value={formData.impact || ''}
            onChange={(e) => handleInputChange('impact', e.target.value)}
            placeholder="Dampak dari masalah (pisahkan dengan baris kosong untuk multiple impacts)"
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="false_belief">False Belief</Label>
          <Textarea
            id="false_belief"
            value={formData.false_belief || ''}
            onChange={(e) => handleInputChange('false_belief', e.target.value)}
            placeholder="Keyakinan salah yang dimiliki pelanggan"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="false_belief_impact">False Belief Impact</Label>
          <Textarea
            id="false_belief_impact"
            value={formData.false_belief_impact || ''}
            onChange={(e) => handleInputChange('false_belief_impact', e.target.value)}
            placeholder="Dampak dari keyakinan salah terhadap perilaku pelanggan"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="what_makes_them_stop">What Makes Them Stop?</Label>
          <Textarea
            id="what_makes_them_stop"
            value={formData.what_makes_them_stop || ''}
            onChange={(e) => handleInputChange('what_makes_them_stop', e.target.value)}
            placeholder="Apa yang membuat pelanggan berhenti atau ragu-ragu"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="solution">Solution</Label>
          <Textarea
            id="solution"
            value={formData.solution || ''}
            onChange={(e) => handleInputChange('solution', e.target.value)}
            placeholder="Solusi yang ditawarkan"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="feature_name">Feature</Label>
          <Input
            id="feature_name"
            value={formData.feature_name || ''}
            onChange={(e) => handleInputChange('feature_name', e.target.value)}
            placeholder="Nama fitur produk/layanan"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="feature_description">Feature Description</Label>
          <Textarea
            id="feature_description"
            value={formData.feature_description || ''}
            onChange={(e) => handleInputChange('feature_description', e.target.value)}
            placeholder="Deskripsi detail fitur produk/layanan"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="competitive_advantage">Competitive Advantage</Label>
          <Textarea
            id="competitive_advantage"
            value={formData.competitive_advantage || ''}
            onChange={(e) => handleInputChange('competitive_advantage', e.target.value)}
            placeholder="Keunggulan kompetitif produk/layanan"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hook_name">Hook Name</Label>
          <Select
            value={selectedHookName || undefined}
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
            <SelectContent>
              {productKnowledgeHooks.length === 0 ? (
                <SelectItem value="no-data" disabled>
                  Tidak ada Hook tersedia
                </SelectItem>
              ) : (
                productKnowledgeHooks
                  .filter((hook) => hook.name && hook.name.trim() !== '')
                  .map((hook) => (
                    <SelectItem key={hook.id} value={hook.name}>
                      {hook.name}
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
        </div>

        {formData.hook_description && (
          <div className="space-y-2">
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
          <div className="space-y-2">
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

        <div className="space-y-2">
          <Label htmlFor="style_name">Style Name</Label>
          <Select
            value={selectedStyleName || undefined}
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
            <SelectContent>
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
                    <SelectItem value="no-data" disabled>
                      {formData.content_pillar 
                        ? `Tidak ada Style tersedia untuk pillar "${formData.content_pillar}"`
                        : 'Tidak ada Style tersedia'}
                    </SelectItem>
                  );
                }
                
                return filteredStyles.map((style) => (
                  <SelectItem key={style.id} value={style.name}>
                    {style.name}
                  </SelectItem>
                ));
              })()}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="style_instruksi">Style Instruksi</Label>
          <Textarea
            id="style_instruksi"
            value={formData.style_instruksi || ''}
            onChange={(e) => handleInputChange('style_instruksi', e.target.value)}
            placeholder="Instruksi style untuk script (contoh: formal, casual, friendly, dll)"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="structure">Structure</Label>
          <Textarea
            id="structure"
            value={formData.structure || ''}
            onChange={(e) => handleInputChange('structure', e.target.value)}
            placeholder="Struktur script yang diinginkan (contoh: Hook - Problem - Solution - CTA)"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="judul">Judul</Label>
          <Select
            value={selectedJudulTemplate || undefined}
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
            <SelectTrigger>
              <SelectValue placeholder="Pilih Template Judul" />
            </SelectTrigger>
            <SelectContent>
              {judulTemplates.map((template) => (
                <SelectItem key={template.value} value={template.value}>
                  {template.label}
                </SelectItem>
              ))}
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

      {/* Actions */}
      <div className="flex gap-3 pt-4">
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
