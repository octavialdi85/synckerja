import React, { useState } from 'react';
import { useHabitTracker } from '../context/HabitTrackerContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Label } from '@/features/ui/label';
import { useToast } from '@/features/ui/use-toast';
import { format } from 'date-fns';

interface HabitEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitId: string;
}

export const HabitEntryModal = ({ isOpen, onClose, habitId }: HabitEntryModalProps) => {
  const { habits, addEntry, entries } = useHabitTracker();
  const { toast } = useToast();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [count, setCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const habit = habits.find((h) => h.id === habitId);
  const habitNotFound = !habit && habits.length > 0;
  const existingEntry = entries.find(
    (e) => e.habit_id === habitId && e.entry_date === date
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (count < 1) {
      toast({
        title: 'Error',
        description: 'Count must be at least 1',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (existingEntry) {
        // Update existing entry logic would go here if needed
        toast({
          title: 'Info',
          description: 'Entry already exists for this date',
        });
      } else {
        await addEntry(habitId, date, count, notes);
        toast({
          title: 'Success',
          description: 'Entry logged successfully',
        });
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to log entry',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Entry</DialogTitle>
          <DialogDescription>
            {habitNotFound ? 'Habit tidak ditemukan.' : `Log your progress for ${habit?.name ?? ''}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="count">Count</Label>
              <Input
                id="count"
                type="number"
                min="1"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Target: {habit?.target_count || 1} per {habit?.frequency || 'day'}
              </p>
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this entry..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || habitNotFound}>
              {loading ? 'Saving...' : 'Log Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
