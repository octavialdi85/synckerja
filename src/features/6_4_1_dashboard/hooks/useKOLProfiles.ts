
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { useToast } from '@/hooks/organized/utils';

export interface KOLProfile {
  id: string;
  organization_id: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  profile_photo_url?: string;
  category?: string;
  status: 'active' | 'inactive' | 'blacklisted';
  location?: string;
  age?: number;
  gender?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  niche?: string;
  specialties?: string;
  preferred_communication?: string;
  followers_count?: number;
  engagement_rate?: number;
  average_views?: number;
  languages_spoken?: string;
  website_url?: string;
  total_posts?: number;
}

export interface KOLSocialMediaAccount {
  id: string;
  kol_profile_id: string;
  platform: string;
  username: string;
  profile_url?: string;
  followers: number;
  engagement_rate: number;
  average_views: number;
  is_verified: boolean;
}

export interface KOLRate {
  id: string;
  kol_profile_id: string;
  platform: string;
  content_type: string;
  rate_amount: number;
  currency: string;
  rate_type: string;
}

export interface KOLMetrics {
  totalKOLs: number;
  totalFollowers: number;
  totalReach: number;
  totalConversions: number;
  avgEngagement: number;
}

export const useKOLProfiles = () => {
  const [profiles, setProfiles] = useState<KOLProfile[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<KOLSocialMediaAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useCurrentOrg();
  const { toast } = useToast();

  const fetchProfiles = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('kol_profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type assertion to ensure proper typing
      const typedData = (data || []).map(profile => ({
        ...profile,
        status: profile.status as 'active' | 'inactive' | 'blacklisted'
      }));
      
      setProfiles(typedData);
    } catch (error) {
      console.error('Error fetching KOL profiles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch KOL profiles",
        variant: "destructive",
      });
    }
  };

  const fetchSocialAccounts = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('kol_social_media_accounts')
        .select('*')
        .in('kol_profile_id', profiles.map(p => p.id));

      if (error) throw error;
      setSocialAccounts(data || []);
    } catch (error) {
      console.error('Error fetching social accounts:', error);
    }
  };

  const calculateMetrics = (): KOLMetrics => {
    const totalFollowers = socialAccounts.reduce((sum, account) => sum + account.followers, 0);
    const totalReach = socialAccounts.reduce((sum, account) => sum + account.average_views, 0);
    const avgEngagement = socialAccounts.length > 0 
      ? socialAccounts.reduce((sum, account) => sum + account.engagement_rate, 0) / socialAccounts.length 
      : 0;

    return {
      totalKOLs: profiles.length,
      totalFollowers,
      totalReach,
      totalConversions: 0, // This would come from actual conversion data
      avgEngagement
    };
  };

  const createProfile = async (profileData: Omit<KOLProfile, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'created_by'>) => {
    if (!organizationId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('kol_profiles')
        .insert([{
          ...profileData,
          organization_id: organizationId,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      const typedData = {
        ...data,
        status: data.status as 'active' | 'inactive' | 'blacklisted'
      };

      setProfiles(prev => [typedData, ...prev]);
      toast({
        title: "Success",
        description: "KOL profile created successfully",
      });

      return typedData;
    } catch (error) {
      console.error('Error creating KOL profile:', error);
      toast({
        title: "Error",
        description: "Failed to create KOL profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProfile = async (id: string, updates: Partial<KOLProfile>) => {
    try {
      const { data, error } = await supabase
        .from('kol_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const typedData = {
        ...data,
        status: data.status as 'active' | 'inactive' | 'blacklisted'
      };

      setProfiles(prev => prev.map(profile => 
        profile.id === id ? { ...profile, ...typedData } : profile
      ));

      toast({
        title: "Success",
        description: "KOL profile updated successfully",
      });

      return typedData;
    } catch (error) {
      console.error('Error updating KOL profile:', error);
      toast({
        title: "Error",
        description: "Failed to update KOL profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteProfile = async (id: string) => {
    try {
      const { error } = await supabase
        .from('kol_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProfiles(prev => prev.filter(profile => profile.id !== id));
      toast({
        title: "Success",
        description: "KOL profile deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting KOL profile:', error);
      toast({
        title: "Error",
        description: "Failed to delete KOL profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchProfiles();
      setLoading(false);
    };
    loadData();
  }, [organizationId]);

  useEffect(() => {
    if (profiles.length > 0) {
      fetchSocialAccounts();
    }
  }, [profiles]);

  return {
    profiles,
    socialAccounts,
    metrics: calculateMetrics(),
    loading,
    createProfile,
    updateProfile,
    deleteProfile,
    refetch: fetchProfiles
  };
};

export const useKOLSocialMedia = (kolProfileId: string) => {
  const [accounts, setAccounts] = useState<KOLSocialMediaAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAccounts = async () => {
    if (!kolProfileId) return;

    try {
      const { data, error } = await supabase
        .from('kol_social_media_accounts')
        .select('*')
        .eq('kol_profile_id', kolProfileId);

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching social media accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch social media accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (accountData: Omit<KOLSocialMediaAccount, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('kol_social_media_accounts')
        .insert([accountData])
        .select()
        .single();

      if (error) throw error;
      setAccounts(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error creating social media account:', error);
      toast({
        title: "Error",
        description: "Failed to create social media account",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [kolProfileId]);

  return {
    accounts,
    loading,
    createAccount,
    refetch: fetchAccounts
  };
};

export const useKOLRates = (kolProfileId: string) => {
  const [rates, setRates] = useState<KOLRate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRates = async () => {
    if (!kolProfileId) return;

    try {
      const { data, error } = await supabase
        .from('kol_rates')
        .select('*')
        .eq('kol_profile_id', kolProfileId);

      if (error) throw error;
      setRates(data || []);
    } catch (error) {
      console.error('Error fetching KOL rates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch KOL rates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createRate = async (rateData: Omit<KOLRate, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('kol_rates')
        .insert([rateData])
        .select()
        .single();

      if (error) throw error;
      setRates(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error creating KOL rate:', error);
      toast({
        title: "Error",
        description: "Failed to create KOL rate",
        variant: "destructive",
      });
      throw error;
    }
  };

  const findRate = (platform: string, contentType: string): KOLRate | undefined => {
    return rates.find(rate => 
      rate.platform.toLowerCase() === platform.toLowerCase() && 
      rate.content_type.toLowerCase() === contentType.toLowerCase()
    );
  };

  useEffect(() => {
    fetchRates();
  }, [kolProfileId]);

  return {
    rates,
    loading,
    createRate,
    findRate,
    refetch: fetchRates
  };
};
