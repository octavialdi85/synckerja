import { memo, useState, useMemo, useCallback } from 'react';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { LoadingDots } from '@/components/LoadingDots';
import { FileText } from 'lucide-react';
import { useKOLContentPosts } from '@/hooks/organized/utils';
import { useContentPostMilestones } from '@/hooks/organized/social-media';
import { usePaymentMilestones } from '@/hooks/organized/utils';
import { useKOLConversions } from '@/hooks/organized/utils';
import { useContentPostPerformanceData } from '@/hooks/organized/social-media';
import { Eye, Edit, Trash2, Instagram, Youtube, Twitter, Facebook, MoreHorizontal, TrendingUp, Bookmark, Target, CreditCard } from 'lucide-react';
import { Progress } from '@/features/ui/progress';
import { PostDateCell } from '@/components/1_halaman/6_2_1_dashboard/table/cells/PostDateCell';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { EditContentPostModal } from '../modals/EditContentPostModal';
import { UpdatePerformanceModal } from '../modals/UpdatePerformanceModal';
import { ConversionTrackingModal } from '../modals/ConversionTrackingModal';
import { UpdatePaymentModal } from '../modals/UpdatePaymentModal';
import { PaymentMilestoneCell } from './content-post/PaymentMilestoneCell';
import { RemainingPaymentCell } from './content-post/RemainingPaymentCell';
import { RatesCell } from './content-post/RatesCell';
import { KOLContentPostTableFooter } from '../section/KOLContentPostTableFooter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/features/ui/alert-dialog';
import './KOLContentPostTable.css';

interface KOLContentPostTableProps {
  contentPosts?: any[];
  isLoading?: boolean;
  selectedStatus?: string;
}

export const KOLContentPostTable = memo(({
  contentPosts: propContentPosts,
  isLoading: propIsLoading,
  selectedStatus
}: KOLContentPostTableProps = {}) => {
  const { contentPosts: hookContentPosts, deleteContentPost, updateContentPost, isDeleting, isLoading: hookIsLoading } = useKOLContentPosts();
  
  // Ensure contentPosts is always an array
  const contentPosts = propContentPosts || hookContentPosts;
  const safeContentPosts = Array.isArray(contentPosts) ? contentPosts : [];
  const isLoading = propIsLoading !== undefined ? propIsLoading : hookIsLoading;
  
  const { milestonesByPost, getMilestonesForPost } = useContentPostMilestones(
    safeContentPosts.map(post => post.id)
  );
  const { updateMilestoneStatus } = usePaymentMilestones();
  const { data: conversions = [] } = useKOLConversions();
  const { getPerformanceData } = useContentPostPerformanceData();
  const [selectedPost, setSelectedPost] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [performanceModalOpen, setPerformanceModalOpen] = useState(false);
  const [conversionModalOpen, setConversionModalOpen] = useState(false);
  const [updatePaymentModalOpen, setUpdatePaymentModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const getPlatformIcon = useCallback((platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-500" />;
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-500" />;
      case 'twitter':
        return <Twitter className="h-4 w-4 text-blue-500" />;
      default:
        return <Facebook className="h-4 w-4 text-blue-600" />;
    }
  }, []);

  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  }, []);

  const getPostConversions = useCallback((postId: string) => {
    const postConversions = conversions.filter(conv => conv.content_post_id === postId);
    const totalConversions = postConversions.length;
    const totalValue = postConversions.reduce((sum, conv) => sum + (conv.conversion_value || 0), 0);
    return { totalConversions, totalValue };
  }, [conversions]);

  const handleView = (post: any) => {
    setSelectedPost(post);
    setViewModalOpen(true);
  };

  const handleEdit = (post: any) => {
    setSelectedPost(post);
    setEditModalOpen(true);
  };

  const handleUpdatePerformance = (post: any) => {
    setSelectedPost(post);
    setPerformanceModalOpen(true);
  };

  const handleRecordConversion = (post: any) => {
    setSelectedPost(post);
    setConversionModalOpen(true);
  };

  const handleUpdatePayment = (post: any) => {
    setSelectedPost(post);
    setUpdatePaymentModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setPostToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (postToDelete) {
      deleteContentPost(postToDelete);
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    }
  };

  const handleDateChange = (postId: string, newDate: string) => {
    updateContentPost({
      id: postId,
      post_date: newDate
    });
  };

  const tableHeaders = useMemo(() => [
    { key: 'kol', label: 'KOL & Campaign', width: 'w-64' },
    { key: 'content', label: 'Content Info', width: 'w-64' },
    { key: 'milestone', label: 'Payment Milestone', width: 'w-48' },
    { key: 'remaining', label: 'Remaining Payment', width: 'w-40' },
    { key: 'performance', label: 'Performance', width: 'w-48' },
    { key: 'target', label: 'Target KOL', width: 'w-80' },
    { key: 'actions', label: 'Actions', width: 'w-20' },
  ], []);

  const postedPosts = useMemo(() => 
    safeContentPosts.filter(post => post.status === 'posted').length, 
    [safeContentPosts]
  );

  return (
    <>
      <div className="h-full flex flex-col">
        {/* rule 3.1: satu scroll container untuk tabel, nested-scroll-touch-chain */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain">
          <table className="w-full caption-bottom text-sm kol-content-post-table">
            <TableHeader className="bg-gray-50 sticky top-0 z-20 shadow-sm">
              <TableRow className="hover:bg-transparent">
                {tableHeaders.map((header) => (
                  <TableHead 
                    key={header.key} 
                    className={`text-xs font-medium text-gray-700 ${header.width} px-3 bg-gray-50 whitespace-nowrap`}
                  >
                    {header.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <LoadingDots size="lg" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : safeContentPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500 text-sm">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="h-12 w-12 text-gray-300" />
                      <div>No content posts found</div>
                      <div className="text-xs text-gray-400">Try adjusting your filters or create your first content post</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                safeContentPosts.map((post) => {
                  const performanceData = getPerformanceData(post.id);
                  return (
                    <TableRow key={post.id} className="hover:bg-gray-50">
                      <TableCell className="w-64 px-3">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0">
                              {post.kol_profile?.profile_photo_url ? (
                                <img 
                                  src={`https://najgdwffjhnqlogfrlqa.supabase.co/storage/v1/object/public/kol-profile-photos/${post.kol_profile.profile_photo_url}`}
                                  alt={post.kol_profile.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <span className={`text-sm font-semibold text-blue-700 ${post.kol_profile?.profile_photo_url ? 'hidden' : ''}`}>
                                {post.kol_profile?.name?.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-slate-900 truncate">{post.kol_profile?.name}</h4>
                              <p className="text-xs text-slate-600 truncate">{post.campaign?.name}</p>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 rounded-lg p-2">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-xs font-medium text-slate-700">{post.title || post.content_type || 'No title'}</div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {getPlatformIcon(post.platform)}
                              <span className="text-xs text-slate-600 capitalize">{post.platform}</span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs font-medium text-slate-700 capitalize">{post.status}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-64 px-3">
                      <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-blue-800">
                              {post.content_type?.charAt(0).toUpperCase() + post.content_type?.slice(1).toLowerCase() || 'Post'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-slate-900 leading-tight">{post.title || post.content_type || 'No title'}</h4>
                            {post.caption && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{post.caption}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="border-t border-slate-200 pt-2 space-y-2">
                          {post.post_url && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-600 font-medium">Link</span>
                              <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                View Post
                              </a>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 font-medium">Post Date</span>
                            <div className="text-xs text-slate-800">
                              {post.post_date ? new Date(post.post_date).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }) : 'No date set'}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 font-medium">Rate</span>
                            <div className="text-xs font-semibold text-green-700">
                              <RatesCell
                                platform={post.platform}
                                contentType={post.content_type}
                                rates={post.kol_profile?.rates || []}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      </TableCell>
                      <TableCell className="w-48 px-3">
                        <PaymentMilestoneCell
                          milestones={getMilestonesForPost(post.id)}
                          isCompact={true}
                        />
                      </TableCell>
                      <TableCell className="w-40 px-3">
                        <RemainingPaymentCell
                          milestones={getMilestonesForPost(post.id)}
                        />
                      </TableCell>
                      <TableCell className="w-48 px-3">
                       <div className="space-y-1.5 min-w-[120px]">
                         <div className="flex items-center justify-between text-xs">
                           <div className="flex items-center gap-1.5">
                             <span>👀</span>
                             <span className="text-slate-600">Views</span>
                           </div>
                           <span className="font-medium text-slate-900">{formatNumber(post.performance?.views || 0)}</span>
                         </div>
                         <div className="flex items-center justify-between text-xs">
                           <div className="flex items-center gap-1.5">
                             <span>❤️</span>
                             <span className="text-slate-600">Likes</span>
                           </div>
                           <span className="font-medium text-slate-900">{formatNumber(post.performance?.likes || 0)}</span>
                         </div>
                         <div className="flex items-center justify-between text-xs">
                           <div className="flex items-center gap-1.5">
                             <span>💬</span>
                             <span className="text-slate-600">Comments</span>
                           </div>
                           <span className="font-medium text-slate-900">{formatNumber(post.performance?.comments || 0)}</span>
                         </div>
                         <div className="flex items-center justify-between text-xs">
                           <div className="flex items-center gap-1.5">
                             <span>🔄</span>
                             <span className="text-slate-600">Shares</span>
                           </div>
                           <span className="font-medium text-slate-900">{formatNumber(post.performance?.shares || 0)}</span>
                         </div>
                         <div className="flex items-center justify-between text-xs">
                           <div className="flex items-center gap-1.5">
                             <Bookmark className="h-3 w-3" />
                             <span className="text-slate-600">Saves</span>
                           </div>
                           <span className="font-medium text-slate-900">{formatNumber(post.performance?.saves || 0)}</span>
                         </div>
                       </div>
                      </TableCell>
                      <TableCell className="w-80 px-3">
                      {performanceData && performanceData.hasTargets ? (
                        <div className="space-y-3">
                          {/* Reach Progress */}
                          {performanceData.targetReach && (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-600 font-medium">📈 Reach</span>
                                <span className="font-medium text-slate-800">
                                  {performanceData.reachProgress.toFixed(0)}%
                                </span>
                              </div>
                              <Progress 
                                value={performanceData.reachProgress} 
                                className="h-1.5"
                              />
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">
                                  Target: {performanceData.targetReach.toLocaleString()}
                                </span>
                                <span className="text-slate-500">
                                  Actual: {performanceData.actualReach.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Engagement Progress */}
                          {performanceData.targetEngagement && (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-600 font-medium">💬 Engagement</span>
                                <span className="font-medium text-slate-800">
                                  {performanceData.engagementProgress.toFixed(0)}%
                                </span>
                              </div>
                              <Progress 
                                value={performanceData.engagementProgress} 
                                className="h-1.5"
                              />
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">
                                  Target: {performanceData.targetEngagement}%
                                </span>
                                <span className="text-slate-500">
                                  Actual: {performanceData.actualEngagement.toFixed(2)}%
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Conversions Progress */}
                          {performanceData.targetConversions && (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-600 font-medium">🎯 Conversions</span>
                                <span className="font-medium text-slate-800">
                                  {performanceData.conversionProgress.toFixed(0)}%
                                </span>
                              </div>
                              <Progress 
                                value={performanceData.conversionProgress} 
                                className="h-1.5"
                              />
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">
                                  Target: {performanceData.targetConversions.toLocaleString()}
                                </span>
                                <span className="text-slate-500">
                                  Actual: {performanceData.actualConversions.toLocaleString()}
                                </span>
                              </div>
                              {getPostConversions(post.id).totalValue > 0 && (
                                <div className="text-xs text-green-600 font-medium mt-1">
                                  Value: ${getPostConversions(post.id).totalValue.toFixed(0)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-20 text-slate-400">
                          <div className="text-center">
                            <div className="text-xs font-medium">No performance targets set</div>
                            <div className="text-xs mt-1">Configure in payment agreement</div>
                          </div>
                        </div>
                      )}
                      </TableCell>
                      <TableCell className="w-20 px-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-lg z-50">
                          <DropdownMenuItem onClick={() => handleView(post)} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(post)} className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdatePerformance(post)} className="cursor-pointer">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Update Performance
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRecordConversion(post)} className="cursor-pointer">
                            <Target className="h-4 w-4 mr-2" />
                            Record Conversion
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdatePayment(post)} className="cursor-pointer">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Update Payment
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(post.id)} 
                            className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </table>
        </div>
        {/* Table Footer */}
        <KOLContentPostTableFooter 
          totalPosts={safeContentPosts.length} 
          postedPosts={postedPosts} 
          filteredPosts={safeContentPosts.length} 
          selectedStatus={selectedStatus} 
        />
      </div>

      {/* Edit Modal */}
      <EditContentPostModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        contentPost={selectedPost}
      />

      {/* Performance Update Modal */}
      <UpdatePerformanceModal
        open={performanceModalOpen}
        onOpenChange={setPerformanceModalOpen}
        contentPost={selectedPost}
      />

      {/* Conversion Tracking Modal */}
      <ConversionTrackingModal
        open={conversionModalOpen}
        onOpenChange={setConversionModalOpen}
        contentPost={selectedPost}
      />

      {/* Update Payment Modal */}
      <UpdatePaymentModal
        open={updatePaymentModalOpen}
        onOpenChange={setUpdatePaymentModalOpen}
        contentPost={selectedPost}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the content post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Content Post Details</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">KOL</label>
                  <p className="text-sm text-slate-600">{selectedPost.kol_profile?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Campaign</label>
                  <p className="text-sm text-slate-600">{selectedPost.campaign?.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Platform</label>
                  <p className="text-sm text-slate-600 capitalize">{selectedPost.platform}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Content Type</label>
                  <p className="text-sm text-slate-600">{selectedPost.content_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-slate-600 capitalize">{selectedPost.status}</p>
                </div>
              </div>
              {selectedPost.caption && (
                <div>
                  <label className="text-sm font-medium">Caption</label>
                  <p className="text-sm text-slate-600">{selectedPost.caption}</p>
                </div>
              )}
              {selectedPost.post_url && (
                <div>
                  <label className="text-sm font-medium">Post URL</label>
                  <a href={selectedPost.post_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    {selectedPost.post_url}
                  </a>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Hashtags</label>
                  <p className="text-sm text-slate-600">{selectedPost.hashtags?.join(', ') || 'None'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Mentions</label>
                  <p className="text-sm text-slate-600">{selectedPost.mentions?.join(', ') || 'None'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

KOLContentPostTable.displayName = 'KOLContentPostTable';

export default KOLContentPostTable;
