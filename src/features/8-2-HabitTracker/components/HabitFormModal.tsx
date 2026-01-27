import React, { useEffect, useState } from 'react';
import { useHabitTracker } from '../context/HabitTrackerContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Label } from '@/features/ui/label';
import { useToast } from '@/features/ui/use-toast';

interface HabitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitId?: string | null;
}

export const HabitFormModal = ({ isOpen, onClose, habitId }: HabitFormModalProps) => {
  const { habits, addHabit, updateHabit } = useHabitTracker();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [targetCount, setTargetCount] = useState(1);
  const [color, setColor] = useState('#3b82f6');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const habit = habitId ? habits.find((h) => h.id === habitId) : null;

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setDescription(habit.description || '');
      setFrequency(habit.frequency);
      setTargetCount(habit.target_count);
      setColor(habit.color || '#3b82f6');
      setIsActive(habit.is_active);
    } else {
      setName('');
      setDescription('');
      setFrequency('daily');
      setTargetCount(1);
      setColor('#3b82f6');
      setIsActive(true);
    }
  }, [habit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a habit name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (habitId && habit) {
        await updateHabit(habitId, {
          name,
          description,
          frequency,
          target_count: targetCount,
          color,
          is_active: isActive,
        });
        toast({
          title: 'Success',
          description: 'Habit updated successfully',
        });
      } else {
        await addHabit({
          name,
          description,
          frequency,
          target_count: targetCount,
          color,
          is_active: isActive,
        });
        toast({
          title: 'Success',
          description: 'Habit created successfully',
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save habit',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{habitId ? 'Edit Habit' : 'Create New Habit'}</DialogTitle>
          <DialogDescription>
            {habitId ? 'Update your habit details' : 'Track your habits and build better routines'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Habit Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Exercise, Read, Meditate"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="targetCount">Target Count</Label>
                <Input
                  id="targetCount"
                  type="number"
                  min="1"
                  value={targetCount}
                  onChange={(e) => setTargetCount(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      color === c ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : habitId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
