
import { supabase } from '@/integrations/supabase/client';
import { incrementJobSubmissions } from '@/features/2_2_job-openings/hooks/jobOpeningUtils';

export const updateSubmissionCounters = async (
  jobId: string,
  recruitmentLinkId?: string
) => {
  console.log('📊 Updating submission counters...');
  
  try {
    await incrementJobSubmissions(jobId);
    console.log('✅ Job submission count updated');

    if (recruitmentLinkId) {
      const { error: linkUpdateError } = await (supabase.rpc as any)('increment_recruitment_link_submissions', {
        link_id: recruitmentLinkId
      });
      
      if (linkUpdateError) {
        console.warn('⚠️ Warning: Could not update recruitment link submissions:', linkUpdateError);
      } else {
        console.log('✅ Recruitment link submission count updated');
      }
    }
  } catch (counterError) {
    console.warn('⚠️ Warning: Could not update counters:', counterError);
    // Don't fail the whole submission for counter errors
  }
};

// Export with the expected name for compatibility
export const incrementCounters = updateSubmissionCounters;
