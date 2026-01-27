
import React, { useState } from 'react';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Button } from '@/features/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/avatar';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/organized/utils';

interface PhotoPortfolioTabProps {
  formData: any;
  setFormData: (data: any) => void;
}

const PhotoPortfolioTab = ({ formData, setFormData }: PhotoPortfolioTabProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `kol-profiles/${fileName}`;

      const { data, error } = await supabase.storage
        .from('kol-profile-photos')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('kol-profile-photos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, profile_photo_url: publicUrl }));

      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (formData.profile_photo_url) {
      try {
        // Extract file path from URL
        const url = new URL(formData.profile_photo_url);
        const filePath = url.pathname.split('/').slice(-2).join('/');
        
        await supabase.storage
          .from('kol-profile-photos')
          .remove([filePath]);
      } catch (error) {
        console.error('Error removing photo:', error);
      }
      
      setFormData(prev => ({ ...prev, profile_photo_url: undefined }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <Label className="text-base font-semibold">Profile Photo</Label>
        
        <div className="flex items-center gap-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src={formData.profile_photo_url} alt="Profile" />
            <AvatarFallback className="bg-gray-100 text-gray-600 text-lg">
              {formData.name ? formData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'KOL'}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById('photo-upload')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </Button>
              
              {formData.profile_photo_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removePhoto}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
            
            <p className="text-xs text-gray-500">
              Upload a profile photo (max 5MB). JPG, PNG formats supported.
            </p>
          </div>
        </div>
        
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="website">Website/Portfolio URL</Label>
          <Input
            id="website"
            type="url"
            value={formData.website || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
            placeholder="https://portfolio.example.com"
          />
        </div>

        <div>
          <Label htmlFor="languages">Languages Spoken</Label>
          <Input
            id="languages"
            value={formData.languages || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, languages: e.target.value }))}
            placeholder="Indonesian, English, Mandarin"
          />
        </div>

        <div>
          <Label htmlFor="specialties">Specialties/Niches</Label>
          <Input
            id="specialties"
            value={formData.specialties || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, specialties: e.target.value }))}
            placeholder="Beauty, Fashion, Lifestyle, Technology"
          />
        </div>

        <div>
          <Label htmlFor="communication_method">Preferred Communication</Label>
          <Input
            id="communication_method"
            value={formData.communication_method || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, communication_method: e.target.value }))}
            placeholder="WhatsApp, Email, Instagram DM"
          />
        </div>
      </div>
    </div>
  );
};

export default PhotoPortfolioTab;
