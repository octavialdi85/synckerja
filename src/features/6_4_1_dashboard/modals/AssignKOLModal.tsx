
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Badge } from '@/features/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/avatar';
import { Checkbox } from '@/features/ui/checkbox';
import { ScrollArea } from '@/features/ui/scroll-area';
import { Search, Users, CheckCircle, Settings } from 'lucide-react';
import { useKOLProfiles } from '../hooks/useKOLProfiles';
import { useOptimizedKOLOperations } from '../../6_4_2_kol-management/hooks/useOptimizedKOLOperations';
import { KOLCampaign } from '@/hooks/useKOLCampaigns';
import DeliverableModal from './DeliverableModal';

interface AssignKOLModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: KOLCampaign;
}

const AssignKOLModal: React.FC<AssignKOLModalProps> = ({
  open,
  onOpenChange,
  campaign
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKOLs, setSelectedKOLs] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [deliverableModalOpen, setDeliverableModalOpen] = useState(false);
  const [selectedKOLForDeliverable, setSelectedKOLForDeliverable] = useState<any>(null);

  const { profiles: kolProfiles, loading: kolLoading } = useKOLProfiles();
  const { assignKOLToCampaign, campaigns } = useOptimizedKOLOperations();

  // Get already assigned KOLs for this campaign - Fixed property access
  const assignedKOLIds = useMemo(() => {
    if (!campaigns || !Array.isArray(campaigns)) return [];
    const currentCampaign = campaigns.find(c => c.id === campaign.id);
    return currentCampaign?.kol_campaign_assignments?.map(assignment => assignment.kol_profile_id) || [];
  }, [campaigns, campaign.id]);

  // Filter and search KOLs
  const filteredKOLs = useMemo(() => {
    return kolProfiles.filter(kol => {
      const matchesSearch = kol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (kol.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      const isActive = kol.status === 'active';
      return matchesSearch && isActive;
    });
  }, [kolProfiles, searchTerm]);

  const handleKOLToggle = (kolId: string) => {
    setSelectedKOLs(prev => 
      prev.includes(kolId) 
        ? prev.filter(id => id !== kolId)
        : [...prev, kolId]
    );
  };

  const handleSelectAll = () => {
    const availableKOLs = filteredKOLs
      .filter(kol => !assignedKOLIds.includes(kol.id))
      .map(kol => kol.id);
    
    setSelectedKOLs(prev => 
      prev.length === availableKOLs.length ? [] : availableKOLs
    );
  };

  const handleAssign = async () => {
    if (selectedKOLs.length === 0) return;

    setIsAssigning(true);
    try {
      for (const kolId of selectedKOLs) {
        await assignKOLToCampaign.mutateAsync({
          campaignId: campaign.id,
          kolProfileId: kolId
        });
      }
      setSelectedKOLs([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning KOLs:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssignedKOLClick = (kol: any) => {
    setSelectedKOLForDeliverable(kol);
    setDeliverableModalOpen(true);
  };

  const handleDeliverableSet = () => {
    // Refresh the campaigns data or handle any post-deliverable logic
    console.log('Deliverable set successfully');
  };

  const availableKOLs = filteredKOLs.filter(kol => !assignedKOLIds.includes(kol.id));
  const assignedKOLs = filteredKOLs.filter(kol => assignedKOLIds.includes(kol.id));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Assign KOLs to Campaign
            </DialogTitle>
            <p className="text-sm text-muted-foreground truncate">
              {campaign.name}
            </p>
          </DialogHeader>

          <div className="flex-1 min-h-0 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search KOLs by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{availableKOLs.length} available</span>
              <span>{assignedKOLs.length} already assigned</span>
              <span>{selectedKOLs.length} selected</span>
            </div>

            {/* Select All */}
            {availableKOLs.length > 0 && (
              <div className="flex items-center space-x-2 py-2 border-b">
                <Checkbox
                  id="select-all"
                  checked={selectedKOLs.length === availableKOLs.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Select All Available ({availableKOLs.length})
                </label>
              </div>
            )}

            {/* KOL List */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2">
                {kolLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading KOLs...
                  </div>
                ) : filteredKOLs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No KOLs found
                  </div>
                ) : (
                  <>
                    {/* Available KOLs */}
                    {availableKOLs.map((kol) => (
                      <div
                        key={kol.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedKOLs.includes(kol.id)}
                          onCheckedChange={() => handleKOLToggle(kol.id)}
                        />
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={kol.profile_photo_url} />
                          <AvatarFallback>
                            {kol.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{kol.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {kol.email}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {kol.category || 'General'}
                            </Badge>
                            {kol.followers_count && (
                              <Badge variant="outline" className="text-xs">
                                {kol.followers_count.toLocaleString()} followers
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Already Assigned KOLs */}
                    {assignedKOLs.length > 0 && (
                      <>
                        <div className="py-2 border-t">
                          <p className="text-sm font-medium text-muted-foreground">
                            Already Assigned (Click to set deliverables)
                          </p>
                        </div>
                        {assignedKOLs.map((kol) => (
                          <div
                            key={kol.id}
                            className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/30 opacity-75 hover:opacity-100 hover:bg-muted/50 cursor-pointer transition-all"
                            onClick={() => handleAssignedKOLClick(kol)}
                          >
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <Settings className="w-4 h-4 text-purple-600" />
                            </div>
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={kol.profile_photo_url} />
                              <AvatarFallback>
                                {kol.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{kol.name}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {kol.email}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  Assigned
                                </Badge>
                                <Badge variant="outline" className="text-xs text-purple-600">
                                  Click to set deliverable
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={selectedKOLs.length === 0 || isAssigning}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isAssigning ? 'Assigning...' : `Assign ${selectedKOLs.length} KOL${selectedKOLs.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliverable Modal */}
      {selectedKOLForDeliverable && (
        <DeliverableModal
          open={deliverableModalOpen}
          onOpenChange={setDeliverableModalOpen}
          campaignId={campaign.id}
          kolProfile={selectedKOLForDeliverable}
          onDeliverableSet={handleDeliverableSet}
        />
      )}
    </>
  );
};

export default AssignKOLModal;
