import React, { useState } from 'react';
import { useHabitTracker } from '../context/HabitTrackerContext';
import { Plus, Edit, Trash2, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { HabitFormModal } from './HabitFormModal';
import { HabitEntryModal } from './HabitEntryModal';
import { LoadingDots } from '@/components/LoadingDots';

export const HabitList = () => {
  const { filteredHabits, stats, loading, deleteHabit } = useHabitTracker();
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [entryHabit, setEntryHabit] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const getHabitStats = (habitId: string) => {
    return stats.find((s) => s.habit_id === habitId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingDots size="lg" />
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Habits</CardTitle>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Habit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto seamless-scroll">
        {filteredHabits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Circle className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium mb-1">No habits found</p>
            <p className="text-sm text-gray-500 mb-4">Start tracking your habits to build better routines</p>
            <Button onClick={() => setShowAddModal(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Habit
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHabits.map((habit) => {
              const habitStat = getHabitStats(habit.id);
              const isCompletedToday = habitStat?.last_entry_date === new Date().toISOString().split('T')[0];

              return (
                <Card key={habit.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: habit.color || '#3b82f6' }}
                          />
                          <h3 className="font-semibold text-gray-900">{habit.name}</h3>
                          {!habit.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {habit.description && (
                          <p className="text-sm text-gray-600 mb-3">{habit.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              {habitStat?.completion_rate.toFixed(0) || 0}% completion
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">
                              Streak: {habitStat?.current_streak || 0} days
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {habit.frequency}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {isCompletedToday ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEntryHabit(habit.id)}
                          >
                            Log Entry
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingHabit(habit.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteHabit(habit.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modals */}
      {showAddModal && (
        <HabitFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {editingHabit && (
        <HabitFormModal
          isOpen={!!editingHabit}
          onClose={() => setEditingHabit(null)}
          habitId={editingHabit}
        />
      )}
      {entryHabit && (
        <HabitEntryModal
          isOpen={!!entryHabit}
          onClose={() => setEntryHabit(null)}
          habitId={entryHabit}
        />
      )}
    </Card>
  );
};
