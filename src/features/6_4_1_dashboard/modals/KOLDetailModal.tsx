import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/avatar';
import { Badge } from '@/features/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { KOLProfileWithStats } from '@/hooks/useKOLManagementData';
import { Eye, Users, Star, Target, DollarSign } from 'lucide-react';

interface KOLDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  kol: KOLProfileWithStats | null;
}

const KOLDetailModal: React.FC<KOLDetailModalProps> = ({ isOpen, onClose, kol }) => {
  if (!kol) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={kol.profile_photo} alt={kol.name} />
              <AvatarFallback>{kol.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{kol.name}</h2>
              <p className="text-sm text-gray-600">@{kol.username}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-sm">{kol.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-sm">{kol.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Location</label>
                  <p className="text-sm">{kol.location || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Category</label>
                  <Badge variant="secondary">{kol.category}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media Platforms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Social Media Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(kol.social_media_links || {}).map(([platform, link]) => (
                  <div key={platform} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium capitalize">{platform}</span>
                    <a 
                      href={link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Profile
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Eye className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold">{kol.total_followers?.toLocaleString() || '0'}</p>
                  <p className="text-sm text-gray-600">Total Followers</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold">{kol.total_posts || '0'}</p>
                  <p className="text-sm text-gray-600">Total Posts</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Star className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <p className="text-2xl font-bold">{kol.avg_engagement_rate?.toFixed(1) || '0'}%</p>
                  <p className="text-sm text-gray-600">Avg Engagement</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-2xl font-bold">${kol.rate_per_post || '0'}</p>
                  <p className="text-sm text-gray-600">Rate per Post</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bio */}
          {kol.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{kol.bio}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KOLDetailModal;
