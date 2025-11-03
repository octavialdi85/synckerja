
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
  industry: string;
  acceptTerms: boolean;
}

const initialFormData: OrganizationFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  description: "",
  industry: "",
  acceptTerms: false,
};

const OrganizationForm = () => {
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

      const userId = user.user.id;
      const timestamp = new Date().toISOString();

      // Step 1: Fetch profile data and create organization in parallel (early optimization)
      const [profileResult, orgResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('organizations')
          .insert([
            {
              company_name: data.name,
              email: data.email,
              phone_number: data.phone,
              address: data.address,
              website: data.website,
              description: data.description,
              industry: data.industry,
              user_id: userId,
              created_by: userId,
              terms_accepted: !!data.acceptTerms,
              terms_accepted_at: data.acceptTerms ? timestamp : null,
            }
          ])
          .select()
          .single()
      ]);

      if (orgResult.error) {
        throw orgResult.error;
      }

      const orgData = orgResult.data as any;
      const profileData = profileResult.data;

      // Step 2: Create department, user_organizations, and user_roles
      // Note: Create department manually since trigger might not work consistently
      const [deptResult, userOrgResult, roleResult] = await Promise.all([
        supabase
          .from('departments')
          .insert({
            name: data.name,
            description: 'Default department',
            organization_id: orgData.id,
            is_default: true,
            is_active: true,
            created_by: userId,
            created_at: timestamp,
            updated_at: timestamp
          })
          .select('id')
          .single(),
        supabase
          .from('user_organizations')
          .insert({
            user_id: userId,
            organization_id: orgData.id,
            is_active: true,
            created_at: timestamp,
            joined_at: timestamp,
            updated_at: timestamp
          }),
        supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            organization_id: orgData.id,
            role: 'owner',
            created_at: timestamp,
            updated_at: timestamp
          })
      ]);

      // Handle department creation result
      let defaultDeptId = null;
      if (deptResult.error) {
        console.error('Error creating default department:', deptResult.error);
        // Don't throw - try to continue without department
        // Check if trigger created it
        const { data: existingDept } = await supabase
          .from('departments')
          .select('id')
          .eq('organization_id', orgData.id)
          .eq('is_default', true)
          .maybeSingle();
        
        defaultDeptId = existingDept?.id || null;
        
        if (!defaultDeptId) {
          console.warn('No default department found - continuing without department');
        }
      } else {
        defaultDeptId = deptResult.data?.id || null;
        console.log('Default department created successfully:', defaultDeptId);
      }

      if (userOrgResult.error) {
        console.error('Error creating user organization:', userOrgResult.error);
        throw new Error('Failed to link user to organization');
      }

      if (roleResult.error) {
        console.error('Error creating user role:', roleResult.error);
        throw new Error('Failed to assign user role');
      }

      // Step 3: Create employee and update profile in parallel
      const [employeeResult, profileUpdateResult] = await Promise.all([
        supabase
          .from('employees')
          .insert({
            user_id: userId,
            organization_id: orgData.id,
            full_name: profileData?.full_name || 'User',
            email: profileData?.email || null,
            department_id: defaultDeptId,
            created_at: timestamp,
            updated_at: timestamp,
            created_by: userId,
          }),
        supabase
          .from('profiles')
          .update({
            active_organization_id: orgData.id,
            organization_created: true,
            updated_at: timestamp
          })
          .eq('user_id', userId)
      ]);

      if (employeeResult.error) {
        console.error('Error creating employee for creator:', employeeResult.error);
        throw new Error('Failed to create initial employee');
      }

      if (profileUpdateResult.error) {
        console.error('Error updating profile:', profileUpdateResult.error);
        // Don't throw error here as organization was created successfully
      }

      // Step 4: Check subscription status (can be done in parallel with profile update, but safer to do after)
      const { data: orgCheck } = await supabase
        .from('organizations')
        .select('has_active_subscription')
        .eq('id', orgData.id)
        .single();

      const hasActiveSubscription = orgCheck?.has_active_subscription === true;

      // Show success toast
      toast({
        title: "Organisasi berhasil dibuat",
        description: `Organisasi ${data.name} telah berhasil dibuat.`
      });

      // Store organization ID for next steps
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('newOrganizationId', orgData.id);
        sessionStorage.setItem('organizationJustCreated', 'true');
        // Set force refresh flag to update user data context
        sessionStorage.setItem('forceRefreshUserData', 'true');
      }

      // Simplified redirect logic - always redirect to create-plan if no active subscription
      // Otherwise redirect to home
      const redirectPath = hasActiveSubscription ? '/' : '/create-plan';
      
      // Use immediate window.location.href for forceful redirect that cannot be intercepted
      // This ensures redirect happens even if other components try to interfere
      if (typeof window !== 'undefined') {
        // Small delay to ensure all state updates are complete, then force redirect
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
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
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Basic Information */}
      <Card className="mx-0 sm:mx-0">
        <CardHeader className="px-4 sm:px-6 pb-3 sm:pb-6 pt-4 sm:pt-6">
          <CardTitle className="text-base sm:text-lg">Informasi Dasar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
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
      <Card className="mx-0 sm:mx-0 mt-3 sm:mt-0">
        <CardHeader className="px-4 sm:px-6 pb-3 sm:pb-6 pt-4 sm:pt-6">
          <CardTitle className="text-base sm:text-lg">Informasi Tambahan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
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
            <Label htmlFor="industry">Industri</Label>
            <Input
              id="industry"
              value={formData.industry}
              onChange={(e) => handleInputChange('industry', e.target.value)}
              placeholder="Contoh: Teknologi, Keuangan, Kesehatan, dll"
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mt-3 sm:mt-4">
          <div className="text-red-800 text-xs sm:text-sm font-medium">Error:</div>
          <div className="text-red-700 text-xs sm:text-sm mt-1">{error}</div>
        </div>
      )}


      <div className="flex items-center space-x-2 p-3 sm:p-4 bg-muted/50 rounded-lg mt-3 sm:mt-4">
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
        className="w-full h-11 sm:h-11 rounded-lg text-sm sm:text-base font-semibold bg-[#181E29] hover:bg-[#222b3c] mt-3 sm:mt-4"
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
