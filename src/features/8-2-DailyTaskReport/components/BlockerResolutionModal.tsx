import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/features/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocker: { id: string; blocker_type?: string; description?: string; created_at: string; taskTitle?: string; stepTitle?: string; subStepTitle?: string | null } | null;
}

export const BlockerResolutionModal: React.FC<Props> = ({ open, onOpenChange, blocker }) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!blocker) return;
    setSaving(true);
    try {
      await supabase.from('task_step_history_blocker_resolved').insert({
        task_step_history_id: blocker.id,
        description: note,
      });
      onOpenChange(false);
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[520px] rounded-none sm:rounded-none flex flex-col">
        <DialogHeader>
          <DialogTitle>How was this blocker resolved?</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 seamless-scroll overflow-auto space-y-3">
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
            <label className="text-sm text-gray-700">Resolution details</label>
            <textarea
              className="mt-1 w-full h-32 border rounded p-2 text-sm"
              placeholder="Explain how this blocker was resolved..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <button className="border px-3 py-2 rounded text-sm" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</button>
          <button className={`ml-2 px-3 py-2 rounded text-sm text-white ${saving ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`} onClick={handleSave} disabled={saving || !note.trim()}>
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


