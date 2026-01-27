
import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Progress } from '@/features/ui/progress';
import { useKOLProfiles } from '../hooks/useKOLProfiles';
import { useKOLSocialMedia, useKOLRates } from '@/hooks/useKOLProfiles';
import { useToast } from '@/hooks/organized/utils';
import { supabase } from '@/integrations/supabase/client';
import BasicInfoTab from './AddKOLModal/BasicInfoTab';
import SocialMediaTab from './AddKOLModal/SocialMediaTab';
import RatesTab from './AddKOLModal/RatesTab';
import PhotoPortfolioTab from './AddKOLModal/PhotoPortfolioTab';

interface EnhancedAddKOLModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EnhancedAddKOLModal = ({ open, onOpenChange }: EnhancedAddKOLModalProps) => {
  const { createProfile } = useKOLProfiles();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    category: '',
    location: '',
    age: '',
    gender: '',
    notes: '',
    status: 'active' as 'active' | 'inactive' | 'blacklisted',
    profile_photo_url: undefined as string | undefined,
    website: '',
    languages: '',
    specialties: '',
    niche: '',
    communication_method: ''
  });

  const [socialAccounts, setSocialAccounts] = useState([]);
  const [rates, setRates] = useState([]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      bio: '',
      category: '',
      location: '',
      age: '',
      gender: '',
      notes: '',
      status: 'active',
      profile_photo_url: undefined,
      website: '',
      languages: '',
      specialties: '',
      niche: '',
      communication_method: ''
    });
    setSocialAccounts([]);
    setRates([]);
    setActiveTab('basic');
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create KOL profile
      const profile = await createProfile({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        bio: formData.bio || undefined,
        category: formData.category || undefined,
        location: formData.location || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender || undefined,
        notes: formData.notes || undefined,
        status: formData.status,
        profile_photo_url: formData.profile_photo_url,
        website_url: formData.website || undefined,
        languages_spoken: formData.languages || undefined,
        niche: formData.niche || undefined,
        specialties: formData.specialties || undefined,
        preferred_communication: formData.communication_method || undefined,
      });

      if (!profile) {
        throw new Error('Failed to create KOL profile');
      }

      // Create social media accounts
      for (const account of socialAccounts) {
        await supabase
          .from('kol_social_media_accounts')
          .insert({
            kol_profile_id: profile.id,
            platform: account.platform,
            username: account.username,
            profile_url: account.profile_url || null,
            followers: account.followers || 0,
            engagement_rate: account.engagement_rate || 0,
            average_views: account.average_views || 0,
            is_verified: account.is_verified || false,
          });
      }

      // Create rates
      for (const rate of rates) {
        await supabase
          .from('kol_rates')
          .insert({
            kol_profile_id: profile.id,
            platform: rate.platform,
            content_type: rate.content_type,
            rate_amount: rate.rate_amount,
            currency: rate.currency,
            rate_type: rate.rate_type,
          });
      }
      
      resetForm();
      onOpenChange(false);
      
      // Invalidate queries to refresh the KOL list instantly
      queryClient.invalidateQueries({ queryKey: ['kol-management-data'] });
      queryClient.invalidateQueries({ queryKey: ['kol-profiles-with-social'] });
      
      toast({
        title: "Success",
        description: `KOL "${formData.name}" has been created successfully with ${socialAccounts.length} social media accounts and ${rates.length} rates`,
      });
    } catch (error) {
      console.error('Error creating KOL:', error);
      toast({
        title: "Error",
        description: "Failed to create KOL profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProgress = () => {
    let completed = 0;
    const total = 4;
    
    if (formData.name) completed++;
    if (socialAccounts.length > 0) completed++;
    if (rates.length > 0) completed++;
    if (formData.profile_photo_url) completed++;
    
    return (completed / total) * 100;
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', required: true },
    { id: 'social', label: 'Social Media', required: false },
    { id: 'rates', label: 'Rates', required: false },
    { id: 'photo', label: 'Photo & Portfolio', required: false }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full min-h-0">
          {/* Sticky Header */}
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4 pt-6 px-6 border-b flex-shrink-0">
            <DialogTitle>Add New KOL</DialogTitle>
            <DialogDescription>
              Create a comprehensive KOL profile with social media accounts and rates.
            </DialogDescription>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Profile Completion</span>
                <span>{Math.round(getProgress())}%</span>
              </div>
              <Progress value={getProgress()} className="h-2" />
            </div>
            
            {/* Tabs Navigation - Sticky */}
            <div className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="text-xs"
                  >
                    {tab.label}
                    {tab.required && <span className="text-red-500 ml-1">*</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll">
            <div className="px-6 pt-4 pb-4 w-full">
              <TabsContent value="basic" className="mt-0 w-full">
                <BasicInfoTab formData={formData} setFormData={setFormData} />
              </TabsContent>

              <TabsContent value="social" className="mt-0 w-full">
                <SocialMediaTab 
                  socialAccounts={socialAccounts} 
                  setSocialAccounts={setSocialAccounts} 
                />
              </TabsContent>

              <TabsContent value="rates" className="mt-0 w-full">
                <RatesTab rates={rates} setRates={setRates} />
              </TabsContent>

              <TabsContent value="photo" className="mt-0 w-full">
                <PhotoPortfolioTab formData={formData} setFormData={setFormData} />
              </TabsContent>
            </div>
          </div>

          {/* Sticky Footer */}
          <DialogFooter className="sticky bottom-0 bg-background z-10 py-3 px-6 border-t flex-shrink-0">
            <div className="flex justify-between w-full">
              <div className="flex gap-2">
                {activeTab !== 'basic' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
                      if (currentIndex > 0) {
                        setActiveTab(tabs[currentIndex - 1].id);
                      }
                    }}
                  >
                    Previous
                  </Button>
                )}
                
                {activeTab !== 'photo' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
                      if (currentIndex < tabs.length - 1) {
                        setActiveTab(tabs[currentIndex + 1].id);
                      }
                    }}
                  >
                    Next
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading || !formData.name}>
                  {loading ? 'Creating...' : 'Create KOL'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedAddKOLModal;
