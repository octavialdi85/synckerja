import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { useKOLPerformanceMetrics } from '@/hooks/organized/utils';
import { KOLContentPost } from '@/hooks/organized/utils';
import { Calculator, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/organized/utils';

interface UpdatePerformanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentPost: KOLContentPost | null;
}

export const UpdatePerformanceModal = ({ open, onOpenChange, contentPost }: UpdatePerformanceModalProps) => {
  const [metrics, setMetrics] = useState({
    views: contentPost?.performance?.views || 0,
    likes: contentPost?.performance?.likes || 0,
    comments: contentPost?.performance?.comments || 0,
    shares: contentPost?.performance?.shares || 0,
    saves: contentPost?.performance?.saves || 0,
    clicks: contentPost?.performance?.clicks || 0,
    reach: contentPost?.performance?.reach || 0,
    impressions: contentPost?.performance?.impressions || 0,
  });

  const { updatePerformanceMetrics, isUpdating } = useKOLPerformanceMetrics();
  const { toast } = useToast();

  // Auto-calculate engagement rate
  const calculateEngagementRate = () => {
    const totalEngagements = metrics.likes + metrics.comments + metrics.shares + (metrics.saves || 0);
    return metrics.impressions > 0 ? (totalEngagements / metrics.impressions * 100) : 0;
  };

  const handleMetricChange = (field: keyof typeof metrics, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setMetrics(prev => ({ ...prev, [field]: numValue }));
  };

  const handleUpdatePerformance = async () => {
    if (!contentPost) return;

    try {
      const engagementRate = calculateEngagementRate();
      
      await updatePerformanceMetrics({
        contentPostId: contentPost.id,
        metrics: {
          ...metrics,
          engagement_rate: engagementRate
        }
      });

      toast({
        title: "Success",
        description: "Performance metrics updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating performance:', error);
      toast({
        title: "Error",
        description: "Failed to update performance metrics",
        variant: "destructive",
      });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Update Performance Metrics
          </DialogTitle>
        </DialogHeader>
        
        {contentPost && (
          <div className="space-y-6">
            {/* Content Info */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">Content Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">KOL:</span>
                  <span className="ml-2 font-medium">{contentPost.kol_profile?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Campaign:</span>
                  <span className="ml-2 font-medium">{contentPost.campaign?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Platform:</span>
                  <span className="ml-2 font-medium capitalize">{contentPost.platform}</span>
                </div>
                <div>
                  <span className="text-slate-500">Content Type:</span>
                  <span className="ml-2 font-medium">{contentPost.content_type}</span>
                </div>
              </div>
            </div>

            {/* Performance Metrics Form */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="views">Views</Label>
                <Input
                  id="views"
                  type="number"
                  value={metrics.views || ''}
                  onChange={(e) => handleMetricChange('views', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="impressions">Impressions</Label>
                <Input
                  id="impressions"
                  type="number"
                  value={metrics.impressions || ''}
                  onChange={(e) => handleMetricChange('impressions', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reach">Reach</Label>
                <Input
                  id="reach"
                  type="number"
                  value={metrics.reach || ''}
                  onChange={(e) => handleMetricChange('reach', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="likes">Likes</Label>
                <Input
                  id="likes"
                  type="number"
                  value={metrics.likes || ''}
                  onChange={(e) => handleMetricChange('likes', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments</Label>
                <Input
                  id="comments"
                  type="number"
                  value={metrics.comments || ''}
                  onChange={(e) => handleMetricChange('comments', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shares">Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  value={metrics.shares || ''}
                  onChange={(e) => handleMetricChange('shares', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="saves">Saves</Label>
                <Input
                  id="saves"
                  type="number"
                  value={metrics.saves || ''}
                  onChange={(e) => handleMetricChange('saves', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clicks">Clicks</Label>
                <Input
                  id="clicks"
                  type="number"
                  value={metrics.clicks || ''}
                  onChange={(e) => handleMetricChange('clicks', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Auto-calculated Metrics */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">Calculated Metrics</h4>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-900">
                    {calculateEngagementRate().toFixed(2)}%
                  </p>
                  <p className="text-blue-600">Engagement Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-900">
                    {metrics.impressions > 0 ? ((metrics.reach / metrics.impressions) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-blue-600">Reach Ratio</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-900">
                    {metrics.impressions > 0 ? ((metrics.clicks / metrics.impressions) * 100).toFixed(2) : 0}%
                  </p>
                  <p className="text-blue-600">CTR</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdatePerformance}
                disabled={isUpdating}
                className="min-w-[120px]"
              >
                {isUpdating ? 'Updating...' : 'Update Performance'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
