import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Separator } from '@/features/ui/separator';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { useProfile } from '@/features/2-1-employees/MyInfo/Documents/hooks/useProfile';
import { useAvatarSync } from '@/features/2-1-employees/MyInfo/PersonalInformation/hooks/useAvatarSync';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ProfileUpdateData = {
  full_name: string;
  phone: string;
  bio: string;
  job_title: string;
  location: string;
  website: string;
  profile_photo_url: string | null;
};

const useUpdateProfile = () => {
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
      toast.success('Profil berhasil diperbarui');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal memperbarui profil');
    }
  });
};

const ProfileSettings = () => {
  const { data: profile, isLoading, error } = useProfile();
  const updateProfile = useUpdateProfile();
  const { syncAvatarAcrossApp } = useAvatarSync();
  
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
          <CardTitle>Foto Profil</CardTitle>
          <CardDescription>
            Upload foto profil Anda. Foto akan terlihat di seluruh aplikasi.
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
          <CardTitle>Informasi Personal</CardTitle>
          <CardDescription>
            Perbarui informasi personal dan kontak Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nama Lengkap</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Masukkan nomor telepon"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title">Jabatan</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                placeholder="Masukkan jabatan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Masukkan lokasi"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://website-anda.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Ceritakan sedikit tentang diri Anda..."
              rows={4}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {hasChanges ? 'Ada perubahan yang belum disimpan' : 'Semua perubahan telah disimpan'}
            </div>
            <div className="flex space-x-3">
              {hasChanges && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={updateProfile.isPending}
                >
                  Reset
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateProfile.isPending}
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Simpan Perubahan
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
