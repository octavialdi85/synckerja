
import { useState } from "react";
import { Button } from "@/features/ui/button";
import { Checkbox } from "@/features/ui/checkbox";
import { Input } from "@/features/ui/input";
import { Label } from "@/features/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/ui/card";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/features/1-login/hooks/use-toast";

// Types and initial data
interface OrganizationFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  description: string;
  acceptTerms: boolean;
}

const initialFormData: OrganizationFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  description: "",
  acceptTerms: false,
};

interface OrganizationFormProps {
  onSuccess?: () => void;
}

const OrganizationForm = ({ onSuccess }: OrganizationFormProps) => {
  const [formData, setFormData] = useState<OrganizationFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const createOrganization = async (data: OrganizationFormData) => {
    try {
      setLoading(true);
      setError(null);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      // Create organization in database
      const { data: organization, error } = await supabase
        .from('organizations')
        .insert([
          {
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            website: data.website,
            description: data.description,
            created_by: user.user.id,
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Organisasi berhasil dibuat",
        description: `Organisasi ${data.name} telah berhasil dibuat.`
      });

      if (onSuccess) {
        onSuccess();
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat membuat organisasi');
      toast({
        title: "Error",
        description: err.message || 'Terjadi kesalahan saat membuat organisasi',
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createOrganization(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informasi Dasar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Organisasi *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Masukkan nama organisasi"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Organisasi *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="email@organisasi.com"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Nomor Telepon</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+62 xxx xxxx xxxx"
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informasi Tambahan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Alamat lengkap organisasi"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://www.organisasi.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Deskripsi singkat tentang organisasi"
              disabled={loading}
              className="w-full min-h-[100px] px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 text-sm font-medium">Error:</div>
          <div className="text-red-700 text-sm mt-1">{error}</div>
        </div>
      )}


      <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
        <Checkbox 
          id="terms-accepted" 
          checked={formData.acceptTerms}
          onCheckedChange={(checked) => handleInputChange('acceptTerms', !!checked)}
        />
        <label htmlFor="terms-accepted" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Saya menyetujui syarat dan ketentuan yang berlaku sesuai dengan Perjanjian Layanan platform ini.{" "}
          <Link 
            to="/terms-and-conditions" 
            className="text-primary hover:underline"
          >
            Baca syarat & ketentuan.
          </Link>
        </label>
      </div>

      <Button
        type="submit"
        className="w-full h-11 rounded-lg text-base font-semibold bg-[#181E29] hover:bg-[#222b3c]"
        disabled={loading || !formData.acceptTerms}
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>Membuat Organisasi...</span>
          </div>
        ) : (
          "Buat Organisasi"
        )}
      </Button>
    </form>
  );
};

export default OrganizationForm;
