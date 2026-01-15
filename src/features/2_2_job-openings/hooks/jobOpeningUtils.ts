
import { supabase } from '@/integrations/supabase/client';
import { getCurrentOrganizationId } from '@/features/1-login/hooks/useCurrentOrg';
import { JobOpening, JobOpeningFormData, JobBenefit } from './jobOpeningTypes';

// Helper function to safely convert Json to JobBenefit[]
const parseJobBenefits = (benefits: any): JobBenefit[] => {
  if (!benefits) return [];
  if (Array.isArray(benefits)) return benefits;
  if (typeof benefits === 'string') {
    try {
      const parsed = JSON.parse(benefits);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const createJobOpening = async (data: JobOpeningFormData): Promise<JobOpening> => {
  const { organizationId } = await getCurrentOrganizationId();
  
  // Convert benefits array to Json for Supabase
  const insertData = {
    ...data,
    organization_id: organizationId,
    created_by: (await supabase.auth.getUser()).data.user?.id,
    benefits: data.benefits ? JSON.stringify(data.benefits) : JSON.stringify([])
  };

  const { data: jobOpening, error } = await supabase
    .from('job_openings')
    .insert(insertData)
    .select(`
      *,
      departments(name),
      job_positions(name),
      job_levels(name),
      employee_statuses(name)
    `)
    .single();

  if (error) throw error;
  
  return {
    ...jobOpening,
    status: jobOpening.status as 'active' | 'inactive' | 'draft' | 'closed',
    benefits: parseJobBenefits(jobOpening.benefits)
  };
};

export const updateJobOpening = async (id: string, data: Partial<JobOpeningFormData>): Promise<JobOpening> => {
  // Convert benefits array to Json for Supabase
  const updateData = {
    ...data,
    benefits: data.benefits ? JSON.stringify(data.benefits) : undefined
  };

  const { data: jobOpening, error } = await supabase
    .from('job_openings')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      departments(name),
      job_positions(name),
      job_levels(name),
      employee_statuses(name)
    `)
    .single();

  if (error) throw error;
  
  return {
    ...jobOpening,
    status: jobOpening.status as 'active' | 'inactive' | 'draft' | 'closed',
    benefits: parseJobBenefits(jobOpening.benefits)
  };
};

export const deleteJobOpening = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('job_openings')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const fetchJobOpenings = async (): Promise<JobOpening[]> => {
  const { organizationId } = await getCurrentOrganizationId();
  
  const { data: jobOpenings, error } = await supabase
    .from('job_openings')
    .select(`
      *,
      departments(name),
      job_positions(name),
      job_levels(name),
      employee_statuses(name),
      creator_profile:profiles!job_openings_created_by_fkey(full_name, email)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return (jobOpenings || []).map(job => ({
    ...job,
    status: job.status as 'active' | 'inactive' | 'draft' | 'closed',
    benefits: parseJobBenefits(job.benefits),
    creator_profile: job.creator_profile && 
                    typeof job.creator_profile === 'object' && 
                    !Array.isArray(job.creator_profile) &&
                    'full_name' in job.creator_profile 
      ? job.creator_profile as { full_name: string; email: string }
      : null
  }));
};

export const incrementJobClicks = async (jobId: string): Promise<void> => {
  const { error } = await supabase.rpc('increment_job_clicks', { job_id: jobId });
  if (error) throw error;
};

export const incrementJobSubmissions = async (jobId: string): Promise<void> => {
  const { error } = await supabase.rpc('increment_job_submissions', { job_id: jobId });
  if (error) throw error;
};

export const buildJobOpeningQueryKey = (id?: string) => {
  return id ? ['job_openings', id] : ['job_openings'];
};
