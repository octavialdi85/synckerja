
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Edit, Save, X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/organized/utils';

interface KOLDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kolId: string | null;
}

interface KOLProfile {
  id: string;
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
  total_posts?: number;
}

interface SocialMediaAccount {
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

interface KOLRate {
  id: string;
  kol_profile_id: string;
  platform: string;
  content_type: string;
  rate_amount: number;
  currency: string;
  rate_type: string;
}

const KOLDetailModal = ({ open, onOpenChange, kolId }: KOLDetailModalProps) => {
  const [kolProfile, setKolProfile] = useState<KOLProfile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialMediaAccount[]>([]);
  const [rates, setRates] = useState<KOLRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && kolId) {
      fetchAllData();
    }
  }, [open, kolId]);

  const fetchAllData = async () => {
    if (!kolId) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchKOLProfile(),
        fetchSocialAccounts(),
        fetchRates()
      ]);
    } catch (error) {
      console.error('Error fetching KOL data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKOLProfile = async () => {
    if (!kolId) return;
    
    const { data, error } = await supabase
      .from('kol_profiles')
      .select('*')
      .eq('id', kolId)
      .single();

    if (error) throw error;
    
    const typedProfile: KOLProfile = {
      ...data,
      status: data.status as 'active' | 'inactive' | 'blacklisted'
    };
    
    setKolProfile(typedProfile);
  };

  const fetchSocialAccounts = async () => {
    if (!kolId) return;

    const { data, error } = await supabase
      .from('kol_social_media_accounts')
      .select('*')
      .eq('kol_profile_id', kolId);

    if (error) throw error;
    setSocialAccounts(data || []);
  };

  const fetchRates = async () => {
    if (!kolId) return;

    const { data, error } = await supabase
      .from('kol_rates')
      .select('*')
      .eq('kol_profile_id', kolId);

    if (error) throw error;
    setRates(data || []);
  };

  const handleSaveProfile = async () => {
    if (!kolProfile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('kol_profiles')
        .update({
          name: kolProfile.name,
          email: kolProfile.email,
          phone: kolProfile.phone,
          bio: kolProfile.bio,
          category: kolProfile.category,
          status: kolProfile.status,
          location: kolProfile.location,
          age: kolProfile.age,
          gender: kolProfile.gender,
          notes: kolProfile.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', kolProfile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "KOL profile updated successfully",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating KOL profile:', error);
      toast({
        title: "Error",
        description: "Failed to update KOL profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSocialAccount = async () => {
    if (!kolId) return;

    const newAccount: Omit<SocialMediaAccount, 'id'> = {
      kol_profile_id: kolId,
      platform: '',
      username: '',
      profile_url: '',
      followers: 0,
      engagement_rate: 0,
      average_views: 0,
      is_verified: false
    };

    const { data, error } = await supabase
      .from('kol_social_media_accounts')
      .insert([newAccount])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add social media account",
        variant: "destructive",
      });
      return;
    }

    setSocialAccounts(prev => [...prev, data]);
  };

  const handleUpdateSocialAccount = async (accountId: string, updates: Partial<SocialMediaAccount>) => {
    const { error } = await supabase
      .from('kol_social_media_accounts')
      .update(updates)
      .eq('id', accountId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update social media account",
        variant: "destructive",
      });
      return;
    }

    setSocialAccounts(prev => 
      prev.map(account => 
        account.id === accountId ? { ...account, ...updates } : account
      )
    );
  };

  const handleDeleteSocialAccount = async (accountId: string) => {
    const { error } = await supabase
      .from('kol_social_media_accounts')
      .delete()
      .eq('id', accountId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete social media account",
        variant: "destructive",
      });
      return;
    }

    setSocialAccounts(prev => prev.filter(account => account.id !== accountId));
  };

  const handleAddRate = async () => {
    if (!kolId) return;

    const newRate: Omit<KOLRate, 'id'> = {
      kol_profile_id: kolId,
      platform: '',
      content_type: '',
      rate_amount: 0,
      currency: 'IDR',
      rate_type: 'per_post'
    };

    const { data, error } = await supabase
      .from('kol_rates')
      .insert([newRate])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add rate",
        variant: "destructive",
      });
      return;
    }

    setRates(prev => [...prev, data]);
  };

  const handleUpdateRate = async (rateId: string, updates: Partial<KOLRate>) => {
    const { error } = await supabase
      .from('kol_rates')
      .update(updates)
      .eq('id', rateId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update rate",
        variant: "destructive",
      });
      return;
    }

    setRates(prev => 
      prev.map(rate => 
        rate.id === rateId ? { ...rate, ...updates } : rate
      )
    );
  };

  const handleDeleteRate = async (rateId: string) => {
    const { error } = await supabase
      .from('kol_rates')
      .delete()
      .eq('id', rateId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete rate",
        variant: "destructive",
      });
      return;
    }

    setRates(prev => prev.filter(rate => rate.id !== rateId));
  };

  if (loading || !kolProfile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-500">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>KOL Profile Details</DialogTitle>
          <Button 
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
            size="sm"
          >
            {isEditing ? <X className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="rates">Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={kolProfile.profile_photo_url} />
                    <AvatarFallback className="text-lg">
                      {kolProfile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{kolProfile.name}</h3>
                    <Badge variant={kolProfile.status === 'active' ? 'default' : 'secondary'}>
                      {kolProfile.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    {isEditing ? (
                      <Input
                        value={kolProfile.name}
                        onChange={(e) => setKolProfile({...kolProfile, name: e.target.value})}
                      />
                    ) : (
                      <p className="mt-1">{kolProfile.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Email</label>
                    {isEditing ? (
                      <Input
                        value={kolProfile.email || ''}
                        onChange={(e) => setKolProfile({...kolProfile, email: e.target.value})}
                        type="email"
                      />
                    ) : (
                      <p className="mt-1">{kolProfile.email || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    {isEditing ? (
                      <Input
                        value={kolProfile.phone || ''}
                        onChange={(e) => setKolProfile({...kolProfile, phone: e.target.value})}
                      />
                    ) : (
                      <p className="mt-1">{kolProfile.phone || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Category</label>
                    {isEditing ? (
                      <Input
                        value={kolProfile.category || ''}
                        onChange={(e) => setKolProfile({...kolProfile, category: e.target.value})}
                      />
                    ) : (
                      <p className="mt-1">{kolProfile.category || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Location</label>
                    {isEditing ? (
                      <Input
                        value={kolProfile.location || ''}
                        onChange={(e) => setKolProfile({...kolProfile, location: e.target.value})}
                      />
                    ) : (
                      <p className="mt-1">{kolProfile.location || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Status</label>
                    {isEditing ? (
                      <Select 
                        value={kolProfile.status} 
                        onValueChange={(value: 'active' | 'inactive' | 'blacklisted') => 
                          setKolProfile({...kolProfile, status: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="blacklisted">Blacklisted</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="mt-1 capitalize">{kolProfile.status}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Age</label>
                    {isEditing ? (
                      <Input
                        value={kolProfile.age || ''}
                        onChange={(e) => setKolProfile({...kolProfile, age: parseInt(e.target.value) || undefined})}
                        type="number"
                      />
                    ) : (
                      <p className="mt-1">{kolProfile.age || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Gender</label>
                    {isEditing ? (
                      <Select 
                        value={kolProfile.gender || ''} 
                        onValueChange={(value) => setKolProfile({...kolProfile, gender: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="mt-1 capitalize">{kolProfile.gender || '-'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Bio</label>
                  {isEditing ? (
                    <Textarea
                      value={kolProfile.bio || ''}
                      onChange={(e) => setKolProfile({...kolProfile, bio: e.target.value})}
                      rows={3}
                    />
                  ) : (
                    <p className="mt-1">{kolProfile.bio || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  {isEditing ? (
                    <Textarea
                      value={kolProfile.notes || ''}
                      onChange={(e) => setKolProfile({...kolProfile, notes: e.target.value})}
                      rows={3}
                    />
                  ) : (
                    <p className="mt-1">{kolProfile.notes || '-'}</p>
                  )}
                </div>

                {isEditing && (
                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Social Media Accounts</CardTitle>
                <Button onClick={handleAddSocialAccount} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {socialAccounts.map((account) => (
                    <Card key={account.id} className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Platform</label>
                          <Input
                            value={account.platform}
                            onChange={(e) => handleUpdateSocialAccount(account.id, { platform: e.target.value })}
                            placeholder="Instagram, TikTok, etc."
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Username</label>
                          <Input
                            value={account.username}
                            onChange={(e) => handleUpdateSocialAccount(account.id, { username: e.target.value })}
                            placeholder="@username"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Profile URL</label>
                          <Input
                            value={account.profile_url || ''}
                            onChange={(e) => handleUpdateSocialAccount(account.id, { profile_url: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Followers</label>
                          <Input
                            type="number"
                            value={account.followers}
                            onChange={(e) => handleUpdateSocialAccount(account.id, { followers: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Engagement Rate (%)</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={account.engagement_rate}
                            onChange={(e) => handleUpdateSocialAccount(account.id, { engagement_rate: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Average Views</label>
                          <Input
                            type="number"
                            value={account.average_views}
                            onChange={(e) => handleUpdateSocialAccount(account.id, { average_views: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={account.is_verified}
                            onChange={(e) => handleUpdateSocialAccount(account.id, { is_verified: e.target.checked })}
                          />
                          <span className="text-sm">Verified Account</span>
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSocialAccount(account.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {socialAccounts.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No social media accounts added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rates" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Rate Information</CardTitle>
                <Button onClick={handleAddRate} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rate
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rates.map((rate) => (
                    <Card key={rate.id} className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Platform</label>
                          <Input
                            value={rate.platform}
                            onChange={(e) => handleUpdateRate(rate.id, { platform: e.target.value })}
                            placeholder="Instagram, TikTok, etc."
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Content Type</label>
                          <Input
                            value={rate.content_type}
                            onChange={(e) => handleUpdateRate(rate.id, { content_type: e.target.value })}
                            placeholder="Post, Story, Reel, etc."
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Rate Amount</label>
                          <Input
                            type="number"
                            value={rate.rate_amount}
                            onChange={(e) => handleUpdateRate(rate.id, { rate_amount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Currency</label>
                          <Select 
                            value={rate.currency} 
                            onValueChange={(value) => handleUpdateRate(rate.id, { currency: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IDR">IDR</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Rate Type</label>
                          <Select 
                            value={rate.rate_type} 
                            onValueChange={(value) => handleUpdateRate(rate.id, { rate_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per_post">Per Post</SelectItem>
                              <SelectItem value="per_story">Per Story</SelectItem>
                              <SelectItem value="per_campaign">Per Campaign</SelectItem>
                              <SelectItem value="per_month">Per Month</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRate(rate.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {rates.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No rates added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default KOLDetailModal;
