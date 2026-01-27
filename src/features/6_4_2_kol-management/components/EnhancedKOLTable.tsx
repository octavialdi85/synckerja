import { useState } from 'react';
import { Eye, DollarSign, Trash2, Star, MapPin, Calendar, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import KOLDetailModal from './KOLDetailModal';
import { KOLRatingsModal } from './KOLRatingsModal';

interface KOLProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  category?: string;
  status: 'active' | 'inactive' | 'blacklisted';
  location?: string;
  profile_photo_url?: string;
  created_at: string;
  total_posts?: number;
  age?: number;
  gender?: string;
}

interface SocialMediaAccount {
  id: string;
  kol_profile_id: string;
  platform: string;
  followers: number;
  engagement_rate: number;
}

interface EnhancedKOLTableProps {
  profiles: KOLProfile[];
  socialAccounts: SocialMediaAccount[];
  onEdit: (profile: KOLProfile) => void;
  onDelete: (id: string) => void;
}

const EnhancedKOLTable = ({ profiles, socialAccounts, onEdit, onDelete }: EnhancedKOLTableProps) => {
  const [selectedKOLId, setSelectedKOLId] = useState<string | null>(null);
  const [selectedKOLName, setSelectedKOLName] = useState<string>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRatingsModalOpen, setIsRatingsModalOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'blacklisted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getKOLStats = (kolId: string) => {
    const accounts = socialAccounts.filter(acc => acc.kol_profile_id === kolId);
    const totalFollowers = accounts.reduce((sum, acc) => sum + acc.followers, 0);
    const avgEngagement = accounts.length > 0 
      ? accounts.reduce((sum, acc) => sum + acc.engagement_rate, 0) / accounts.length 
      : 0;
    
    return { totalFollowers, avgEngagement, platformCount: accounts.length };
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const handleViewDetails = (kolId: string) => {
    setSelectedKOLId(kolId);
    setIsDetailModalOpen(true);
  };

  const handleViewRatings = (kolId: string, kolName: string) => {
    setSelectedKOLId(kolId);
    setSelectedKOLName(kolName);
    setIsRatingsModalOpen(true);
  };

  const getRateRange = (kolId: string) => {
    // This would need to be calculated from actual rates data
    return "IDR 500K - 2M per post";
  };

  const getPerformanceScore = (kolId: string) => {
    // This would be calculated from actual performance data
    return Math.floor(Math.random() * 50) + 50; // Mock score between 50-100
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>KOL</TableHead>
              <TableHead>CONTACT</TableHead>
              <TableHead>CATEGORY</TableHead>
              <TableHead>SOCIAL STATS</TableHead>
              <TableHead>RATE RANGE</TableHead>
              <TableHead>PERFORMANCE</TableHead>
              <TableHead>CAMPAIGNS</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => {
              const stats = getKOLStats(profile.id);
              const performanceScore = getPerformanceScore(profile.id);
              
              return (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile.profile_photo_url} />
                        <AvatarFallback>
                          {profile.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{profile.name}</div>
                        <div className="text-sm text-gray-500">
                          {profile.age ? `${profile.age} tahun` : ''} {profile.gender || 'Female'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm">
                      <div>{profile.email || 'oktavialdidhanta@gmail.com'}</div>
                      <div className="text-gray-500">{profile.phone || '081281714855'}</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm font-medium">
                      {profile.category || 'Fashion'}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{formatNumber(stats.totalFollowers)} followers</div>
                      <div className="text-gray-500">
                        {stats.avgEngagement.toFixed(1)}% engagement
                      </div>
                      <div className="text-gray-500">
                        {socialAccounts
                          .filter(acc => acc.kol_profile_id === profile.id)
                          .map(acc => acc.platform)
                          .slice(0, 1)
                          .join(', ') || 'Instagram'}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{getRateRange(profile.id)}</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-red-500 fill-current" />
                      <span className="font-medium">{performanceScore}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-center">
                      <div className="font-medium text-lg">1</div>
                      <div className="text-xs text-gray-500">active</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={getStatusColor(profile.status)}>
                      {profile.status}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(profile.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Lihat Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewRatings(profile.id, profile.name)}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Ratings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(profile.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <KOLDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        kolId={selectedKOLId}
      />

      <KOLRatingsModal
        isOpen={isRatingsModalOpen}
        onClose={() => setIsRatingsModalOpen(false)}
        kolId={selectedKOLId || ''}
        kolName={selectedKOLName}
      />
    </>
  );
};

export default EnhancedKOLTable;
