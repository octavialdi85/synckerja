import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/features/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocker: { id: string; blocker_type?: string; description?: string; created_at: string; taskTitle?: string; stepTitle?: string; subStepTitle?: string | null } | null;
  onResolutionComplete?: () => void; // Callback after resolution is saved
}

export const BlockerResolutionModal: React.FC<Props> = ({ open, onOpenChange, blocker, onResolutionComplete }) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!blocker) return;
    if (!note.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide resolution details',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Use RPC function to insert resolution (bypasses RLS overhead)
      const { data: resolutionId, error: insertError } = await (supabase as any).rpc('save_blocker_resolution', {
        p_task_step_history_id: blocker.id,
        p_description: note.trim()
      });

      if (insertError) {
        toast({
          title: 'Error',
          description: `Failed to save resolution: ${insertError.message}`,
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      // Trigger callback if provided (to update is_resolved flag)
      if (onResolutionComplete) {
        await onResolutionComplete();
      }
      
      onOpenChange(false);
      setNote('');
      
      toast({
        title: 'Success',
        description: 'Blocker resolution saved successfully',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen md:max-w-lg md:max-h-[520px] m-0 rounded-none md:rounded-lg flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
          <DialogTitle className="text-base md:text-lg">How was this blocker resolved?</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 seamless-scroll overflow-auto space-y-3 px-4 py-4">
          {blocker && (
            <div className="p-2 border border-gray-200 bg-gray-50 rounded">
              <div className="text-xs text-gray-700">Task: <span className="font-medium">{blocker.taskTitle || '-'}</span></div>
              <div className="text-xs text-gray-700">Step: <span className="font-medium">{blocker.stepTitle || '-'}</span></div>
              {blocker.subStepTitle && <div className="text-xs text-gray-700">Sub-step: <span className="font-medium">{blocker.subStepTitle}</span></div>}
              <div className="text-sm text-gray-800 mt-1">{blocker.blocker_type || 'Blocker'}</div>
              {blocker.description && <div className="text-sm text-gray-700">{blocker.description}</div>}
              <div className="text-xs text-gray-500 mt-1">{new Date(blocker.created_at).toLocaleString()}</div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Resolution details</label>
            <textarea
              className="w-full min-h-[120px] border rounded p-2 text-sm"
              placeholder="Explain how this blocker was resolved..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse md:flex-row justify-end gap-2 px-4 py-3 border-t flex-shrink-0">
          <button className="border px-4 py-2 rounded text-sm w-full md:w-auto" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</button>
          <button className={`px-4 py-2 rounded text-sm text-white w-full md:w-auto ${saving ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`} onClick={handleSave} disabled={saving || !note.trim()}>
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


