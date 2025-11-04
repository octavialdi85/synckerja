
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import DailyTaskSelectorDialog from './DailyTaskSelectorDialog';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { toast } from 'sonner';

interface TitleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | null;
  onSave: (title: string) => void;
  socialMediaPlanId?: string;
}

const TitleDialog: React.FC<TitleDialogProps> = ({
  isOpen,
  onClose,
  title,
  onSave,
  socialMediaPlanId
}) => {
  const [titleText, setTitleText] = useState('');
  const [isDailyTaskDialogOpen, setIsDailyTaskDialogOpen] = useState(false);
  const { organizationId } = useCurrentOrg();

  // FIXED: Reset state when dialog opens/closes or when socialMediaPlanId changes
  useEffect(() => {
    if (isOpen) {
      setTitleText(title || '');
    } else {
      // Clear all state when closing
      setTitleText('');
    }
  }, [isOpen, title, socialMediaPlanId]);

  const handleSave = () => {
    onSave(titleText.trim());
    onClose();
  };

  const handleAddAsDailyTask = async (dailyTaskId: string, taskTitle: string) => {
    if (!titleText.trim()) {
      toast.error('Please enter a content title first');
      return;
    }

    if (!organizationId) {
      toast.error('Organization not found');
      return;
    }

    if (!socialMediaPlanId) {
      toast.error('Social media plan ID not found');
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Fetch plan data to get service, content_type, and post_date
      const { data: planData, error: planError } = await supabase
        .from('social_media_plans')
        .select(`
          post_date,
          service:services(name),
          content_type:content_types(name)
        `)
        .eq('id', socialMediaPlanId)
        .single();

      if (planError || !planData) {
        console.error('Error fetching plan data:', planError);
        toast.error('Failed to fetch plan data');
        return;
      }

      // Format the title: "Content" + {service} + "-" + {content type} + "-" + ({tanggal postdate}) + {title}
      const serviceName = planData.service?.name || '';
      const contentTypeName = planData.content_type?.name || '';
      const postDate = planData.post_date 
        ? format(new Date(planData.post_date), 'yyyy-MM-dd')
        : '';
      
      // Build formatted title
      let formattedTitle = `Content ${serviceName} - ${contentTypeName}`.trim();
      if (postDate) {
        formattedTitle += ` - (${postDate})`;
      }
      formattedTitle += ` ${titleText.trim()}`;
      formattedTitle = formattedTitle.trim();

      // Get current employee (active profile)
      const { data: currentEmployee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (employeeError || !currentEmployee) {
        toast.error('Failed to get current employee');
        return;
      }

      // Get the maximum order for steps in this task
      const { data: existingSteps } = await supabase
        .from('task_steps')
        .select('order')
        .eq('task_id', dailyTaskId)
        .order('order', { ascending: false })
        .limit(1);

      const nextOrder = existingSteps && existingSteps.length > 0 
        ? (existingSteps[0].order || 0) + 1 
        : 1;

      // Insert into task_steps table with formatted title
      const { data: taskStep, error: stepError } = await supabase
        .from('task_steps')
        .insert({
          task_id: dailyTaskId,
          title: formattedTitle,
          is_completed: false,
          order: nextOrder,
          status: 'pending',
          priority: 'medium',
          created_by: user.id
        })
        .select()
        .single();

      if (stepError) {
        console.error('Error creating task step:', stepError);
        toast.error('Failed to create task step');
        return;
      }

      // Insert into task_steps_assigned table
      const { error: assignError } = await supabase
        .from('task_steps_assigned')
        .insert({
          organization_id: organizationId,
          task_step_id: taskStep.id,
          employee_id: currentEmployee.id,
          assigned_by: currentEmployee.id,
          assigned_at: new Date().toISOString()
        });

      if (assignError) {
        console.error('Error assigning task step:', assignError);
        toast.error('Failed to assign task step');
        return;
      }

      toast.success('Content title added as daily task step successfully');
      setIsDailyTaskDialogOpen(false);
    } catch (error) {
      console.error('Error adding as daily task:', error);
      toast.error('Failed to add as daily task');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto seamless-scroll">
        <DialogHeader>
          <DialogTitle>Content Title</DialogTitle>
          <DialogDescription className="sr-only">Edit content title and manage comments</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Content Title</label>
            <Textarea
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              placeholder="Enter content title here..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setIsDailyTaskDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add as Daily Task
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <DailyTaskSelectorDialog
        isOpen={isDailyTaskDialogOpen}
        onClose={() => setIsDailyTaskDialogOpen(false)}
        onSelect={handleAddAsDailyTask}
      />
    </Dialog>
  );
};

export default TitleDialog;
