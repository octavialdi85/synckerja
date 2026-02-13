import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/avatar';
import { Calendar, Clock, MapPin, User, Search, Filter, Star, MoreHorizontal, Eye, UserPlus, Trash2, MessageSquare, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';
import { InterviewWhatsAppButton } from './InterviewWhatsAppButton';
import { ScrollArea } from '@/features/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { CandidateToEmployeeConfirmModal } from './CandidateToEmployeeConfirmModal';

interface InterviewCandidate {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  birth_date?: string;
  gender?: string;
  nik?: string;
  status: string;
  created_at: string;
  interview_date?: string;
  interview_time?: string;
  interview_location?: string;
  interviewer_name?: string;
  interviewer_email?: string;
  interview_status: string;
  interview_notes?: string;
  job_openings?: {
    job_title: string;
  };
  candidate_profile_id?: string;
  recruitment_token: string;
  candidate_profiles?: {
    profile_completed: boolean;
    recruitment_token: string;
    full_name: string;
    photo_url?: string;
  };
  average_score?: number;
  total_reviews?: number;
}

interface CandidateActionsDropdownProps {
  candidate: InterviewCandidate;
  onViewProfile: () => void;
  onAddAsEmployee: () => void;
  onDelete: () => void;
  onWhatsApp: () => void;
  hasReviews: boolean;
}

const CandidateActionsDropdown = ({
  candidate,
  onViewProfile,
  onAddAsEmployee,
  onDelete,
  onWhatsApp,
  hasReviews
}: CandidateActionsDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white border shadow-lg">
        <DropdownMenuItem onClick={onViewProfile} className="cursor-pointer">
          <Eye className="mr-2 h-4 w-4" />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onAddAsEmployee} 
          className={`cursor-pointer ${!hasReviews ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!hasReviews}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add As Employee
          {!hasReviews && <AlertTriangle className="ml-2 h-3 w-3 text-amber-500" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onWhatsApp} className="cursor-pointer">
          <MessageSquare className="mr-2 h-4 w-4" />
          WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const IntervieweeTab = () => {
  const [candidates, setCandidates] = useState<InterviewCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedCandidate, setSelectedCandidate] = useState<InterviewCandidate | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInterviewees();
  }, []);

  const fetchInterviewees = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching interviewees...');
      
      // First, get completed candidate profiles
      const { data: candidateProfiles, error: profileError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('profile_completed', true)
        .not('recruitment_token', 'is', null);

      if (profileError) {
        console.error('❌ Error fetching candidate profiles:', profileError);
        throw profileError;
      }

      console.log('✅ Found completed candidate profiles:', candidateProfiles);

      if (!candidateProfiles || candidateProfiles.length === 0) {
        console.log('No completed candidate profiles found');
        setCandidates([]);
        setLoading(false);
        return;
      }

      // Get recruitment tokens
      const recruitmentTokens = candidateProfiles.map(profile => (profile as any).recruitment_token).filter(Boolean);
      
      // Now get job applications for these candidates
      const { data: jobApplications, error: applicationError } = await supabase
        .from('job_applications')
        .select(`
          *,
          job_openings (
            job_title
          )
        `)
        .in('recruitment_token', recruitmentTokens)
        .order('created_at', { ascending: false });

      if (applicationError) {
        console.error('❌ Error fetching job applications:', applicationError);
        throw applicationError;
      }

      console.log('✅ Found job applications:', jobApplications);

      // Get candidate profile IDs for reviews
      const candidateProfileIds = candidateProfiles.map(p => (p as any).id);
      
      // Fetch reviews for all candidates
      const { data: reviews, error: reviewsError } = await supabase
        .from('candidate_reviews')
        .select('candidate_profile_id, rating')
        .in('candidate_profile_id', candidateProfileIds);

      if (reviewsError) {
        console.error('❌ Error fetching reviews:', reviewsError);
      }

      console.log('✅ Found reviews:', reviews);

      // Calculate average scores for each candidate
      const candidateScores = candidateProfileIds.reduce((acc, profileId) => {
        const candidateReviews = reviews?.filter(r => (r as any).candidate_profile_id === profileId) || [];
        if (candidateReviews.length > 0) {
          const avgScore = candidateReviews.reduce((sum, review) => sum + ((review as any).rating || 0), 0) / candidateReviews.length;
          acc[profileId] = {
            average_score: Math.round(avgScore * 10) / 10, // Round to 1 decimal place
            total_reviews: candidateReviews.length
          };
        }
        return acc;
      }, {} as Record<string, { average_score: number; total_reviews: number }>);

      // Merge candidate profile data with job application data and scores
      const mergedData = jobApplications?.map((application: any) => {
        const profile = candidateProfiles.find(p => (p as any).recruitment_token === (application as any).recruitment_token);
        const scoreData = profile ? candidateScores[(profile as any).id] : null;
        return {
          ...(application as object),
          candidate_profile_id: (profile as any)?.id ?? (application as any).candidate_profile_id,
          // Use profile data as primary source
          applicant_name: (profile as any)?.full_name || (application as any).applicant_name,
          applicant_email: (profile as any)?.email || (application as any).applicant_email,
          applicant_phone: (profile as any)?.mobile_phone || (application as any).applicant_phone,
          birth_date: (profile as any)?.birth_date || (application as any).birth_date,
          gender: (profile as any)?.gender || (application as any).gender,
          nik: (profile as any)?.nik || (application as any).nik,
          candidate_profiles: {
            profile_completed: (profile as any)?.profile_completed || false,
            recruitment_token: (profile as any)?.recruitment_token || '',
            full_name: (profile as any)?.full_name || '',
            photo_url: (profile as any)?.photo_url || null
          },
          average_score: scoreData?.average_score || 0,
          total_reviews: scoreData?.total_reviews || 0
        };
      }) || [];
      
      setCandidates(mergedData as unknown as InterviewCandidate[]);
      console.log('✅ Processed candidate data with scores:', mergedData);
    } catch (error) {
      console.error('💥 Error in fetchInterviewees:', error);
      toast({
        title: "Error fetching interviewees",
        description: "Could not load interview candidates. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateInterviewStatus = async (candidateId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ 
          interview_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', candidateId);

      if (error) throw error;

      setCandidates(prev => prev.map(candidate => 
        candidate.id === candidateId 
          ? { ...candidate, interview_status: newStatus }
          : candidate
      ));

      toast({
        title: "Status Updated",
        description: `Interview status changed to ${newStatus}`
      });
    } catch (error) {
      console.error('Error updating interview status:', error);
      toast({
        title: "Update Error",
        description: "Could not update interview status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewProfile = (candidate: InterviewCandidate) => {
    if (candidate.candidate_profile_id) {
      navigate(`/recruitment/candidates/${candidate.candidate_profile_id}`);
      return;
    }
    toast({
      title: "Profile not available",
      description: "This candidate does not have a profile yet. Profile will be available after the candidate completes their profile.",
      variant: "destructive"
    });
  };

  const handleAddAsEmployee = (candidate: InterviewCandidate) => {
    // Check if candidate has reviews
    if (!candidate.total_reviews || candidate.total_reviews === 0) {
      toast({
        title: "Reviews Required",
        description: "Kandidat harus memiliki review terlebih dahulu sebelum dapat dijadikan karyawan. Silakan tambahkan review di tab Reviews pada profil kandidat.",
        variant: "destructive"
      });
      return;
    }

    setSelectedCandidate(candidate);
    setShowConfirmModal(true);
  };

  const handleConfirmAddAsEmployee = async () => {
    if (!selectedCandidate?.candidate_profile_id) return;
    
    setIsProcessing(true);
    console.log('[FRONTEND] Starting candidate to employee migration for:', selectedCandidate.candidate_profile_id);

    // Show initial processing toast
    toast({
      title: 'Processing Migration',
      description: 'Starting candidate migration to employee...'
    });
    
    try {
      console.log('[FRONTEND] Calling migrate-candidate-to-employee function...');
      const { data, error } = await supabase.functions.invoke('migrate-candidate-to-employee', {
        body: { candidateProfileId: selectedCandidate.candidate_profile_id }
      });

      console.log('[FRONTEND] Migration response:', { data, error });

      if (error) {
        console.error('[FRONTEND] Migration error:', error);
        throw new Error(error.message || 'Migration failed');
      }

      if (data?.success) {
        console.log('[FRONTEND] Migration successful:', data);
        
        toast({
          title: 'Migration Successful! ✅',
          description: `${selectedCandidate.applicant_name} has been successfully converted to an employee.`
        });

        // Reload page after short delay to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        console.error('[FRONTEND] Migration failed:', data);
        throw new Error(data?.error || 'Migration failed for unknown reason');
      }
    } catch (error: any) {
      console.error('[FRONTEND] Error migrating candidate:', error);
      toast({
        title: 'Migration Failed ❌',
        description: error.message || 'Failed to migrate candidate to employee',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      setShowConfirmModal(false);
      setSelectedCandidate(null);
    }
  };

  const handleDelete = (candidate: InterviewCandidate) => {
    toast({
      title: "Feature Coming Soon",
      description: "Delete functionality will be available soon."
    });
  };

  const handleWhatsApp = (candidate: InterviewCandidate) => {
    const positionTitle = candidate.job_openings?.job_title || 'the position';
    const message = `*INTERVIEW INVITATION*
━━━━━━━━━━━━━━━━━━━━━━━━━

Dear *${candidate.applicant_name}*,

Thank you for your interest in the *${positionTitle}* position with our organization.

We have reviewed your application and would like to invite you for an interview to discuss your qualifications further.

**Next Steps:**
• Please confirm your availability for the interview
• We will schedule a convenient time for both parties
• Additional details will be provided upon confirmation

Best regards,
*HR Recruitment Team*

━━━━━━━━━━━━━━━━━━━━━━━━━
*Please reply to confirm your availability*`;

    const phoneNumber = candidate.applicant_phone?.replace(/[^\d]/g, '');
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    updateInterviewStatus(candidate.id, 'contacted');
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = 
      candidate.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.job_openings?.job_title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || candidate.interview_status === statusFilter;
    
    const matchesScore = scoreFilter === 'all' || 
      (scoreFilter === 'high' && candidate.average_score >= 4) ||
      (scoreFilter === 'medium' && candidate.average_score >= 2.5 && candidate.average_score < 4) ||
      (scoreFilter === 'low' && candidate.average_score < 2.5) ||
      (scoreFilter === 'no_reviews' && candidate.total_reviews === 0);

    const matchesDate = dateFilter === 'all' ||
      (dateFilter === 'recent' && new Date(candidate.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === 'older' && new Date(candidate.created_at) <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesStatus && matchesScore && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'not_scheduled': { label: 'Not Scheduled', variant: 'secondary' as const },
      'scheduled': { label: 'Scheduled', variant: 'default' as const },
      'completed': { label: 'Completed', variant: 'default' as const },
      'cancelled': { label: 'Cancelled', variant: 'destructive' as const },
      'rescheduled': { label: 'Rescheduled', variant: 'secondary' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderScoreStars = (score: number) => {
    const stars = [];
    const fullStars = Math.floor(score);
    const hasHalfStar = score % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="h-3 w-3 fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="h-3 w-3 text-gray-300" />);
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border rounded-md p-2">
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full h-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not_scheduled">Not Scheduled</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm">
              <Star className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="high">High (4-5★)</SelectItem>
              <SelectItem value="medium">Medium (2.5-4★)</SelectItem>
              <SelectItem value="low">Low (&lt;2.5★)</SelectItem>
              <SelectItem value="no_reviews">No Reviews</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="recent">Recent (7 days)</SelectItem>
              <SelectItem value="older">Older</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500">
            <p className="text-lg font-medium">Tidak ada kandidat interview</p>
            <p className="text-sm mt-1">
              {candidates.length === 0 
                ? "Belum ada kandidat yang sudah melengkapi profile dan siap untuk interview." 
                : "Tidak ada kandidat yang cocok dengan filter pencarian."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold min-w-[280px] px-6 py-4">Candidate</TableHead>
                  <TableHead className="font-semibold min-w-[180px] px-6 py-4">Position</TableHead>
                  <TableHead className="font-semibold min-w-[120px] px-6 py-4">Score</TableHead>
                  <TableHead className="font-semibold min-w-[140px] px-6 py-4">Status</TableHead>
                  <TableHead className="font-semibold min-w-[220px] px-6 py-4">Interview Details</TableHead>
                  <TableHead className="font-semibold min-w-[100px] px-6 py-4 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.map(candidate => (
                  <TableRow key={candidate.id} className="hover:bg-gray-50 border-b border-gray-100">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage 
                            src={candidate.candidate_profiles?.photo_url || ''} 
                            alt={candidate.applicant_name} 
                          />
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                            {candidate.applicant_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{candidate.applicant_name}</p>
                          <p className="text-sm text-gray-600 truncate">{candidate.applicant_email}</p>
                          <p className="text-sm text-gray-600">{candidate.applicant_phone}</p>
                          <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <span>✅ Profile Completed</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-6 py-4">
                      <span className="font-medium text-gray-900">
                        {candidate.job_openings?.job_title || 'Position'}
                      </span>
                    </TableCell>

                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col items-start space-y-1">
                        {candidate.total_reviews > 0 ? (
                          <>
                            <div className="flex items-center space-x-1">
                              {renderScoreStars(candidate.average_score || 0)}
                            </div>
                            <div className="text-xs text-gray-600">
                              {candidate.average_score?.toFixed(1)} / 5.0
                            </div>
                            <div className="text-xs text-gray-500">
                              ({candidate.total_reviews} review{candidate.total_reviews !== 1 ? 's' : ''})
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-400 text-center">
                            No reviews yet
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-6 py-4">
                      <div className="space-y-2">
                        {getStatusBadge(candidate.interview_status)}
                        <Badge variant="outline" className="text-xs block w-fit">
                          {candidate.status}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        {candidate.interview_date && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span>{new Date(candidate.interview_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {candidate.interview_time && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span>{candidate.interview_time}</span>
                          </div>
                        )}
                        {candidate.interview_location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-32">{candidate.interview_location}</span>
                          </div>
                        )}
                        {candidate.interviewer_name && (
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span>{candidate.interviewer_name}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-6 py-4 text-center">
                      <CandidateActionsDropdown
                        candidate={candidate}
                        onViewProfile={() => handleViewProfile(candidate)}
                        onAddAsEmployee={() => handleAddAsEmployee(candidate)}
                        onDelete={() => handleDelete(candidate)}
                        onWhatsApp={() => handleWhatsApp(candidate)}
                        hasReviews={(candidate.total_reviews || 0) > 0}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedCandidate && (
        <CandidateToEmployeeConfirmModal
          open={showConfirmModal}
          onOpenChange={setShowConfirmModal}
          candidateName={selectedCandidate.applicant_name}
          candidateScore={selectedCandidate.average_score || 0}
          scoreCount={selectedCandidate.total_reviews || 0}
          onConfirm={handleConfirmAddAsEmployee}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};
