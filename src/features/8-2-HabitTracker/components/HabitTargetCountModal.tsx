import React, { useState, useEffect, useMemo } from 'react';
import { useHabitTracker } from '../context/HabitTrackerContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Checkbox } from '@/features/ui/checkbox';
import { Label } from '@/features/ui/label';
import { useToast } from '@/features/ui/use-toast';
import { format } from 'date-fns';

interface HabitTargetCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitId: string;
  date: Date;
}

export const HabitTargetCountModal = ({ isOpen, onClose, habitId, date }: HabitTargetCountModalProps) => {
  const { habits, entries, addEntry, deleteEntry, refreshData } = useHabitTracker();
  const { toast } = useToast();
  const [checkedItems, setCheckedItems] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);

  const habit = habits.find((h) => h.id === habitId);
  const dateStr = format(date, 'yyyy-MM-dd');
  const targetCount = habit?.target_count || 1;
  
  // Get existing entries for this habit and date
  const existingEntries = useMemo(() => {
    return entries.filter(
      (e) => e.habit_id === habitId && e.entry_date === dateStr
    );
  }, [entries, habitId, dateStr]);

  // Initialize checked items based on existing entries
  useEffect(() => {
    if (isOpen && habit && targetCount > 0) {
      const initialChecked = new Array(targetCount).fill(false);
      // Mark as checked based on existing entries (up to target_count)
      const entriesCount = Math.min(existingEntries.length, targetCount);
      for (let i = 0; i < entriesCount; i++) {
        initialChecked[i] = true;
      }
      setCheckedItems(initialChecked);
    } else if (!isOpen) {
      // Reset when modal closes
      setCheckedItems([]);
    }
  }, [isOpen, habit?.id, targetCount, existingEntries.length]);

  const handleCheckboxChange = React.useCallback((index: number, checked: boolean) => {
    if (loading) return;
    
    // Ensure checkedItems array has the correct length
    setCheckedItems((prev) => {
      const currentLength = prev.length;
      let newCheckedItems: boolean[];
      
      if (currentLength !== targetCount) {
        // If array length doesn't match, create new array with correct length
        newCheckedItems = new Array(targetCount).fill(false);
        // Copy existing values
        prev.forEach((value, idx) => {
          if (idx < targetCount) {
            newCheckedItems[idx] = value;
          }
        });
      } else {
        newCheckedItems = [...prev];
      }
      
      // Update the specific checkbox
      newCheckedItems[index] = checked;
      return newCheckedItems;
    });
  }, [loading, targetCount]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Get current entries
      const currentEntries = entries.filter(
        (e) => e.habit_id === habitId && e.entry_date === dateStr
      );

      const checkedCount = checkedItems.filter(Boolean).length;
      const currentCount = currentEntries.length;

      // Only update if there are changes
      if (checkedCount === currentCount) {
        // No changes needed
        onClose();
        return;
      }

      // Delete all existing entries first (clean slate approach)
      // This ensures we always have the correct number of entries matching checked checkboxes
      // Process deletions sequentially to avoid race conditions with optimistic updates
      for (const entry of currentEntries) {
        await deleteEntry(entry.id);
      }

      // Add new entries for each checked checkbox sequentially
      // Each checkbox represents one completion (e.g., one prayer time: Subuh, Zuhur, Ashar, Maghrib, Isya)
      for (let i = 0; i < checkedCount; i++) {
        await addEntry(habitId, dateStr, 1);
      }

      // Refresh data to ensure UI is fully in sync with database
      await refreshData();

      const completionText = checkedCount === targetCount 
        ? `All ${targetCount} completions logged`
        : `${checkedCount} of ${targetCount} completions logged`;

      toast({
        title: 'Success',
        description: `${completionText} for ${format(date, 'MMM d')}`,
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save entries. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!habit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Habit Entries</DialogTitle>
          <DialogDescription>
            Select which completions you've done for "{habit.name}" on {format(date, 'MMM d, yyyy')}
            <br />
            <span className="text-xs text-gray-500 mt-1 block">
              Target: {targetCount} per day
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {targetCount > 0 && Array.from({ length: targetCount }, (_, index) => {
              const isChecked = checkedItems.length > index ? checkedItems[index] : false;
              return (
                <div 
                  key={`${habitId}-${dateStr}-${index}`}
                  className="flex items-center space-x-3"
                >
                  <Checkbox
                    id={`checkbox-${habitId}-${dateStr}-${index}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      if (typeof checked === 'boolean') {
                        handleCheckboxChange(index, checked);
                      }
                    }}
                    disabled={loading}
                    className="h-5 w-5"
                  />
                  <Label
                    htmlFor={`checkbox-${habitId}-${dateStr}-${index}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {(() => {
                      // Get checklist name from habit.checklist_names array
                      const checklistNames = habit?.checklist_names;
                      const hasChecklistNames = checklistNames && Array.isArray(checklistNames) && checklistNames.length > 0;
                      const checklistName = hasChecklistNames && checklistNames[index] && String(checklistNames[index]).trim() !== ''
                        ? String(checklistNames[index]).trim()
                        : null;
                      
                      // Use custom name if available, otherwise use default format
                      return checklistName || `${index + 1} of ${targetCount}`;
                    })()}
                  </Label>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">
              Selected: {checkedItems.filter(Boolean).length} of {targetCount}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
