
import { supabase } from '@/integrations/supabase/client';
import { getCurrentOrganizationId } from '@/features/1-login/hooks/useCurrentOrg';
import { RecruitmentLink, CreateRecruitmentLinkData } from './recruitmentLinkTypes';
import { JobBenefit } from './jobOpeningTypes';
import { incrementJobClicks } from './jobOpeningUtils';
import { APP_CONSTANTS } from '@/utils/optimizedConstants';
import { safeJSONParse } from '@/features/share/hooks/optimizedHelpers';

// Helper function to safely convert Json to JobBenefit[]
const parseJobBenefits = (benefits: any): JobBenefit[] => {
  if (!benefits) return [];
  if (Array.isArray(benefits)) return benefits;
  return safeJSONParse(benefits, []);
};

// Generate a unique token for recruitment links
export const generateRecruitmentToken = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${randomStr}`;
};

export const createRecruitmentLink = async (data: CreateRecruitmentLinkData): Promise<RecruitmentLink> => {
  const { organizationId } = await getCurrentOrganizationId();
  const user = await supabase.auth.getUser();
  
  const linkData = {
    ...data,
    organization_id: organizationId,
    created_by: user.data.user?.id,
    preview_link: `${window.location.origin}/apply/preview/${data.token}`,
  };
  
  const { data: recruitmentLink, error } = await supabase
    .from('recruitment_links')
    .insert(linkData)
    .select()
    .single();

  if (error) throw error;
  return recruitmentLink as RecruitmentLink;
};

export const getRecruitmentLinkByJobId = async (jobOpeningId: string): Promise<RecruitmentLink | null> => {
  const { organizationId } = await getCurrentOrganizationId();
  
  const { data, error } = await supabase
    .from('recruitment_links')
    .select('*')
    .eq('job_opening_id', jobOpeningId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as RecruitmentLink | null;
};

// Optimized function using the new database function
export const getJobByToken = async (token: string): Promise<RecruitmentLink | null> => {
  console.log('🔍 Fetching job data for token:', token);
  
  try {
    const { data, error } = await supabase.rpc('get_job_by_recruitment_token' as any, {
      token_param: token
    });

    if (error) {
      console.error('❌ Database function error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      console.warn('⚠️ No recruitment link found for token:', token);
      return null;
    }

    console.log('✅ Job data fetched successfully');
    
    // Parse benefits from the job_openings data
    if (data.job_openings?.benefits) {
      data.job_openings.benefits = parseJobBenefits(data.job_openings.benefits);
    }
    
    return data as RecruitmentLink;

  } catch (error) {
    console.error('💥 Error in getJobByToken:', error);
    return await getJobByTokenFallback(token);
  }
};

// Simplified fallback method - make it public access
const getJobByTokenFallback = async (token: string): Promise<RecruitmentLink | null> => {
  console.log('🔄 Using fallback query for token:', token);

  // First try to get recruitment link data without auth requirements
  const { data: linkData, error: linkError } = await supabase
    .from('recruitment_links')
    .select(`
      *,
      job_openings!inner(
        *,
        organizations(company_name, industry, address, website, description),
        departments(name),
        job_positions(name),
        job_levels(name),
        employee_statuses(name)
      )
    `)
    .eq('token', token)
    .eq('status', 'active')
    .in('job_openings.status', ['active', 'draft'])
    .maybeSingle();

  if (linkError || !linkData) {
    console.error('❌ Error fetching recruitment link:', linkError);
    return null;
  }

  // Check expiration
  if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
    console.warn('⏰ Recruitment link has expired');
    return null;
  }

  const jobData = linkData.job_openings;
  if (!jobData) {
    console.warn('No active job found');
    return null;
  }

  // Increment clicks asynchronously - ignore errors for public access
  void Promise.all([
    incrementJobClicks(jobData.id).catch(() => console.log('Click increment failed - continuing')),
    incrementRecruitmentLinkClicks(linkData.id).catch(() => console.log('Link click increment failed - continuing'))
  ]).catch(() => {
    // Ignore errors in click tracking for public access
    console.log('Click tracking failed - continuing with job data');
  });

  // Return the data with proper structure
  return {
    ...linkData,
    status: linkData.status as 'active' | 'inactive',
    job_openings: {
      ...jobData,
      benefits: parseJobBenefits(jobData.benefits),
      organizations: jobData.organizations || {
        company_name: 'Company Name',
        industry: 'Technology',
        address: '',
        website: '',
        description: ''
      },
      departments: jobData.departments || { name: 'General' },
      job_positions: jobData.job_positions || { name: 'Position' },
      job_levels: jobData.job_levels || { name: 'Level' },
      employee_statuses: jobData.employee_statuses || { name: 'Full-time' }
    }
  };
};

export const incrementRecruitmentLinkClicks = async (linkId: string): Promise<void> => {
  const { error } = await supabase.rpc('increment_recruitment_link_clicks', { link_id: linkId });
  if (error) {
    console.error('Error incrementing recruitment link clicks:', error);
    throw error;
  }
};

export const incrementRecruitmentLinkSubmissions = async (linkId: string): Promise<void> => {
  const { error } = await supabase.rpc('increment_recruitment_link_submissions', { link_id: linkId });
  if (error) {
    console.error('Error incrementing recruitment link submissions:', error);
    throw error;
  }
};

export const getRecruitmentLinkAnalytics = async (): Promise<any> => {
  const { organizationId } = await getCurrentOrganizationId();
  
  const { data, error } = await supabase
    .from('recruitment_links')
    .select(`
      id,
      clicks,
      submissions,
      job_openings!inner(job_title)
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  if (error) throw error;

  const totalClicks = data?.reduce((sum, link) => sum + (link.clicks || 0), 0) || 0;
  const totalSubmissions = data?.reduce((sum, link) => sum + (link.submissions || 0), 0) || 0;

  return {
    total_clicks: totalClicks,
    total_submissions: totalSubmissions,
    conversion_rate: totalClicks ? (totalSubmissions / totalClicks * 100) : 0,
    top_performing_links: data?.map(link => ({
      id: link.id,
      job_title: link.job_openings?.job_title || 'Unknown',
      clicks: link.clicks || 0,
      submissions: link.submissions || 0,
      conversion_rate: link.clicks ? ((link.submissions || 0) / link.clicks * 100) : 0
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5) || []
  };
};

export const checkRecruitmentHealth = async (): Promise<any> => {
  try {
    // Public health check - don't require authentication
    const [linksResult, jobsResult] = await Promise.allSettled([
      supabase
        .from('recruitment_links')
        .select('id')
        .eq('status', 'active'),
      supabase
        .from('job_openings')
        .select('id')
        .eq('status', 'active')
    ]);

    const activeLinks = linksResult.status === 'fulfilled' ? linksResult.value.data?.length || 0 : 0;
    const activeJobs = jobsResult.status === 'fulfilled' ? jobsResult.value.data?.length || 0 : 0;

    return {
      status: 'healthy',
      active_recruitment_links: activeLinks,
      active_job_openings: activeJobs
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const buildRecruitmentLinkQueryKey = (jobOpeningId?: string) => {
  return jobOpeningId ? ['recruitment_links', jobOpeningId] : ['recruitment_links'];
};
