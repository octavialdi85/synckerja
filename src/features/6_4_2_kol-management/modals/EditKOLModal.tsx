import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useOptimizedKOLOperations } from '../hooks/useOptimizedKOLOperations';
import { toast } from '@/hooks/organized/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus } from 'lucide-react';

interface EditKOLModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kolId: string | null;
}

interface SocialAccount {
  id?: string;
  platform: string;
  username: string;
  followers: number;
  engagement_rate: number;
}

export const EditKOLModal = ({ open, onOpenChange, kolId }: EditKOLModalProps) => {
  const { profiles, socialAccounts, updateKOLProfile, updateSocialAccount, createSocialAccount, deleteSocialAccount } = useOptimizedKOLOperations();
  const [isLoading, setIsLoading] = useState(false);
  
  // KOL Profile state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    category: '',
    bio: '',
    status: '',
    rate_range: ''
  });

  // Social accounts state
  const [socialData, setSocialData] = useState<SocialAccount[]>([]);

  // Get current KOL data
  const currentKOL = profiles.find(p => p.id === kolId);
  const currentSocialAccounts = socialAccounts.filter(acc => acc.kol_profile_id === kolId);

  // Initialize form data when modal opens
  useEffect(() => {
    if (open && currentKOL) {
      setFormData({
        name: currentKOL.name || '',
        email: currentKOL.email || '',
        phone: currentKOL.phone || '',
        age: currentKOL.age?.toString() || '',
        gender: currentKOL.gender || '',
        category: currentKOL.category || '',
        bio: currentKOL.bio || '',
        status: currentKOL.status || 'active',
        rate_range: ''
      });

      setSocialData(currentSocialAccounts.map(acc => ({
        id: acc.id,
        platform: acc.platform,
        username: acc.username,
        followers: acc.followers,
        engagement_rate: acc.engagement_rate
      })));
    }
  }, [open, currentKOL, currentSocialAccounts]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialAccountChange = (index: number, field: string, value: string | number) => {
    setSocialData(prev => prev.map((account, i) => 
      i === index ? { ...account, [field]: value } : account
    ));
  };

  const addSocialAccount = () => {
    setSocialData(prev => [...prev, {
      platform: 'Instagram',
      username: '',
      followers: 0,
      engagement_rate: 0
    }]);
  };

  const removeSocialAccount = async (index: number) => {
    const account = socialData[index];
    
    // If account has ID, delete from database
    if (account.id) {
      try {
        await deleteSocialAccount(account.id);
        toast({
          title: "Success",
          description: "Social account deleted successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete social account",
          variant: "destructive",
        });
        return;
      }
    }

    // Remove from local state
    setSocialData(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kolId) return;

    setIsLoading(true);
    
    try {
      // Update KOL profile
      await updateKOLProfile(kolId, {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null
      });

      // Update social accounts
      for (const account of socialData) {
        if (account.id) {
          // Update existing account
          await updateSocialAccount(account.id, {
            platform: account.platform,
            username: account.username,
            followers: account.followers,
            engagement_rate: account.engagement_rate
          });
        } else {
          // Create new account
          await createSocialAccount({
            kol_profile_id: kolId,
            platform: account.platform,
            username: account.username,
            followers: account.followers,
            engagement_rate: account.engagement_rate
          });
        }
      }

      toast({
        title: "Success",
        description: "KOL profile updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating KOL:', error);
      toast({
        title: "Error",
        description: "Failed to update KOL profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentKOL) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit KOL Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fashion">Fashion</SelectItem>
                    <SelectItem value="Beauty">Beauty</SelectItem>
                    <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="Tech">Tech</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Travel">Travel</SelectItem>
                    <SelectItem value="Gaming">Gaming</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="blacklisted">Blacklisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rate_range">Rate Range</Label>
                <Input
                  id="rate_range"
                  value={formData.rate_range}
                  onChange={(e) => handleInputChange('rate_range', e.target.value)}
                  placeholder="e.g., IDR 500K - 2M per post"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Media Accounts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Social Media Accounts</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSocialAccount}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {socialData.map((account, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label>Platform</Label>
                    <Select 
                      value={account.platform} 
                      onValueChange={(value) => handleSocialAccountChange(index, 'platform', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Instagram">Instagram</SelectItem>
                        <SelectItem value="TikTok">TikTok</SelectItem>
                        <SelectItem value="YouTube">YouTube</SelectItem>
                        <SelectItem value="Twitter">Twitter</SelectItem>
                        <SelectItem value="Facebook">Facebook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Username</Label>
                    <Input
                      value={account.username}
                      onChange={(e) => handleSocialAccountChange(index, 'username', e.target.value)}
                      placeholder="@username"
                    />
                  </div>

                  <div>
                    <Label>Followers</Label>
                    <Input
                      type="number"
                      value={account.followers}
                      onChange={(e) => handleSocialAccountChange(index, 'followers', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label>Engagement Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={account.engagement_rate}
                      onChange={(e) => handleSocialAccountChange(index, 'engagement_rate', parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSocialAccount(index)}
                      className="w-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {socialData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No social media accounts added. Click "Add Account" to get started.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update KOL Profile'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};