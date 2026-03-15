import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { toast } from 'sonner';
import { Plus, Check, Pencil, Trash2, User, Box, Lightbulb, ImageIcon, Download, Copy, Palette, Building2 } from 'lucide-react';

export interface DigitalAssetCharacter {
  id: string;
  organization_id: string;
  name: string | null;
  age: string | null;
  nationality: string | null;
  gender: string | null;
  hair_description: string | null;
  face_description: string | null;
  clothing_description: string | null;
  accessories: string | null;
  body_shape: string | null;
  height: string | null;
  additional_details: string | null;
  reference_image_path: string | null;
  combined_prompt: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DigitalAssetObject {
  id: string;
  organization_id: string;
  name: string | null;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DigitalAssetBrandColor {
  id: string;
  organization_id: string;
  brand_name: string | null;
  background_color_hex: string | null;
  background_color_percent: number | null;
  primary_color_hex: string | null;
  primary_color_percent: number | null;
  secondary_color_hex: string | null;
  secondary_color_percent: number | null;
  accent_color_hex: string | null;
  accent_color_percent: number | null;
  text_color_hex: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DigitalAssetCompanyLogo {
  id: string;
  organization_id: string;
  brand_name: string | null;
  logo_path: string | null;
  created_at?: string;
  updated_at?: string;
}

const emptyCharacterForm = (): Partial<DigitalAssetCharacter> => ({
  name: '',
  age: '',
  nationality: '',
  gender: '',
  hair_description: '',
  face_description: '',
  clothing_description: '',
  accessories: '',
  body_shape: '',
  height: '',
  additional_details: '',
  reference_image_path: null,
  combined_prompt: null,
});

const emptyObjectForm = (): Partial<DigitalAssetObject> => ({
  name: '',
  description: '',
});

const emptyBrandColorForm = (): Partial<DigitalAssetBrandColor> => ({
  brand_name: '',
  background_color_hex: '',
  background_color_percent: 40,
  primary_color_hex: '',
  primary_color_percent: 30,
  secondary_color_hex: '',
  secondary_color_percent: 20,
  accent_color_hex: '',
  accent_color_percent: 10,
  text_color_hex: '',
});

const emptyCompanyLogoForm = (): Partial<DigitalAssetCompanyLogo> => ({
  brand_name: '',
  logo_path: null,
});

function buildCombinedPromptFromForm(data: {
  name?: string | null;
  age?: string | null;
  gender?: string | null;
  hair_description?: string | null;
  face_description?: string | null;
  clothing_description?: string | null;
  additional_details?: string | null;
}): string {
  const parts = [
    data.name,
    data.age,
    data.gender,
    data.hair_description,
    data.face_description,
    data.clothing_description,
    data.additional_details,
  ].filter((v) => v != null && String(v).trim() !== '' && String(v).trim() !== '—');
  return parts.join('\n');
}

function CompanyLogoRow({
  logo,
  onEdit,
  onDelete,
  t,
}: {
  logo: DigitalAssetCompanyLogo;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!logo.logo_path?.trim()) {
      setThumbUrl(null);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from('digital-asset-company-logos')
      .createSignedUrl(logo.logo_path, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setThumbUrl(null);
          return;
        }
        setThumbUrl(data?.signedUrl ?? null);
      });
    return () => { cancelled = true; };
  }, [logo.logo_path]);
  return (
    <li className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100">
      <div className="min-w-0 flex-1 flex items-center gap-2">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="h-10 w-10 object-contain rounded border border-gray-200 flex-shrink-0 bg-white" />
        ) : (
          <div className="h-10 w-10 rounded border border-gray-200 flex-shrink-0 bg-gray-200 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-gray-500" />
          </div>
        )}
        <p className="font-medium text-gray-900 truncate">{logo.brand_name || '—'}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0 text-blue-600">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

export const DigitalAssetsSection: React.FC<{ onNavigateToDetectImage?: () => void }> = ({ onNavigateToDetectImage }) => {
  const { organizationId } = useCurrentOrg();
  const { t } = useAppTranslation();
  const [activeTab, setActiveTab] = useState<'character' | 'object' | 'brandColor' | 'companyLogo'>('character');

  // Character state
  const [characters, setCharacters] = useState<DigitalAssetCharacter[]>([]);
  const [characterForm, setCharacterForm] = useState<Partial<DigitalAssetCharacter>>(emptyCharacterForm());
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [characterSaving, setCharacterSaving] = useState(false);
  const [characterReferenceImageUrl, setCharacterReferenceImageUrl] = useState<string | null>(null);

  // Object state
  const [objects, setObjects] = useState<DigitalAssetObject[]>([]);
  const [objectForm, setObjectForm] = useState<Partial<DigitalAssetObject>>(emptyObjectForm());
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [objectSaving, setObjectSaving] = useState(false);

  // Brand Color state
  const [brandColors, setBrandColors] = useState<DigitalAssetBrandColor[]>([]);
  const [brandColorForm, setBrandColorForm] = useState<Partial<DigitalAssetBrandColor>>(emptyBrandColorForm());
  const [editingBrandColorId, setEditingBrandColorId] = useState<string | null>(null);
  const [brandColorsLoading, setBrandColorsLoading] = useState(false);
  const [brandColorSaving, setBrandColorSaving] = useState(false);

  // Company Logo state
  const [companyLogos, setCompanyLogos] = useState<DigitalAssetCompanyLogo[]>([]);
  const [companyLogoForm, setCompanyLogoForm] = useState<Partial<DigitalAssetCompanyLogo>>(emptyCompanyLogoForm());
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [editingCompanyLogoId, setEditingCompanyLogoId] = useState<string | null>(null);
  const [companyLogosLoading, setCompanyLogosLoading] = useState(false);
  const [companyLogosSaving, setCompanyLogosSaving] = useState(false);
  const [companyLogoPreviewUrl, setCompanyLogoPreviewUrl] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    if (!organizationId) return;
    setCharactersLoading(true);
    try {
      const { data, error } = await supabase
        .from('digital_asset_characters')
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setCharacters((data as DigitalAssetCharacter[]) || []);
    } catch (err) {
      console.error(err);
      toast.error(t('digitalAssets.loadError', 'Failed to load data.'));
    } finally {
      setCharactersLoading(false);
    }
  }, [organizationId, t]);

  const fetchObjects = useCallback(async () => {
    if (!organizationId) return;
    setObjectsLoading(true);
    try {
      const { data, error } = await supabase
        .from('digital_asset_objects')
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setObjects((data as DigitalAssetObject[]) || []);
    } catch (err) {
      console.error(err);
      toast.error(t('digitalAssets.loadError', 'Failed to load data.'));
    } finally {
      setObjectsLoading(false);
    }
  }, [organizationId, t]);

  const fetchBrandColors = useCallback(async () => {
    if (!organizationId) return;
    setBrandColorsLoading(true);
    try {
      const { data, error } = await supabase
        .from('digital_asset_brand_colors')
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setBrandColors((data as DigitalAssetBrandColor[]) || []);
    } catch (err) {
      console.error(err);
      toast.error(t('digitalAssets.loadError', 'Failed to load data.'));
    } finally {
      setBrandColorsLoading(false);
    }
  }, [organizationId, t]);

  const fetchCompanyLogos = useCallback(async () => {
    if (!organizationId) return;
    setCompanyLogosLoading(true);
    try {
      const { data, error } = await supabase
        .from('digital_asset_company_logos')
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setCompanyLogos((data as DigitalAssetCompanyLogo[]) || []);
    } catch (err) {
      console.error(err);
      toast.error(t('digitalAssets.loadError', 'Failed to load data.'));
    } finally {
      setCompanyLogosLoading(false);
    }
  }, [organizationId, t]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  useEffect(() => {
    fetchBrandColors();
  }, [fetchBrandColors]);

  useEffect(() => {
    fetchCompanyLogos();
  }, [fetchCompanyLogos]);

  useEffect(() => {
    const path = companyLogoForm.logo_path;
    if (!path?.trim()) {
      setCompanyLogoPreviewUrl(null);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from('digital-asset-company-logos')
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error(error);
          setCompanyLogoPreviewUrl(null);
          return;
        }
        setCompanyLogoPreviewUrl(data?.signedUrl ?? null);
      });
    return () => { cancelled = true; };
  }, [companyLogoForm.logo_path]);

  useEffect(() => {
    const path = characterForm.reference_image_path;
    if (!path?.trim()) {
      setCharacterReferenceImageUrl(null);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from('digital-asset-character-images')
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error(error);
          setCharacterReferenceImageUrl(null);
          return;
        }
        setCharacterReferenceImageUrl(data?.signedUrl ?? null);
      });
    return () => { cancelled = true; };
  }, [characterForm.reference_image_path]);

  const handleCharacterCreateNew = () => {
    setCharacterForm(emptyCharacterForm());
    setEditingCharacterId(null);
    setCharacterReferenceImageUrl(null);
  };

  const handleCharacterSave = async () => {
    if (!organizationId) return;
    setCharacterSaving(true);
    try {
      const payload = {
        organization_id: organizationId,
        name: characterForm.name ?? null,
        age: characterForm.age ?? null,
        nationality: characterForm.nationality ?? null,
        gender: characterForm.gender ?? null,
        hair_description: characterForm.hair_description ?? null,
        face_description: characterForm.face_description ?? null,
        clothing_description: characterForm.clothing_description ?? null,
        accessories: characterForm.accessories ?? null,
        body_shape: characterForm.body_shape ?? null,
        height: characterForm.height ?? null,
        additional_details: characterForm.additional_details ?? null,
        combined_prompt: buildCombinedPromptFromForm(characterForm) || null,
      };
      if (editingCharacterId) {
        const { error } = await supabase
          .from('digital_asset_characters')
          .update(payload)
          .eq('id', editingCharacterId);
        if (error) throw error;
        toast.success(t('digitalAssets.saveSuccess', 'Saved successfully.'));
        setEditingCharacterId(null);
        setCharacterForm(emptyCharacterForm());
      } else {
        const { error } = await supabase.from('digital_asset_characters').insert(payload);
        if (error) throw error;
        toast.success(t('digitalAssets.saveSuccess', 'Saved successfully.'));
        setCharacterForm(emptyCharacterForm());
      }
      fetchCharacters();
    } catch (err) {
      console.error(err);
      toast.error(t('digitalAssets.saveError', 'Failed to save.'));
    } finally {
      setCharacterSaving(false);
    }
  };

  const handleCharacterEdit = (c: DigitalAssetCharacter) => {
    setCharacterForm({
      name: c.name ?? '',
      age: c.age ?? '',
      nationality: c.nationality ?? '',
      gender: c.gender ?? '',
      hair_description: c.hair_description ?? '',
      face_description: c.face_description ?? '',
      clothing_description: c.clothing_description ?? '',
      accessories: c.accessories ?? '',
      body_shape: c.body_shape ?? '',
      height: c.height ?? '',
      additional_details: c.additional_details ?? '',
      reference_image_path: c.reference_image_path ?? null,
      combined_prompt: c.combined_prompt ?? null,
    });
    setEditingCharacterId(c.id);
  };

  const handleCharacterDelete = async (id: string) => {
    if (!window.confirm('Delete this character?')) return;
    try {
      const { error } = await supabase.from('digital_asset_characters').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('digitalAssets.deleteSuccess', 'Deleted successfully.'));
      if (editingCharacterId === id) {
        setEditingCharacterId(null);
        setCharacterForm(emptyCharacterForm());
      }
      fetchCharacters();
    } catch (err) {
      console.error(err);
      toast.error(t('digitalAssets.deleteError', 'Failed to delete.'));
    }
  };

  const handleObjectCreateNew = () => {
    setObjectForm(emptyObjectForm());
    setEditingObjectId(null);
  };

  const handleObjectSave = async () => {
    if (!organizationId) return;
    setObjectSaving(true);
    try {
      const payload = {
        organization_id: organizationId,
        name: objectForm.name ?? null,
        description: objectForm.description ?? null,
      };
      if (editingObjectId) {
        const { error } = await supabase
          .from('digital_asset_objects')
          .update(payload)
          .eq('id', editingObjectId);
        if (error) throw error;
        toast.success(t('digitalAssets.saveSuccess', 'Saved successfully.'));
        setEditingObjectId(null);
        setObjectForm(emptyObjectForm());
      } else {
        const { error } = await supabase.from('digital_asset_objects').insert(payload);
        if (error) throw error;
        toast.success(t('digitalAssets.saveSuccess', 'Saved successfully.'));
        setObjectForm(emptyObjectForm());
      }
      fetchObjects();
    } catch (err) {
      console.error(err);
      toast.error(t('digitalAssets.saveError', 'Failed to save.'));
    } finally {
      setObjectSaving(false);
    }
  };

  const handleObjectEdit = (o: DigitalAssetObject) => {
    setObjectForm({ name: o.name ?? '', description: o.description ?? '' });
    setEditingObjectId(o.id);
  };

  const handleObjectDelete = async (id: string) => {
    if (!window.confirm('Delete this object?')) return;
    try {
      const { error } = await supabase.from('digital_asset_objects').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('digitalAssets.deleteSuccess', 'Deleted successfully.'));
      if (editingObjectId === id) {
        setEditingObjectId(null);
        setObjectForm(emptyObjectForm());
      }
      fetchObjects();
    } catch (err) {
      console.error(err);
      toast.error(t('digitalAssets.deleteError', 'Failed to delete.'));
    }
  };

  const handleBrandColorCreateNew = () => {
    setBrandColorForm(emptyBrandColorForm());
    setEditingBrandColorId(null);
  };

  const handleBrandColorSave = async () => {
    if (!organizationId) return;
    const toHex = (v: string | null | undefined) => (v ?? '').trim().replace(/^#/, '');
    const bg = toHex(brandColorForm.background_color_hex);
    const primary = toHex(brandColorForm.primary_color_hex);
    const secondary = toHex(brandColorForm.secondary_color_hex);
    const accent = toHex(brandColorForm.accent_color_hex);
    const text = toHex(brandColorForm.text_color_hex);
    const validHex = (h: string) => !h || /^[0-9A-Fa-f]{6}$/.test(h);
    if (!validHex(bg) || !validHex(primary) || !validHex(secondary) || !validHex(accent) || !validHex(text)) {
      toast.error(t('digitalAssets.brandColorInvalidHex', 'Enter valid hex colors (e.g. FF5733) for all fields.'));
      return;
    }
    const bgPct = Math.min(100, Math.max(0, Number(brandColorForm.background_color_percent) || 40));
    const primaryPct = Math.min(100, Math.max(0, Number(brandColorForm.primary_color_percent) || 30));
    const secondaryPct = Math.min(100, Math.max(0, Number(brandColorForm.secondary_color_percent) || 20));
    const accentPct = Math.min(100, Math.max(0, Number(brandColorForm.accent_color_percent) || 10));
    const totalPercent = bgPct + primaryPct + secondaryPct + accentPct;
    if (totalPercent !== 100) {
      toast.error(t('digitalAssets.brandColorTotalPercentMustBe100', 'Total color percentage must be 100%.'));
      return;
    }
    setBrandColorSaving(true);
    try {
      const payload = {
        organization_id: organizationId,
        brand_name: brandColorForm.brand_name?.trim() || null,
        background_color_hex: bg ? `#${bg}` : null,
        background_color_percent: bgPct,
        primary_color_hex: primary ? `#${primary}` : null,
        primary_color_percent: primaryPct,
        secondary_color_hex: secondary ? `#${secondary}` : null,
        secondary_color_percent: secondaryPct,
        accent_color_hex: accent ? `#${accent}` : null,
        accent_color_percent: accentPct,
        text_color_hex: text ? `#${text}` : null,
      };
      if (editingBrandColorId) {
        const { error } = await supabase
          .from('digital_asset_brand_colors')
          .update(payload)
          .eq('id', editingBrandColorId);
        if (error) throw error;
        toast.success(t('digitalAssets.saveSuccess', 'Saved successfully.'));
        setEditingBrandColorId(null);
        setBrandColorForm(emptyBrandColorForm());
      } else {
        const { error } = await supabase.from('digital_asset_brand_colors').insert(payload);
        if (error) throw error;
        toast.success(t('digitalAssets.saveSuccess', 'Saved successfully.'));
        setBrandColorForm(emptyBrandColorForm());
      }
      fetchBrandColors();
    } catch (err) {
      console.error(err);
      toast.error(t('digitalAssets.saveError', 'Failed to save.'));
    } finally {
      setBrandColorSaving(false);
    }
  };

  const handleBrandColorEdit = (b: DigitalAssetBrandColor) => {
    setBrandColorForm({
      brand_name: b.brand_name ?? '',
      background_color_hex: b.background_color_hex ?? '',
      background_color_percent: b.background_color_percent ?? 40,
      primary_color_hex: b.primary_color_hex ?? '',
      primary_color_percent: b.primary_color_percent ?? 30,
      secondary_color_hex: b.secondary_color_hex ?? '',
      secondary_color_percent: b.secondary_color_percent ?? 20,
      accent_color_hex: b.accent_color_hex ?? '',
      accent_color_percent: b.accent_color_percent ?? 10,
      text_color_hex: b.text_color_hex ?? '',
    });
    setEditingBrandColorId(b.id);
  };

  const handleBrandColorDelete = async (id: string) => {
    if (!window.confirm(t('digitalAssets.confirmDeleteBrandColor', 'Delete this brand color?'))) return;
    try {
      const { error } = await supabase.from('digital_asset_brand_colors').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('digitalAssets.deleteSuccess', 'Deleted successfully.'));
      if (editingBrandColorId === id) {
        setEditingBrandColorId(null);
        setBrandColorForm(emptyBrandColorForm());
      }
      fetchBrandColors();
    } catch (err) {
      console.error(err);
      toast.error(t('digitalAssets.deleteError', 'Failed to delete.'));
    }
  };

  const handleCompanyLogoCreateNew = () => {
    setCompanyLogoForm(emptyCompanyLogoForm());
    setCompanyLogoFile(null);
    setEditingCompanyLogoId(null);
    setCompanyLogoPreviewUrl(null);
  };

  const getLogoExtension = (file: File): string => {
    const n = file.name.toLowerCase();
    if (n.endsWith('.png')) return 'png';
    if (n.endsWith('.webp')) return 'webp';
    if (n.endsWith('.gif')) return 'gif';
    return 'jpg';
  };

  const handleCompanyLogoSave = async () => {
    if (!organizationId) return;
    const brandName = (companyLogoForm.brand_name ?? '').trim();
    if (!brandName) {
      toast.error(t('digitalAssets.companyLogoBrandNameRequired', 'Brand name is required.'));
      return;
    }
    const isEdit = !!editingCompanyLogoId;
    if (!isEdit && !companyLogoFile) {
      toast.error(t('digitalAssets.companyLogoFileRequired', 'Please select a logo file to upload.'));
      return;
    }
    setCompanyLogosSaving(true);
    try {
      const bucket = 'digital-asset-company-logos';
      if (isEdit) {
        const id = editingCompanyLogoId!;
        let logoPath = companyLogoForm.logo_path ?? null;
        if (companyLogoFile) {
          const ext = getLogoExtension(companyLogoFile);
          const path = `${organizationId}/${id}.${ext}`;
          const { error: uploadError } = await supabase.storage.from(bucket).upload(path, companyLogoFile, { upsert: true });
          if (uploadError) throw uploadError;
          logoPath = path;
        }
        const { error } = await supabase
          .from('digital_asset_company_logos')
          .update({ brand_name: brandName || null, logo_path: logoPath })
          .eq('id', id);
        if (error) throw error;
        toast.success(t('digitalAssets.saveSuccess', 'Saved successfully.'));
        setEditingCompanyLogoId(null);
        setCompanyLogoForm(emptyCompanyLogoForm());
        setCompanyLogoFile(null);
      } else {
        const id = crypto.randomUUID();
        const ext = getLogoExtension(companyLogoFile!);
        const path = `${organizationId}/${id}.${ext}`;
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, companyLogoFile!);
        if (uploadError) throw uploadError;
        const { error } = await supabase.from('digital_asset_company_logos').insert({
          id,
          organization_id: organizationId,
          brand_name: brandName || null,
          logo_path: path,
        });
        if (error) throw error;
        toast.success(t('digitalAssets.saveSuccess', 'Saved successfully.'));
        setCompanyLogoForm(emptyCompanyLogoForm());
        setCompanyLogoFile(null);
      }
      fetchCompanyLogos();
    } catch (err) {
      console.error(err);
      toast.error(t('digitalAssets.saveError', 'Failed to save.'));
    } finally {
      setCompanyLogosSaving(false);
    }
  };

  const handleCompanyLogoEdit = (logo: DigitalAssetCompanyLogo) => {
    setCompanyLogoForm({ brand_name: logo.brand_name ?? '', logo_path: logo.logo_path ?? null });
    setCompanyLogoFile(null);
    setEditingCompanyLogoId(logo.id);
  };

  const handleCompanyLogoDelete = async (id: string) => {
    if (!window.confirm(t('digitalAssets.confirmDeleteCompanyLogo', 'Delete this company logo?'))) return;
    try {
      const logo = companyLogos.find((l) => l.id === id);
      if (logo?.logo_path) {
        await supabase.storage.from('digital-asset-company-logos').remove([logo.logo_path]);
      }
      const { error } = await supabase.from('digital_asset_company_logos').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('digitalAssets.deleteSuccess', 'Deleted successfully.'));
      if (editingCompanyLogoId === id) {
        setEditingCompanyLogoId(null);
        setCompanyLogoForm(emptyCompanyLogoForm());
        setCompanyLogoFile(null);
        setCompanyLogoPreviewUrl(null);
      }
      fetchCompanyLogos();
    } catch (err) {
      console.error(err);
      toast.error(t('digitalAssets.deleteError', 'Failed to delete.'));
    }
  };

  return (
    <div className="space-y-4 bg-white text-gray-900">
      {/* Tips */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-2">
        <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">{t('digitalAssets.tipsTitle', 'Usage Tips')}</p>
          <p className="text-xs text-blue-800 mt-1">{t('digitalAssets.tipsBody', 'This is your asset management center.')}</p>
        </div>
      </div>

      {onNavigateToDetectImage && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNavigateToDetectImage}
            className="border-gray-300 text-gray-700"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {t('detectFromImage.useDetectImage', 'Use Image Detection')}
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'character' | 'object' | 'brandColor' | 'companyLogo')} className="w-full">
        <TabsList className="bg-gray-100 border border-gray-200">
          <TabsTrigger value="character" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <User className="h-4 w-4 mr-2" />
            {t('digitalAssets.tabCharacter', 'Character')}
          </TabsTrigger>
          <TabsTrigger value="object" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Box className="h-4 w-4 mr-2" />
            {t('digitalAssets.tabObject', 'Object')}
          </TabsTrigger>
          <TabsTrigger value="brandColor" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Palette className="h-4 w-4 mr-2" />
            {t('digitalAssets.tabBrandColor', 'Brand Color')}
          </TabsTrigger>
          <TabsTrigger value="companyLogo" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Building2 className="h-4 w-4 mr-2" />
            {t('digitalAssets.tabCompanyLogo', 'Company Logo')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="character" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Character form */}
            <div className="space-y-4 border border-gray-200 rounded-lg bg-white p-4">
              {/* Reference image (from Detect from Image) */}
              {characterForm.reference_image_path ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('digitalAssets.referenceImage', 'Reference Image')}</h4>
                  {characterReferenceImageUrl ? (
                    <div className="space-y-2">
                      <img
                        src={characterReferenceImageUrl}
                        alt={t('digitalAssets.referenceImage', 'Reference Image')}
                        className="max-w-full min-w-[240px] max-h-80 rounded-md border border-gray-200 object-contain bg-gray-50"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-gray-700"
                        onClick={() => characterReferenceImageUrl && window.open(characterReferenceImageUrl, '_blank', 'noopener')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {t('digitalAssets.downloadImage', 'Download')}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">{t('digitalAssets.loadingImage', 'Loading image...')}</p>
                  )}
                </div>
              ) : editingCharacterId ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('digitalAssets.referenceImage', 'Reference Image')}</h4>
                  <p className="text-sm text-gray-500">{t('digitalAssets.noReferenceImage', 'No reference image')}</p>
                </div>
              ) : null}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('digitalAssets.basicInfo', 'Basic Info')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-700">{t('digitalAssets.characterName', 'Character Name')}</Label>
                    <Input
                      value={characterForm.name ?? ''}
                      onChange={(e) => setCharacterForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder={t('digitalAssets.characterNamePlaceholder', 'Name')}
                      className="mt-1 border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">{t('digitalAssets.age', 'Age')}</Label>
                    <Input
                      value={characterForm.age ?? ''}
                      onChange={(e) => setCharacterForm((f) => ({ ...f, age: e.target.value }))}
                      placeholder={t('digitalAssets.agePlaceholder', 'e.g. 25 years')}
                      className="mt-1 border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">{t('digitalAssets.nationality', 'Nationality')}</Label>
                    <Input
                      value={characterForm.nationality ?? ''}
                      onChange={(e) => setCharacterForm((f) => ({ ...f, nationality: e.target.value }))}
                      placeholder={t('digitalAssets.nationalityPlaceholder', 'e.g. Indonesia')}
                      className="mt-1 border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">{t('digitalAssets.gender', 'Gender')}</Label>
                    <Input
                      value={characterForm.gender ?? ''}
                      onChange={(e) => setCharacterForm((f) => ({ ...f, gender: e.target.value }))}
                      placeholder={t('digitalAssets.genderPlaceholder', 'Male / Female')}
                      className="mt-1 border-gray-300 bg-white"
                    />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('digitalAssets.physicalAppearance', 'Physical Appearance')}</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-700">{t('digitalAssets.hair', 'Hair')}</Label>
                    <textarea
                      value={characterForm.hair_description ?? ''}
                      onChange={(e) => setCharacterForm((f) => ({ ...f, hair_description: e.target.value }))}
                      placeholder={t('digitalAssets.hairPlaceholder', 'Detailed hair description...')}
                      className="mt-1 w-full min-h-[80px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">{t('digitalAssets.face', 'Face')}</Label>
                    <textarea
                      value={characterForm.face_description ?? ''}
                      onChange={(e) => setCharacterForm((f) => ({ ...f, face_description: e.target.value }))}
                      placeholder={t('digitalAssets.facePlaceholder', 'Detailed face description...')}
                      className="mt-1 w-full min-h-[80px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('digitalAssets.styleAndBody', 'Style & Body')}</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-700">{t('digitalAssets.accessories', 'Accessories')}</Label>
                    <textarea
                      value={characterForm.accessories ?? ''}
                      onChange={(e) => setCharacterForm((f) => ({ ...f, accessories: e.target.value }))}
                      placeholder={t('digitalAssets.accessoriesPlaceholder', 'Glasses, necklace, watch...')}
                      className="mt-1 w-full min-h-[60px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">{t('digitalAssets.bodyShape', 'Body Shape')}</Label>
                    <textarea
                      value={characterForm.body_shape ?? ''}
                      onChange={(e) => setCharacterForm((f) => ({ ...f, body_shape: e.target.value }))}
                      placeholder={t('digitalAssets.bodyShapePlaceholder', 'Athletic, slim, heavy...')}
                      className="mt-1 w-full min-h-[60px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">{t('digitalAssets.height', 'Height')}</Label>
                    <Input
                      value={characterForm.height ?? ''}
                      onChange={(e) => setCharacterForm((f) => ({ ...f, height: e.target.value }))}
                      placeholder={t('digitalAssets.heightPlaceholder', 'e.g. 175cm')}
                      className="mt-1 border-gray-300 bg-white"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-gray-700">{t('digitalAssets.clothing', 'Clothing')}</Label>
                <textarea
                  value={characterForm.clothing_description ?? ''}
                  onChange={(e) => setCharacterForm((f) => ({ ...f, clothing_description: e.target.value }))}
                  placeholder={t('digitalAssets.clothingPlaceholder', 'What the character is wearing...')}
                  className="mt-1 w-full min-h-[80px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-gray-700">{t('digitalAssets.detail', 'Detail')}</Label>
                <textarea
                  value={characterForm.additional_details ?? ''}
                  onChange={(e) => setCharacterForm((f) => ({ ...f, additional_details: e.target.value }))}
                  placeholder={t('digitalAssets.detailPlaceholder', 'Setting, background, special features, other notes...')}
                  className="mt-1 w-full min-h-[80px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              {characterForm.combined_prompt?.trim() ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900">{t('digitalAssets.combinedPromptTitle', 'Combined prompt')}</h4>
                  <textarea
                    readOnly
                    value={characterForm.combined_prompt}
                    className="w-full min-h-[80px] rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                    rows={5}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-gray-300"
                    onClick={() => {
                      navigator.clipboard.writeText(characterForm.combined_prompt ?? '');
                      toast.success(t('digitalAssets.promptCopied', 'Copied'));
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {t('digitalAssets.copyPrompt', 'Copy prompt')}
                  </Button>
                </div>
              ) : null}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleCharacterCreateNew} className="border-gray-300 text-gray-700">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('digitalAssets.createNew', 'Create New')}
                </Button>
                <Button type="button" onClick={handleCharacterSave} disabled={characterSaving} className="bg-blue-600 hover:bg-blue-700">
                  <Check className="h-4 w-4 mr-2" />
                  {t('digitalAssets.save', 'Save')}
                </Button>
              </div>
            </div>

            {/* Character list */}
            <div className="border border-gray-200 rounded-lg bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('digitalAssets.savedCharacters', 'Saved Characters')}</h4>
              {charactersLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : characters.length === 0 ? (
                <p className="text-sm text-gray-500">{t('digitalAssets.noCharacters', 'No characters yet.')}</p>
              ) : (
                <ul className="space-y-2">
                  {characters.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{c.name || '—'}</p>
                        <p className="text-xs text-gray-600">
                          {[c.gender, c.age].filter(Boolean).join(' - ') || '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => handleCharacterEdit(c)} className="h-8 w-8 p-0 text-blue-600">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleCharacterDelete(c.id)} className="h-8 w-8 p-0 text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="object" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Object form */}
            <div className="space-y-4 border border-gray-200 rounded-lg bg-white p-4">
              <div>
                <Label className="text-gray-700">{t('digitalAssets.objectName', 'Object Name')}</Label>
                <Input
                  value={objectForm.name ?? ''}
                  onChange={(e) => setObjectForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t('digitalAssets.objectNamePlaceholder', 'Name')}
                  className="mt-1 border-gray-300 bg-white"
                />
              </div>
              <div>
                <Label className="text-gray-700">{t('digitalAssets.objectDescription', 'Object Description')}</Label>
                <textarea
                  value={objectForm.description ?? ''}
                  onChange={(e) => setObjectForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t('digitalAssets.objectDescriptionPlaceholder', 'Object description...')}
                  className="mt-1 w-full min-h-[120px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  rows={4}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleObjectCreateNew} className="border-gray-300 text-gray-700">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('digitalAssets.createNew', 'Create New')}
                </Button>
                <Button type="button" onClick={handleObjectSave} disabled={objectSaving} className="bg-blue-600 hover:bg-blue-700">
                  <Check className="h-4 w-4 mr-2" />
                  {t('digitalAssets.save', 'Save')}
                </Button>
              </div>
            </div>

            {/* Object list */}
            <div className="border border-gray-200 rounded-lg bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('digitalAssets.savedObjects', 'Saved Objects')}</h4>
              {objectsLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : objects.length === 0 ? (
                <p className="text-sm text-gray-500">{t('digitalAssets.noObjects', 'No objects yet.')}</p>
              ) : (
                <ul className="space-y-2">
                  {objects.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{o.name || '—'}</p>
                        <p className="text-xs text-gray-600 line-clamp-2">{o.description || '—'}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => handleObjectEdit(o)} className="h-8 w-8 p-0 text-blue-600">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleObjectDelete(o.id)} className="h-8 w-8 p-0 text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="brandColor" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Brand Color form */}
            <div className="space-y-4 border border-gray-200 rounded-lg bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('digitalAssets.tabBrandColor', 'Brand Color')}</h4>
              <p className="text-sm text-gray-600 mb-3">
                {t('digitalAssets.brandColorDescription', 'Manage your brand colors for use in design generation and consistent branding.')}
              </p>
              <div>
                <Label className="text-gray-700">{t('digitalAssets.brandColorBrandName', 'Brand Name')}</Label>
                <Input
                  value={brandColorForm.brand_name ?? ''}
                  onChange={(e) => setBrandColorForm((f) => ({ ...f, brand_name: e.target.value }))}
                  placeholder={t('digitalAssets.brandColorBrandNamePlaceholder', 'e.g. My Brand')}
                  className="mt-1 border-gray-300 bg-white"
                />
              </div>
              {[
                { key: 'background_color_hex' as const, label: t('digitalAssets.brandColorBackground', 'Background Color'), percentKey: 'background_color_percent' as const },
                { key: 'primary_color_hex' as const, label: t('digitalAssets.brandColorPrimary', 'Primary Color'), percentKey: 'primary_color_percent' as const },
                { key: 'secondary_color_hex' as const, label: t('digitalAssets.brandColorSecondary', 'Secondary Color'), percentKey: 'secondary_color_percent' as const },
                { key: 'accent_color_hex' as const, label: t('digitalAssets.brandColorAccent', 'Accent Color'), percentKey: 'accent_color_percent' as const },
                { key: 'text_color_hex' as const, label: t('digitalAssets.brandColorText', 'Text Color'), percentKey: null },
              ].map(({ key, label, percentKey }) => {
                const val = brandColorForm[key] ?? '';
                const hexNorm = val.replace(/^#/, '').slice(0, 6);
                const displayHex = /^[0-9A-Fa-f]{6}$/.test(hexNorm) ? `#${hexNorm}` : '#000000';
                return (
                  <div key={key}>
                    <Label className="text-gray-700">{label}</Label>
                    <div className="flex gap-2 mt-1 items-center flex-wrap">
                      <input
                        type="color"
                        value={displayHex}
                        onChange={(e) => setBrandColorForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="h-10 w-14 rounded border border-gray-300 cursor-pointer bg-white"
                      />
                      <Input
                        value={val}
                        onChange={(e) => setBrandColorForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder="#000000"
                        className="flex-1 min-w-[100px] border-gray-300 bg-white font-mono"
                      />
                      {percentKey && (
                        <div className="flex items-center gap-1">
                          <Label className="text-gray-500 text-xs whitespace-nowrap">{t('digitalAssets.brandColorPercent', 'Percentage')}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={brandColorForm[percentKey] ?? ''}
                            onChange={(e) => setBrandColorForm((f) => ({ ...f, [percentKey]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                            className="w-16 border-gray-300 bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {(() => {
                const bgP = Number(brandColorForm.background_color_percent) || 0;
                const pP = Number(brandColorForm.primary_color_percent) || 0;
                const sP = Number(brandColorForm.secondary_color_percent) || 0;
                const aP = Number(brandColorForm.accent_color_percent) || 0;
                const total = bgP + pP + sP + aP;
                return (
                  <div className="text-sm">
                    <span className="text-gray-600">{t('digitalAssets.brandColorTotalPercent', 'Total %')}: </span>
                    <span className={total === 100 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{total}%</span>
                    {total !== 100 && (
                      <p className="text-red-600 mt-1">{t('digitalAssets.brandColorTotalPercentMustBe100', 'Total color percentage must be 100%.')}</p>
                    )}
                  </div>
                );
              })()}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleBrandColorCreateNew} className="border-gray-300 text-gray-700">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('digitalAssets.createNew', 'Create New')}
                </Button>
                <Button type="button" onClick={handleBrandColorSave} disabled={brandColorSaving} className="bg-blue-600 hover:bg-blue-700">
                  <Check className="h-4 w-4 mr-2" />
                  {t('digitalAssets.save', 'Save')}
                </Button>
              </div>
            </div>

            {/* Saved Brand Colors */}
            <div className="border border-gray-200 rounded-lg bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('digitalAssets.savedBrandColors', 'Saved Brand Colors')}</h4>
              {brandColorsLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : brandColors.length === 0 ? (
                <p className="text-sm text-gray-500">{t('digitalAssets.noBrandColors', 'No brand colors yet.')}</p>
              ) : (
                <ul className="space-y-2">
                  {brandColors.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <div
                          className="flex gap-1 flex-shrink-0"
                          title={`${b.background_color_percent ?? 40}% / ${b.primary_color_percent ?? 30}% / ${b.secondary_color_percent ?? 20}% / ${b.accent_color_percent ?? 10}%`}
                        >
                          {[b.background_color_hex, b.primary_color_hex, b.secondary_color_hex, b.accent_color_hex, b.text_color_hex].map((hex, i) => (
                            <span
                              key={i}
                              className="w-8 h-8 rounded border border-gray-300"
                              style={{ backgroundColor: hex || '#ccc' }}
                              title={hex ?? ''}
                            />
                          ))}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{b.brand_name || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => handleBrandColorEdit(b)} className="h-8 w-8 p-0 text-blue-600">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleBrandColorDelete(b.id)} className="h-8 w-8 p-0 text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="companyLogo" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4 border border-gray-200 rounded-lg bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('digitalAssets.tabCompanyLogo', 'Company Logo')}</h4>
              <p className="text-sm text-gray-600 mb-3">
                {t('digitalAssets.companyLogoDescription', 'Manage company logos for use in design generation.')}
              </p>
              <div>
                <Label className="text-gray-700">{t('digitalAssets.companyLogoBrandName', 'Brand Name')}</Label>
                <Input
                  value={companyLogoForm.brand_name ?? ''}
                  onChange={(e) => setCompanyLogoForm((f) => ({ ...f, brand_name: e.target.value }))}
                  placeholder={t('digitalAssets.companyLogoBrandNamePlaceholder', 'e.g. My Brand')}
                  className="mt-1 border-gray-300 bg-white"
                />
              </div>
              <div>
                <Label className="text-gray-700">{t('digitalAssets.companyLogoUpload', 'Upload Logo')}</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm text-gray-500 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setCompanyLogoFile(f ?? null);
                      e.target.value = '';
                    }}
                  />
                </div>
                {editingCompanyLogoId && companyLogoForm.logo_path && (
                  <p className="text-xs text-gray-500 mt-1">{t('digitalAssets.companyLogoLeaveEmptyToKeep', 'Leave empty to keep current logo.')}</p>
                )}
                {(companyLogoPreviewUrl || companyLogoFile) && (
                  <div className="mt-2">
                    {companyLogoFile ? (
                      <img src={URL.createObjectURL(companyLogoFile)} alt="Preview" className="h-20 w-20 object-contain rounded border border-gray-200" />
                    ) : companyLogoPreviewUrl ? (
                      <img src={companyLogoPreviewUrl} alt="Logo" className="h-20 w-20 object-contain rounded border border-gray-200" />
                    ) : null}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleCompanyLogoCreateNew} className="border-gray-300 text-gray-700">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('digitalAssets.createNew', 'Create New')}
                </Button>
                <Button type="button" onClick={handleCompanyLogoSave} disabled={companyLogosSaving} className="bg-blue-600 hover:bg-blue-700">
                  <Check className="h-4 w-4 mr-2" />
                  {t('digitalAssets.save', 'Save')}
                </Button>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('digitalAssets.savedCompanyLogos', 'Saved Company Logos')}</h4>
              {companyLogosLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : companyLogos.length === 0 ? (
                <p className="text-sm text-gray-500">{t('digitalAssets.noCompanyLogos', 'No company logos yet.')}</p>
              ) : (
                <ul className="space-y-2">
                  {companyLogos.map((logo) => (
                    <CompanyLogoRow
                      key={logo.id}
                      logo={logo}
                      onEdit={() => handleCompanyLogoEdit(logo)}
                      onDelete={() => handleCompanyLogoDelete(logo.id)}
                      t={t}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
