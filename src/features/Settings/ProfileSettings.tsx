import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Separator } from '@/features/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { useProfile } from '@/features/2-1-employees/MyInfo/Documents/hooks/useProfile';
import { useAvatarSync } from '@/features/2-1-employees/MyInfo/PersonalInformation/hooks/useAvatarSync';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useLanguage } from '@/features/share/i18n/LanguageProvider';
import type { AppLanguage } from '@/features/share/i18n/translations';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export type ProfileUpdateData = {
  full_name: string;
  phone: string;
  bio: string;
  job_title: string;
  location: string;
  website: string;
  profile_photo_url: string | null;
};

type TranslateFn = ReturnType<typeof useAppTranslation>['t'];

const useUpdateProfile = (t: TranslateFn) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Upsert user_profile_details
      const { error: detailsError } = await supabase
        .from('user_profile_details')
        .upsert({
          user_id: user.id,
          profile_id: user.id,
          phone: data.phone || null,
          bio: data.bio || null,
          job_title: data.job_title || null,
          location: data.location || null,
          website: data.website || null,
          profile_photo_url: data.profile_photo_url,
          updated_at: new Date().toISOString()
        }, { onConflict: 'profile_id' });

      if (detailsError) throw detailsError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(t('settings.profile.toast.updateSuccess', 'Profile updated successfully'));
    },
    onError: (error: any) => {
      toast.error(error.message || t('settings.profile.toast.updateError', 'Failed to update profile'));
    }
  });
};

const ProfileSettings = () => {
  const { data: profile, isLoading, error } = useProfile();
  const { syncAvatarAcrossApp } = useAvatarSync();
  const { t } = useAppTranslation();
  const updateProfile = useUpdateProfile(t);
  const { language, setLanguage } = useLanguage();
  const { organizationId } = useCurrentOrg();
  
  const [formData, setFormData] = useState<ProfileUpdateData>({
    full_name: '',
    phone: '',
    bio: '',
    job_title: '',
    location: '',
    website: '',
    profile_photo_url: null,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const loadedOrgIdRef = useRef<string | null>(null); // Track which orgId we've loaded language for

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      const newFormData = {
        full_name: profile.full_name || '',
        phone: (profile as any).phone || '',
        bio: (profile as any).bio || '',
        job_title: (profile as any).job_title || '',
        location: (profile as any).location || '',
        website: (profile as any).website || '',
        profile_photo_url: (profile as any).profile_photo_url || null,
      };
      setFormData(newFormData);
      setHasChanges(false);
    }
  }, [profile]);

  // Load language from database when organizationId is available
  useEffect(() => {
    // Reset ref when organizationId changes
    if (loadedOrgIdRef.current !== organizationId) {
      loadedOrgIdRef.current = null;
    }

    const loadLanguageFromDatabase = async () => {
      if (!organizationId || loadedOrgIdRef.current === organizationId) {
        // Already loaded for this organizationId
        return;
      }

      try {
        const { data, error } = await supabase
          .from('application_language')
          .select('is_indonesian')
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Failed to load language from database:', error);
          return;
        }

        // Mark as loaded (even if no data found)
        loadedOrgIdRef.current = organizationId;

        if (data) {
          // Convert boolean to AppLanguage: true = "id", false = "en"
          const dbLanguage: AppLanguage = data.is_indonesian ? 'id' : 'en';
          
          // Only update if different from current language
          if (language !== dbLanguage) {
            setLanguage(dbLanguage);
            if (import.meta.env.DEV) {
              console.log('✅ Loaded language from database:', { organizationId, isIndonesian: data.is_indonesian, language: dbLanguage });
            }
          }
        }
      } catch (error: any) {
        console.error('Error loading language from database:', error);
      }
    };

    loadLanguageFromDatabase();
  }, [organizationId, language, setLanguage]);

  const handleInputChange = (field: keyof ProfileUpdateData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handlePhotoUpdate = async (photoUrl: string | null) => {
    setFormData(prev => ({ ...prev, profile_photo_url: photoUrl }));
    setHasChanges(true);
    
    // Sync avatar across the app immediately
    await syncAvatarAcrossApp(photoUrl);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(formData);
      setHasChanges(false);
    } catch (error) {
      // Error handled by the mutation
    }
  };

  const handleReset = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: (profile as any).phone || '',
        bio: (profile as any).bio || '',
        job_title: (profile as any).job_title || '',
        location: (profile as any).location || '',
        website: (profile as any).website || '',
        profile_photo_url: (profile as any).profile_photo_url || null,
      });
      setHasChanges(false);
    }
  };

  // Handle language change and save to database
  const handleLanguageChange = async (value: AppLanguage) => {
    try {
      // Update local state immediately
      setLanguage(value);

      // Save to database if organizationId is available
      if (organizationId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.warn('No authenticated user, language saved to localStorage only');
          return;
        }

        // Convert language to boolean: "id" = true (Indonesian), "en" = false (English)
        const isIndonesian = value === 'id';

        // Upsert language setting to application_language table
        const { error: langError } = await supabase
          .from('application_language')
          .upsert({
            organization_id: organizationId,
            is_indonesian: isIndonesian,
            created_by: user.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'organization_id'
          });

        if (langError) {
          console.error('Failed to save language to database:', langError);
          toast.error(t('settings.profile.language.saveError', 'Failed to save language preference'));
        } else {
          // Update ref to indicate we've loaded language for this organization
          loadedOrgIdRef.current = organizationId;
          if (import.meta.env.DEV) {
            console.log('✅ Language saved to database:', { organizationId, isIndonesian, language: value });
          }
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn('No organizationId available, language saved to localStorage only');
        }
      }
    } catch (error: any) {
      console.error('Error saving language:', error);
      toast.error(t('settings.profile.language.saveError', 'Failed to save language preference'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              Gagal memuat data profil. Silakan coba lagi.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile.language.title", "Application Language")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label className="mb-2 block" htmlFor="language-select">
              {t("settings.profile.language.title", "Application Language")}
            </Label>
            <Select
              value={language}
              onValueChange={(value) => handleLanguageChange(value as AppLanguage)}
            >
              <SelectTrigger id="language-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">
                  {t("settings.profile.language.option.id", "Indonesian")}
                </SelectItem>
                <SelectItem value="en">
                  {t("settings.profile.language.option.en", "English")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile.photo.title", "Profile Photo")}</CardTitle>
          <CardDescription>
            {t(
              "settings.profile.photo.description",
              "Upload your profile photo. It will appear across the app."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ProfilePhotoUpload
            currentPhotoUrl={formData.profile_photo_url}
            fullName={formData.full_name || 'User'}
            onPhotoUpdate={handlePhotoUpdate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile.personal.title", "Personal Information")}</CardTitle>
          <CardDescription>
            {t(
              "settings.profile.personal.description",
              "Update your personal and contact information"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">
                {t("settings.profile.form.fullNameLabel", "Full Name")}
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder={t(
                  "settings.profile.form.fullNamePlaceholder",
                  "Enter your full name"
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                {t("settings.profile.form.phoneLabel", "Phone Number")}
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder={t(
                  "settings.profile.form.phonePlaceholder",
                  "Enter your phone number"
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title">
                {t("settings.profile.form.jobTitleLabel", "Job Title")}
              </Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                placeholder={t(
                  "settings.profile.form.jobTitlePlaceholder",
                  "Enter your job title"
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">
                {t("settings.profile.form.locationLabel", "Location")}
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder={t(
                  "settings.profile.form.locationPlaceholder",
                  "Enter your location"
                )}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website">
                {t("settings.profile.form.websiteLabel", "Website")}
              </Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder={t(
                  "settings.profile.form.websitePlaceholder",
                  "https://your-website.com"
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">
              {t("settings.profile.form.bioLabel", "Bio")}
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder={t(
                "settings.profile.form.bioPlaceholder",
                "Tell us a little about yourself..."
              )}
              rows={4}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {hasChanges
                ? t("settings.profile.status.changesPending", "You have unsaved changes")
                : t("settings.profile.status.noChanges", "All changes have been saved")}
            </div>
            <div className="flex space-x-3">
              {hasChanges && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={updateProfile.isPending}
                >
                  {t("settings.profile.actions.reset", "Reset")}
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateProfile.isPending}
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("settings.profile.actions.saving", "Saving...")}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t("settings.profile.actions.save", "Save Changes")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings;
